const express = require('express');
const { supabase } = require('../supabaseClient');
const { makeUploader, handleUpload, uploadFile, removeFileByUrl, sendStorageError } = require('../storage');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();

// Every /api/admin route is administrator-only.
router.use(requireAdmin);

const upload = makeUploader({ manuscript: 'document', copyrightForm: 'document' });

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

// POST /api/admin/papers/:paperId/files - replace manuscript/copyright files for an existing paper
router.post(
  '/papers/:paperId/files',
  handleUpload(upload.fields([
    { name: 'manuscript', maxCount: 1 },
    { name: 'copyrightForm', maxCount: 1 },
  ])),
  async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;

      const paperId = parseInt(req.params.paperId, 10);
      if (Number.isNaN(paperId)) {
        return res.status(400).json({ success: false, error: 'Invalid paper id.' });
      }

      const manuscriptFile = req.files?.manuscript?.[0] || null;
      const copyrightFile = req.files?.copyrightForm?.[0] || null;

      if (!manuscriptFile && !copyrightFile) {
        return res.status(400).json({ success: false, error: 'At least one file (manuscript or copyright form) is required.' });
      }

      // Ensure paper exists
      const { data: paper, error: paperError } = await supabase
        .from('papers')
        .select('id, main_author_id')
        .eq('id', paperId)
        .single();

      if (paperError) {
        console.error('Error loading paper before admin file replace', paperError);
        return res.status(500).json({ success: false, error: 'Failed to load paper.' });
      }

      if (!paper) {
        return res.status(404).json({ success: false, error: 'Paper not found.' });
      }

      const pathPrefix = paper.main_author_id ? `user-${paper.main_author_id}` : `paper-${paperId}`;

      let manuscriptUrl = null;
      let copyrightUrl = null;

      if (manuscriptFile) {
        manuscriptUrl = await uploadFile(manuscriptFile, `${pathPrefix}/manuscripts`);
      }

      if (copyrightFile) {
        copyrightUrl = await uploadFile(copyrightFile, `${pathPrefix}/copyright`);
      }

      const updatePayload = {};
      if (manuscriptUrl) updatePayload.pdf_url = manuscriptUrl;
      if (copyrightUrl) updatePayload.copyright_url = copyrightUrl;

      const { error: updateError } = await supabase
        .from('papers')
        .update(updatePayload)
        .eq('id', paperId);

      if (updateError) {
        // Don't leave files in storage that no row points to.
        await Promise.all([manuscriptUrl, copyrightUrl].filter(Boolean).map(removeFileByUrl));
        if (/copyright_url/.test(updateError.message || '')) {
          console.error('papers.copyright_url column missing; run backend/papers_files_migration.sql', updateError);
          return res.status(409).json({
            success: false,
            code: 'MIGRATION_REQUIRED',
            error: 'Copyright forms can’t be saved yet: run backend/papers_files_migration.sql in the Supabase SQL editor.',
          });
        }
        console.error('Error updating paper file URLs in admin replace', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update paper files.' });
      }

      return res.json({ success: true, manuscriptUrl, copyrightUrl });
    } catch (err) {
      if (sendStorageError(res, err)) return;
      console.error('Unexpected error in POST /api/admin/papers/:paperId/files', err);
      return res.status(500).json({ success: false, error: 'Failed to update paper files.' });
    }
  }
);

// GET /api/admin/reviewers - list of reviewer users
router.get('/reviewers', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, affiliation, department, role')
      .eq('role', 'reviewer')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching reviewers', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch reviewers.' });
    }

    return res.json({ success: true, reviewers: data || [] });
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/reviewers', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviewers.' });
  }
});

