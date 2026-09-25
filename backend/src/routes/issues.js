const express = require('express');
const { supabase } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/requireAdmin');
const { makeUploader, handleUpload, uploadFile, removeFileByUrl, sendStorageError } = require('../storage');

const router = express.Router();

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

const mapIssueRow = (row) => ({
  id: row.id,
  volume: row.volume,
  issue: row.issue,
  month: row.month,
  year: row.year,
  isCurrent: row.is_current,
  title: row.title || null,
  description: row.description || null,
  coverImageUrl: row.cover_image_url || null,
  fileUrl: row.file_url || null,
  fileName: row.file_name || null,
  publishedAt: row.published_at || null,
});

const upload = makeUploader({ file: 'document', coverImage: 'image' });
const issueUploads = handleUpload(upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]));

const MIGRATION_HINT = 'The issues table is missing the new content columns. apply backend/supabase_schema.sql in the Supabase SQL editor.';
const isMissingColumnError = (error) => Boolean(error) && (
  error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || '')
);

const toInt = (value) => {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isNaN(n) ? null : n;
};
const toBool = (value) => value === true || value === 'true' || value === '1' || value === 'on';
const cleanText = (value) => {
  const t = String(value ?? '').trim();
  return t || null;
};
const cleanDate = (value) => {
  const t = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
};

// Collects writable issue fields from a (multipart or JSON) body; only keys that were sent are returned.
const readIssueFields = (body = {}) => {
  const out = {};
  if ('volume' in body) out.volume = toInt(body.volume);
  if ('issue' in body) out.issue = toInt(body.issue);
  if ('year' in body) out.year = toInt(body.year);
  if ('month' in body) out.month = cleanText(body.month);
  if ('title' in body) out.title = cleanText(body.title);
  if ('description' in body) out.description = cleanText(body.description);
  if ('publishedAt' in body) out.published_at = cleanDate(body.publishedAt);
  return out;
};

const clearCurrentIssue = async (exceptId) => {
  let query = supabase.from('issues').update({ is_current: false }).eq('is_current', true);
  if (exceptId) query = query.neq('id', exceptId);
  const { error } = await query;
  if (error) console.error('Error clearing current issue flag', error);
};

const issueFolder = (fields) => `issues/vol${fields.volume || 'x'}-issue${fields.issue || 'x'}`;

// GET /api/issues - list all issues
router.get('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('year', { ascending: false })
      .order('issue', { ascending: false });

    if (error) {
      console.error('Error fetching issues', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch issues.' });
    }

    const issues = (data || []).map(mapIssueRow);
    return res.json({ success: true, issues });
  } catch (err) {
    console.error('Unexpected error in GET /api/issues', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch issues.' });
  }
});

// POST /api/issues - create a new issue (admin). Accepts JSON or multipart with optional `file` and `coverImage`.
router.post('/', requireAdmin, issueUploads, async (req, res) => {
  const uploaded = [];
  try {
    if (!ensureSupabase(res)) return;

    const fields = readIssueFields(req.body);
    if (!fields.volume || !fields.issue || !fields.year) {
      return res.status(400).json({ success: false, error: 'Volume, issue number and year are required whole numbers.' });
    }

    const file = req.files?.file?.[0] || null;
    const cover = req.files?.coverImage?.[0] || null;
    const folder = issueFolder(fields);

    // Omit empty optional fields so a plain issue still saves before the content migration is applied.
    const payload = Object.fromEntries(Object.entries({ ...fields, month: fields.month ?? null })
      .filter(([key, value]) => value !== null || key === 'month'));
    if (file) {
      payload.file_url = await uploadFile(file, folder);
      payload.file_name = file.originalname;
      uploaded.push(payload.file_url);
    }
    if (cover) {
      payload.cover_image_url = await uploadFile(cover, `${folder}/cover`);
      uploaded.push(payload.cover_image_url);
    }
    const makeCurrent = toBool(req.body?.isCurrent);
    if (makeCurrent) payload.is_current = true;

    const { data, error } = await supabase.from('issues').insert(payload).select('*').single();

    if (error) {
      await Promise.all(uploaded.map(removeFileByUrl));
      if (isMissingColumnError(error)) {
        console.error('Error creating issue (migration not applied)', error);
        return res.status(409).json({ success: false, error: MIGRATION_HINT, code: 'MIGRATION_REQUIRED' });
      }
      console.error('Error creating issue', error);
      return res.status(500).json({ success: false, error: 'Failed to create issue.' });
    }

    if (makeCurrent) await clearCurrentIssue(data.id);

    return res.json({ success: true, issue: mapIssueRow(data) });
  } catch (err) {
    await Promise.all(uploaded.map(removeFileByUrl));
    if (sendStorageError(res, err)) return;
    console.error('Unexpected error in POST /api/issues', err);
    return res.status(500).json({ success: false, error: 'Failed to create issue.' });
  }
});

