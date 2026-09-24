const express = require('express');
const { supabase } = require('../supabaseClient');
const { makeUploader, handleUpload, uploadFile, sendStorageError } = require('../storage');

const router = express.Router();

const upload = makeUploader({ manuscript: 'document', copyrightForm: 'document' });

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

// POST /api/submissions - handle full paper submission with file uploads
router.post(
  '/',
  handleUpload(upload.fields([
    { name: 'manuscript', maxCount: 1 },
    { name: 'copyrightForm', maxCount: 1 },
  ])),
  async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;

      const {
        fullName,
        email,
        affiliation,
        paperTitle,
        keywords,
        abstract,
        comments,
        coAuthors,
        userId,
      } = req.body || {};

      if (!fullName || !email || !affiliation || !paperTitle) {
        return res.status(400).json({ success: false, error: 'Required fields are missing.' });
      }

      const manuscriptFile = req.files?.manuscript?.[0] || null;
      const copyrightFile = req.files?.copyrightForm?.[0] || null;

      if (!manuscriptFile) {
        return res.status(400).json({ success: false, error: 'Manuscript file is required.' });
      }

      const pathPrefix = userId ? `user-${userId}` : 'anonymous';

      const manuscriptUrl = await uploadFile(manuscriptFile, `${pathPrefix}/manuscripts`);
      const copyrightUrl = copyrightFile
        ? await uploadFile(copyrightFile, `${pathPrefix}/copyright`)
        : null;

      const keywordArray = keywords
        ? keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

      let parsedCoAuthors = [];
      if (coAuthors) {
        try {
          const raw = typeof coAuthors === 'string' ? JSON.parse(coAuthors) : coAuthors;
          if (Array.isArray(raw)) {
            parsedCoAuthors = raw
              .map((a) => ({
                fullName: String(a?.fullName || '').trim(),
                affiliation: String(a?.affiliation || '').trim(),
                email: String(a?.email || '').trim(),
              }))
              .filter((a) => a.fullName || a.affiliation || a.email);
          }
        } catch (_e) {
          parsedCoAuthors = [];
        }
      }

      const allAuthorNames = [
        String(fullName || '').trim(),
        ...parsedCoAuthors.map((a) => a.fullName).filter(Boolean),
      ].filter(Boolean);

      const insertPayload = {
        title: paperTitle,
        authors: allAuthorNames,
        // Prefer the dedicated abstract field; older clients only sent `comments`.
        abstract: String(abstract || '').trim() || comments || null,
        cover_letter: String(abstract || '').trim() ? (String(comments || '').trim() || null) : null,
        keywords: keywordArray,
        category: null,
        word_count: null,
        submission_fee: 150,
        payment_status: 'pending',
        status: 'submitted',
        pdf_url: manuscriptUrl,
      };

      if (userId) {
        const parsedUserId = parseInt(userId, 10);
        if (!Number.isNaN(parsedUserId)) {
          insertPayload.main_author_id = parsedUserId;
        }
      }

      let { data, error } = await supabase
        .from('papers')
        .insert(insertPayload)
        .select('*')
        .single();

      // Until papers_files_migration.sql has been run, the cover_letter column does not exist.
      if (error && /cover_letter/.test(error.message || '')) {
        console.warn('[submissions] papers.cover_letter column missing; run backend/papers_files_migration.sql. Saving without it.');
        delete insertPayload.cover_letter;
        ({ data, error } = await supabase.from('papers').insert(insertPayload).select('*').single());
      }

      if (error) {
        console.error('Error inserting paper from submission', error);
        return res.status(500).json({ success: false, error: 'Failed to save submission.' });
      }

      // Best-effort: persist detailed author info in a separate table if available.
      // This enables future “email all authors on publish” workflows.
      try {
        const paperId = data?.id;
        if (paperId) {
          const authorRows = [
            {
              paper_id: paperId,
              full_name: String(fullName || '').trim(),
              affiliation: String(affiliation || '').trim(),
              email: String(email || '').trim(),
              is_corresponding: true,
            },
            ...parsedCoAuthors.map((a) => ({
              paper_id: paperId,
              full_name: a.fullName,
              affiliation: a.affiliation,
              email: a.email,
              is_corresponding: false,
            })),
          ].filter((row) => row.full_name);

          if (authorRows.length > 0) {
            const { error: authorInsertError } = await supabase
              .from('paper_authors')
              .insert(authorRows);

            if (authorInsertError) {
              console.warn('Unable to persist paper_authors rows', authorInsertError);
            }
          }
        }
      } catch (authorPersistErr) {
        console.warn('Unexpected error persisting paper_authors rows', authorPersistErr);
      }

      // Best-effort: persist copyright URL on the paper record (requires papers.copyright_url column)
      if (copyrightUrl) {
        try {
          if (data?.id) {
            const { error: copyrightUpdateError } = await supabase
              .from('papers')
              .update({ copyright_url: copyrightUrl })
              .eq('id', data.id);

            if (copyrightUpdateError) {
              console.error(`[submissions] Copyright form stored at ${copyrightUrl} but its URL could not be saved on paper ${data.id}` +
                ' (run backend/papers_files_migration.sql if papers.copyright_url is missing):', copyrightUpdateError.message || copyrightUpdateError);
            }
          }
        } catch (copyrightPersistErr) {
          console.warn('Unexpected error persisting copyright_url', copyrightPersistErr);
        }
      }

      return res.json({
        success: true,
        paper: {
          id: data.id,
          title: data.title,
          authors: data.authors,
          abstract: data.abstract,
          keywords: data.keywords,
          status: data.status,
          submissionDate: data.submission_date,
          publicationDate: data.publication_date,
          doi: data.doi,
          pdfUrl: data.pdf_url,
        },
        manuscriptUrl,
        copyrightUrl,
      });
    } catch (err) {
      if (sendStorageError(res, err)) return;
      console.error('Unexpected error in POST /api/submissions', err);
      return res.status(500).json({ success: false, error: 'Failed to process submission.' });
    }
  }
);