// POST /api/admin/assign-reviewer
router.post('/assign-reviewer', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { paperId, reviewerId } = req.body || {};

    if (!paperId || !reviewerId) {
      return res.status(400).json({ success: false, error: 'paperId and reviewerId are required.' });
    }

    // Insert assignment
    const { error: insertError } = await supabase
      .from('review_assignments')
      .insert({
        paper_id: paperId,
        reviewer_id: reviewerId,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ success: false, error: 'This reviewer is already assigned to the paper.' });
      }
      console.error('Error assigning reviewer', insertError);
      return res.status(500).json({ success: false, error: 'Failed to assign reviewer.' });
    }

    // Ensure paper status is at least under_review
    const { error: updateError } = await supabase
      .from('papers')
      .update({ status: 'under_review' })
      .eq('id', paperId)
      .in('status', ['submitted', 'under_review']);

    if (updateError) {
      console.error('Error updating paper status to under_review', updateError);
      // Do not fail the whole request, assignment itself succeeded
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/assign-reviewer', err);
    return res.status(500).json({ success: false, error: 'Failed to assign reviewer.' });
  }
});

// POST /api/admin/accept-paper - accept a reviewed paper; publication follows payment
router.post('/accept-paper', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const paperId = parseInt(req.body?.paperId, 10);
    if (Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, status, main_author_id')
      .eq('id', paperId)
      .maybeSingle();

    if (paperError) {
      console.error('Error fetching paper before acceptance', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper before accepting it.' });
    }
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }
    if (paper.status !== 'under_review') {
      return res.status(409).json({ success: false, error: 'Only papers under review can be accepted.' });
    }

    const { count: reviewCount, error: reviewsError } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('paper_id', paperId);

    if (reviewsError) {
      console.error('Error counting reviews before acceptance', reviewsError);
      return res.status(500).json({ success: false, error: 'Failed to check the paper\'s reviews.' });
    }
    if (!reviewCount) {
      return res.status(409).json({ success: false, error: 'A paper needs at least one completed review before it can be accepted.' });
    }

    const { error } = await supabase
      .from('papers')
      .update({ status: 'accepted' })
      .eq('id', paperId);

    if (error) {
      if (error.code === '22P02') {
        return res.status(409).json({
          success: false,
          code: 'MIGRATION_REQUIRED',
          error: 'The database does not support the "accepted" status yet. Run backend/accepted_status_migration.sql in the Supabase SQL editor.',
        });
      }
      console.error('Error accepting paper', error);
      return res.status(500).json({ success: false, error: 'Failed to accept paper.' });
    }

    if (paper.main_author_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Paper accepted',
          message: `Your paper "${paper.title}" has been accepted for publication. Please pay the article processing charge from your dashboard so it can be published.`,
          type: 'success',
        });

      if (notifError) {
        console.error('Error creating acceptance notification', notifError);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/accept-paper', err);
    return res.status(500).json({ success: false, error: 'Failed to accept paper.' });
  }
});

// POST /api/admin/mark-paid - record an article processing charge received outside the site
// (e.g. through the hosted Razorpay payment page, which does not identify the paper)
router.post('/mark-paid', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const paperId = parseInt(req.body?.paperId, 10);
    if (Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, status, payment_status, main_author_id')
      .eq('id', paperId)
      .maybeSingle();

    if (paperError) {
      console.error('Error fetching paper before marking paid', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper.' });
    }
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }
    if (paper.status !== 'accepted' && paper.status !== 'published') {
      return res.status(409).json({ success: false, error: 'Only accepted or published papers can be marked as paid.' });
    }
    if (paper.payment_status === 'paid') {
      return res.status(409).json({ success: false, error: 'This paper is already marked as paid.' });
    }

    const { error } = await supabase
      .from('papers')
      .update({ payment_status: 'paid' })
      .eq('id', paperId);

    if (error) {
      console.error('Error marking paper paid', error);
      return res.status(500).json({ success: false, error: 'Failed to record the payment.' });
    }

    if (paper.main_author_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Payment received',
          message: `The article processing charge for "${paper.title}" has been received.`,
          type: 'success',
        });

      if (notifError) {
        console.error('Error creating payment notification', notifError);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/mark-paid', err);
    return res.status(500).json({ success: false, error: 'Failed to record the payment.' });
  }
});