// PUT /api/issues/:id - edit an issue (admin). Optional `file`/`coverImage` replace the stored ones;
// `removeFile=true` / `removeCover=true` clear them.
router.put('/:id', requireAdmin, issueUploads, async (req, res) => {
  const uploaded = [];
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid issue id.' });
    }

    const { data: existing, error: loadError } = await supabase.from('issues').select('*').eq('id', id).maybeSingle();
    if (loadError) {
      console.error('Error loading issue before update', loadError);
      return res.status(500).json({ success: false, error: 'Failed to load issue.' });
    }
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const fields = readIssueFields(req.body);
    for (const key of ['volume', 'issue', 'year']) {
      if (key in fields && !fields[key]) {
        return res.status(400).json({ success: false, error: 'Volume, issue number and year must be whole numbers.' });
      }
    }

    const update = { ...fields };
    const file = req.files?.file?.[0] || null;
    const cover = req.files?.coverImage?.[0] || null;
    const folder = issueFolder({ volume: update.volume ?? existing.volume, issue: update.issue ?? existing.issue });

    if (file) {
      update.file_url = await uploadFile(file, folder);
      update.file_name = file.originalname;
      uploaded.push(update.file_url);
    } else if (toBool(req.body?.removeFile)) {
      update.file_url = null;
      update.file_name = null;
    }
    if (cover) {
      update.cover_image_url = await uploadFile(cover, `${folder}/cover`);
      uploaded.push(update.cover_image_url);
    } else if (toBool(req.body?.removeCover)) {
      update.cover_image_url = null;
    }

    const makeCurrent = 'isCurrent' in (req.body || {}) ? toBool(req.body.isCurrent) : null;
    if (makeCurrent !== null) update.is_current = makeCurrent;

    if (Object.keys(update).length === 0) {
      return res.json({ success: true, issue: mapIssueRow(existing) });
    }

    const { data, error } = await supabase.from('issues').update(update).eq('id', id).select('*').single();

    if (error) {
      await Promise.all(uploaded.map(removeFileByUrl));
      if (isMissingColumnError(error)) {
        console.error('Error updating issue (migration not applied)', error);
        return res.status(409).json({ success: false, error: MIGRATION_HINT, code: 'MIGRATION_REQUIRED' });
      }
      console.error('Error updating issue', error);
      return res.status(500).json({ success: false, error: 'Failed to update issue.' });
    }

    if (makeCurrent) await clearCurrentIssue(id);

    return res.json({ success: true, issue: mapIssueRow(data) });
  } catch (err) {
    await Promise.all(uploaded.map(removeFileByUrl));
    if (sendStorageError(res, err)) return;
    console.error('Unexpected error in PUT /api/issues/:id', err);
    return res.status(500).json({ success: false, error: 'Failed to update issue.' });
  }
});

// POST /api/issues/:id/set-current - mark an issue as current
router.post('/:id/set-current', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid issue id.' });
    }

    // Clear any existing current issue
    const { error: clearError } = await supabase
      .from('issues')
      .update({ is_current: false })
      .eq('is_current', true);

    if (clearError) {
      console.error('Error clearing current issue flag', clearError);
      // Do not fail the whole request; try to set the new current issue anyway
    }

    const { data, error } = await supabase
      .from('issues')
      .update({ is_current: true })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error setting current issue', error);
      return res.status(500).json({ success: false, error: 'Failed to set current issue.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    return res.json({ success: true, issue: mapIssueRow(data) });
  } catch (err) {
    console.error('Unexpected error in POST /api/issues/:id/set-current', err);
    return res.status(500).json({ success: false, error: 'Failed to set current issue.' });
  }
});

// DELETE /api/issues/:id - delete an issue
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid issue id.' });
    }

    const { data, error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error deleting issue', error);
      return res.status(500).json({ success: false, error: 'Failed to delete issue.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/issues/:id', err);
    return res.status(500).json({ success: false, error: 'Failed to delete issue.' });
  }
});