// POST /api/submissions/:paperId/revision - upload a revised manuscript for an existing paper
router.post(
  '/:paperId/revision',
  handleUpload(upload.single('manuscript')),
  async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;

      const paperId = parseInt(req.params.paperId, 10);
      if (Number.isNaN(paperId)) {
        return res.status(400).json({ success: false, error: 'Invalid paper id.' });
      }

      const manuscriptFile = req.file || null;
      if (!manuscriptFile) {
        return res.status(400).json({ success: false, error: 'Revised manuscript file is required.' });
      }

      // Only allow revised uploads when revisions have been explicitly requested
      const { data: paper, error: paperError } = await supabase
        .from('papers')
        .select('id, status')
        .eq('id', paperId)
        .single();

      if (paperError) {
        console.error('Error loading paper before revision upload', paperError);
        return res.status(500).json({ success: false, error: 'Failed to verify paper before revision upload.' });
      }

      if (!paper) {
        return res.status(404).json({ success: false, error: 'Paper not found.' });
      }

      if (paper.status !== 'revisions_requested') {
        return res.status(400).json({ success: false, error: 'Revised manuscript can only be uploaded after a revision request.' });
      }

      const { userId } = req.body || {};
      const pathPrefix = userId ? `user-${userId}` : `paper-${paperId}`;

      const manuscriptUrl = await uploadFile(
        manuscriptFile,
        `${pathPrefix}/revisions`
      );

      if (!manuscriptUrl) {
        return res.status(500).json({ success: false, error: 'Failed to upload revised manuscript.' });
      }

      const { data, error } = await supabase
        .from('papers')
        .update({ pdf_url: manuscriptUrl })
        .eq('id', paperId)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Error updating paper with revised manuscript', error);
        return res.status(500).json({ success: false, error: 'Failed to save revised manuscript.' });
      }

      if (!data) {
        return res.status(404).json({ success: false, error: 'Paper not found.' });
      }

      // Move paper back to under_review after a successful revision upload
      const { error: statusError } = await supabase
        .from('papers')
        .update({ status: 'under_review' })
        .eq('id', paperId);

      if (statusError) {
        console.error('Error updating paper status back to under_review after revision upload', statusError);
        // Do not fail the whole request if status update fails; the revised file is already saved
      }

      // Notify admins and assigned reviewers that a revised manuscript was uploaded
      try {
        // Load basic paper info for message
        const { data: paperInfo, error: paperInfoError } = await supabase
          .from('papers')
          .select('id, title')
          .eq('id', paperId)
          .single();

        if (paperInfoError) {
          console.error('Error loading paper info for revision notification', paperInfoError);
        } else if (paperInfo) {
          const title = paperInfo.title;

          // All admins
          const { data: admins, error: adminsError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin');

          if (adminsError) {
            console.error('Error loading admin users for revision notification', adminsError);
          }

          // All reviewers assigned to this paper
          const { data: assignments, error: assignmentsError } = await supabase
            .from('review_assignments')
            .select('reviewer_id')
            .eq('paper_id', paperId);

          if (assignmentsError) {
            console.error('Error loading review assignments for revision notification', assignmentsError);
          }

          const reviewerIds = (assignments || []).map((row) => row.reviewer_id);
          const adminIds = (admins || []).map((row) => row.id);
          const recipientIds = Array.from(new Set([...adminIds, ...reviewerIds]));

          if (recipientIds.length > 0) {
            const notifications = recipientIds.map((userId) => ({
              user_id: userId,
              title: 'Revised manuscript uploaded',
              message: `A revised version of the paper "${title}" has been uploaded by the author.`,
              type: 'info',
            }));

            const { error: notifError } = await supabase
              .from('notifications')
              .insert(notifications);

            if (notifError) {
              console.error('Error inserting revision notifications', notifError);
            }
          }
        }
      } catch (notifErr) {
        console.error('Unexpected error while creating revision notifications', notifErr);
      }

      return res.json({ success: true, manuscriptUrl });
    } catch (err) {
      if (sendStorageError(res, err)) return;
      console.error('Unexpected error in POST /api/submissions/:paperId/revision', err);
      return res.status(500).json({ success: false, error: 'Failed to process revised submission.' });
    }
  }
);

module.exports = router;
