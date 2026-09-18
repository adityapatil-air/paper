const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabaseClient');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max per file
  },
});

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

const getBucketName = () => process.env.SUPABASE_STORAGE_BUCKET || 'manuscripts';

const uploadFileToStorage = async (file, pathPrefix = '') => {
  if (!file) return null;

  const bucket = getBucketName();
  const normalizedPrefix = pathPrefix ? `${pathPrefix.replace(/\/+$/, '')}/` : '';
  const filePath = `${normalizedPrefix}${Date.now()}-${file.originalname}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl || null;
};

// POST /api/admin/papers/:paperId/files - replace manuscript/copyright files for an existing paper
router.post(
  '/papers/:paperId/files',
  upload.fields([
    { name: 'manuscript', maxCount: 1 },
    { name: 'copyrightForm', maxCount: 1 },
  ]),
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
        manuscriptUrl = await uploadFileToStorage(manuscriptFile, `${pathPrefix}/manuscripts`);
      }

      if (copyrightFile) {
        copyrightUrl = await uploadFileToStorage(copyrightFile, `${pathPrefix}/copyright`);
      }

      const updatePayload = {};
      if (manuscriptUrl) updatePayload.pdf_url = manuscriptUrl;
      if (copyrightUrl) updatePayload.copyright_url = copyrightUrl;

      const { error: updateError } = await supabase
        .from('papers')
        .update(updatePayload)
        .eq('id', paperId);

      if (updateError) {
        console.error('Error updating paper file URLs in admin replace', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update paper files.' });
      }

      return res.json({ success: true, manuscriptUrl, copyrightUrl });
    } catch (err) {
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
      // Unique violation (already assigned) is treated as success
      if (insertError.code !== '23505') {
        console.error('Error assigning reviewer', insertError);
        return res.status(500).json({ success: false, error: 'Failed to assign reviewer.' });
      }
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

// POST /api/admin/publish-paper
router.post('/publish-paper', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { paperId } = req.body || {};

    if (!paperId) {
      return res.status(400).json({ success: false, error: 'paperId is required.' });
    }

    // Load paper to notify the main author after publishing
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, main_author_id')
      .eq('id', paperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper before publish', paperError);
      return res.status(500).json({ success: false, error: 'Failed to load paper before publishing.' });
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    const now = new Date();
    const year = now.getFullYear();
    const doi = `10.1000/example.${year}.${String(paperId).padStart(3, '0')}`;

    const { error } = await supabase
      .from('papers')
      .update({
        status: 'published',
        publication_date: now.toISOString().split('T')[0],
        doi,
      })
      .eq('id', paperId);

    if (error) {
      console.error('Error publishing paper', error);
      return res.status(500).json({ success: false, error: 'Failed to publish paper.' });
    }

    // Notify the main author about acceptance & publication
    if (paper.main_author_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: paper.main_author_id,
          title: 'Paper accepted and published',
          message: `Your paper "${paper.title}" has been accepted and published.`,
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
      // Do not fail the whole request; notification to author is still important
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