// POST /api/issues/:id/assign-paper - assign a published paper to an issue
router.post('/:id/assign-paper', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const issueId = parseInt(req.params.id, 10);
    const { paperId } = req.body || {};

    if (!paperId || Number.isNaN(issueId)) {
      return res.status(400).json({ success: false, error: 'Valid issue id and paperId are required.' });
    }

    const parsedPaperId = parseInt(paperId, 10);
    if (Number.isNaN(parsedPaperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paperId.' });
    }

    // Ensure paper exists and is published
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, status')
      .eq('id', parsedPaperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper before assigning to issue', paperError);
      return res.status(500).json({ success: false, error: 'Failed to verify paper before assignment.' });
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    if (paper.status !== 'published') {
      return res.status(400).json({ success: false, error: 'Only published papers can be assigned to an issue.' });
    }

    // Prevent assigning the same paper to multiple issues
    const { data: existingAssignments, error: existingError } = await supabase
      .from('issue_papers')
      .select('issue_id')
      .eq('paper_id', parsedPaperId);

    if (existingError) {
      console.error('Error checking existing issue assignment for paper', parsedPaperId, existingError);
      return res.status(500).json({ success: false, error: 'Failed to verify existing issue assignment.' });
    }

    if (existingAssignments && existingAssignments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This paper is already assigned to an issue.',
      });
    }

    // Insert assignment (issue_papers table must exist)
    const { error: insertError } = await supabase
      .from('issue_papers')
      .insert({
        issue_id: issueId,
        paper_id: parsedPaperId,
      });

    if (insertError) {
      console.error('Error assigning paper to issue', insertError);
      return res.status(500).json({ success: false, error: 'Failed to assign paper to issue.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/issues/:id/assign-paper', err);
    return res.status(500).json({ success: false, error: 'Failed to assign paper to issue.' });
  }
});

// GET /api/issues/assignments - list all paper->issue assignments
router.get('/assignments', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data, error } = await supabase
      .from('issue_papers')
      .select('issue_id, paper_id, issues!inner(id, volume, issue, month, year)');

    if (error) {
      console.error('Error fetching issue assignments', error);
      return res.status(500).json({ success: false, error: 'Failed to load issue assignments.' });
    }

    const assignments = (data || []).map((row) => ({
      issueId: row.issue_id,
      paperId: row.paper_id,
      issue: row.issues,
    }));

    return res.json({ success: true, assignments });
  } catch (err) {
    console.error('Unexpected error in GET /api/issues/assignments', err);
    return res.status(500).json({ success: false, error: 'Failed to load issue assignments.' });
  }
});

// GET /api/issues/:id/papers - list papers assigned to an issue
router.get('/:id/papers', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const issueId = parseInt(req.params.id, 10);
    if (Number.isNaN(issueId)) {
      return res.status(400).json({ success: false, error: 'Invalid issue id.' });
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('issue_papers')
      .select('paper_id')
      .eq('issue_id', issueId);

    if (assignmentsError) {
      console.error('Error fetching issue_papers for issue', issueId, assignmentsError);
      return res.status(500).json({ success: false, error: 'Failed to load issue papers.' });
    }

    const paperIds = (assignments || []).map((row) => row.paper_id);
    if (paperIds.length === 0) {
      return res.json({ success: true, papers: [] });
    }

    const { data: paperRows, error: paperError } = await supabase
      .from('papers')
      .select('*')
      .in('id', paperIds);

    if (paperError) {
      console.error('Error fetching papers for issue', issueId, paperError);
      return res.status(500).json({ success: false, error: 'Failed to load issue papers.' });
    }

    const papers = (paperRows || []).map((row) => ({
      id: row.id,
      title: row.title,
      authors: row.authors || [],
      abstract: row.abstract || '',
      keywords: row.keywords || [],
      status: row.status,
      submissionDate: row.submission_date,
      publicationDate: row.publication_date,
      doi: row.doi,
      category: row.category,
      citationCount: row.citation_count,
      pdfUrl: row.pdf_url,
    }));

    return res.json({ success: true, papers });
  } catch (err) {
    console.error('Unexpected error in GET /api/issues/:id/papers', err);
    return res.status(500).json({ success: false, error: 'Failed to load issue papers.' });
  }
});

// DELETE /api/issues/:id/assign-paper/:paperId - unassign a paper from an issue
router.delete('/:id/assign-paper/:paperId', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const issueId = parseInt(req.params.id, 10);
    const paperId = parseInt(req.params.paperId, 10);

    if (Number.isNaN(issueId) || Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid issue or paper id.' });
    }

    const { data, error } = await supabase
      .from('issue_papers')
      .delete()
      .eq('issue_id', issueId)
      .eq('paper_id', paperId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error unassigning paper from issue', error);
      return res.status(500).json({ success: false, error: 'Failed to unassign paper from issue.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/issues/:id/assign-paper/:paperId', err);
    return res.status(500).json({ success: false, error: 'Failed to unassign paper from issue.' });
  }
});

module.exports = router;