// POST /api/admin/publish-paper - publish an accepted paper
router.post('/publish-paper', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { paperId } = req.body || {};

    if (!paperId) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    // Load paper to check it was accepted and to notify the main author after publishing
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, status, main_author_id')
      .eq('id', paperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper before publish', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper before publishing.' });
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    if (paper.status !== 'accepted') {
      return res.status(409).json({ success: false, error: 'Only accepted papers can be published. Accept the paper after peer review first.' });
    }

    // DOIs must be registered with CrossRef by the journal; never generate one here.
    // The admin may enter the registered DOI when publishing, or add it later.
    const doi = typeof req.body?.doi === 'string' ? req.body.doi.trim() : '';
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) {
      return res.status(400).json({ success: false, error: 'Enter a DOI in the form 10.xxxx/suffix, or leave it empty.' });
    }

    const now = new Date();
    const update = {
      status: 'published',
      publication_date: now.toISOString().split('T')[0],
    };
    if (doi) update.doi = doi;

    const { error } = await supabase
      .from('papers')
      .update(update)
      .eq('id', paperId);

    if (error) {
      console.error('Error publishing paper', error);
      return res.status(500).json({ success: false, error: 'Failed to publish paper.' });
    }

    // Notify the main author about publication
    if (paper.main_author_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Paper published',
          message: `Your paper "${paper.title}" has been published.`,
          type: 'success',
        });

      if (notifError) {
        console.error('Error creating publish notification', notifError);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/publish-paper', err);
    return res.status(500).json({ success: false, error: 'Failed to publish paper.' });
  }
});

// POST /api/admin/request-revisions
router.post('/request-revisions', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { paperId, note } = req.body || {};

    if (!paperId) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, main_author_id')
      .eq('id', paperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper for revisions request', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper for revisions request.' });
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    // Move the paper into revisions_requested state so the author can upload one revised manuscript
    const { error: statusError } = await supabase
      .from('papers')
      .update({ status: 'revisions_requested' })
      .eq('id', paperId);

    if (statusError) {
      console.error('Error updating paper status to revisions_requested', statusError);
      if (statusError.code === '22P02') {
        // Without this status the author can never upload a revision, so report it instead of pretending it worked.
        return res.status(409).json({
          success: false,
          code: 'MIGRATION_REQUIRED',
          error: 'The database does not support the "revisions requested" status yet. Run backend/papers_files_migration.sql in the Supabase SQL editor.',
        });
      }
      // Other failures: still notify the author below.
    }

    if (paper.main_author_id) {
      const message = note
        ? `The editor has requested revisions for your paper "${paper.title}": ${note}`
        : `The editor has requested revisions for your paper "${paper.title}" based on reviewer feedback.`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Revisions requested for your paper',
          message,
          type: 'info',
        });

      if (notifError) {
        console.error('Error creating revision-request notification', notifError);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/request-revisions', err);
    return res.status(500).json({ success: false, error: 'Failed to request revisions.' });
  }
});

// POST /api/admin/reject-paper
router.post('/reject-paper', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { paperId, note } = req.body || {};

    if (!paperId) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, main_author_id')
      .eq('id', paperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper for rejection', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper for rejection.' });
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    const { error: updateError } = await supabase
      .from('papers')
      .update({ status: 'rejected' })
      .eq('id', paperId);

    if (updateError) {
      console.error('Error rejecting paper', updateError);
      return res.status(500).json({ success: false, error: 'Failed to reject paper.' });
    }

    if (paper.main_author_id) {
      const message = note
        ? `Your paper "${paper.title}" has been rejected. Editor notes: ${note}`
        : `Your paper "${paper.title}" has been rejected.`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Paper decision: Rejected',
          message,
          type: 'error',
        });

      if (notifError) {
        console.error('Error creating rejection notification', notifError);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/admin/reject-paper', err);
    return res.status(500).json({ success: false, error: 'Failed to reject paper.' });
  }
});

module.exports = router;
