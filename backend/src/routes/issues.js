const express = require('express');
const { supabase } = require('../supabaseClient');
const { requireAdmin } = require('../middleware/requireAdmin');
const { makeUploader, handleUpload, uploadFile, removeFileByUrl, sendStorageError } = require('../storage');
const { getSetting, setSetting } = require('../siteSettings');

const router = express.Router();

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

// Special issues are ordinary issue rows whose ids are listed in site_settings, so no schema change is
// needed. They are never the current issue and hold papers the admin publishes directly.
const SPECIAL_KEY = 'special_issues';
const getSpecialIds = async () => {
  const value = await getSetting(SPECIAL_KEY, []);
  return new Set((Array.isArray(value) ? value : []).map(Number).filter(Boolean));
};
const saveSpecialIds = (ids) => setSetting(SPECIAL_KEY, [...ids]);

const mapIssueRow = (row, specialIds) => ({
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
  isSpecial: Boolean(specialIds && specialIds.has(Number(row.id))),
  createdAt: row.created_at || null,
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

    const specialIds = await getSpecialIds();
    const issues = (data || []).map((row) => mapIssueRow(row, specialIds));
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
    const isSpecial = toBool(req.body?.isSpecial);
    if (isSpecial) {
      if (!fields.title) return res.status(400).json({ success: false, error: 'Give the special issue a title.' });
      if (!fields.year) return res.status(400).json({ success: false, error: 'Year is required.' });
      // The table needs numbers; special issues never show them.
      fields.volume = fields.volume || 1;
      fields.issue = 0;
    } else if (!fields.volume || !fields.issue || !fields.year) {
      return res.status(400).json({ success: false, error: 'Volume, issue number and year are required whole numbers.' });
    }

    const file = req.files?.file?.[0] || null;
    const cover = req.files?.coverImage?.[0] || null;
    const folder = isSpecial ? `special-issues/${Date.now()}` : issueFolder(fields);

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
    const makeCurrent = !isSpecial && toBool(req.body?.isCurrent);
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

    let specialIds = null;
    if (isSpecial) {
      try {
        specialIds = await getSpecialIds();
        specialIds.add(Number(data.id));
        await saveSpecialIds(specialIds);
      } catch (settingErr) {
        console.error('Error saving special issue flag', settingErr);
        await supabase.from('issues').delete().eq('id', data.id);
        await Promise.all(uploaded.map(removeFileByUrl));
        return res.status(500).json({ success: false, error: 'Failed to create the special issue.' });
      }
    }

    return res.json({ success: true, issue: mapIssueRow(data, specialIds) });
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

    const specialIds = await getSpecialIds();
    const isSpecial = specialIds.has(id);
    const fields = readIssueFields(req.body);
    if (isSpecial) {
      delete fields.volume;
      delete fields.issue;
      if ('title' in fields && !fields.title) return res.status(400).json({ success: false, error: 'Give the special issue a title.' });
    }
    for (const key of ['volume', 'issue', 'year']) {
      if (key in fields && !fields[key]) {
        return res.status(400).json({ success: false, error: 'Volume, issue number and year must be whole numbers.' });
      }
    }

    const update = { ...fields };
    const file = req.files?.file?.[0] || null;
    const cover = req.files?.coverImage?.[0] || null;
    const folder = isSpecial ? `special-issues/issue-${id}` : issueFolder({ volume: update.volume ?? existing.volume, issue: update.issue ?? existing.issue });

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

    const makeCurrent = !isSpecial && 'isCurrent' in (req.body || {}) ? toBool(req.body.isCurrent) : null;
    if (makeCurrent !== null) update.is_current = makeCurrent;

    if (Object.keys(update).length === 0) {
      return res.json({ success: true, issue: mapIssueRow(existing, specialIds) });
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

    return res.json({ success: true, issue: mapIssueRow(data, specialIds) });
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

    if ((await getSpecialIds()).has(id)) {
      return res.status(400).json({ success: false, error: 'A special issue can’t be the current issue.' });
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

    // A special issue's papers exist only there, so they go with it.
    const specialIds = await getSpecialIds();
    const isSpecial = specialIds.has(id);
    let specialPapers = [];
    if (isSpecial) {
      const { data: links } = await supabase.from('issue_papers').select('paper_id').eq('issue_id', id);
      const ids = (links || []).map((l) => l.paper_id);
      if (ids.length) {
        const { data: rows } = await supabase.from('papers').select('id, pdf_url').in('id', ids);
        specialPapers = rows || [];
      }
    }

    const { data, error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id)
      .select('id, file_url, cover_image_url')
      .maybeSingle();

    if (error) {
      console.error('Error deleting issue', error);
      return res.status(500).json({ success: false, error: 'Failed to delete issue.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    if (isSpecial) {
      if (specialPapers.length) {
        const { error: papersError } = await supabase.from('papers').delete().in('id', specialPapers.map((p) => p.id));
        if (papersError) console.error('Error deleting special issue papers', papersError);
        else await Promise.all(specialPapers.filter((p) => p.pdf_url).map((p) => removeFileByUrl(p.pdf_url)));
      }
      await Promise.all([data.file_url, data.cover_image_url].filter(Boolean).map(removeFileByUrl));
      specialIds.delete(id);
      await saveSpecialIds(specialIds).catch((e) => console.error('Error clearing special issue flag', e));
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

const specialPaperUpload = handleUpload(makeUploader({ manuscript: 'pdf' }).single('manuscript'));
const splitList = (value) => String(value || '').split(/[,;\n]/).map((v) => v.trim()).filter(Boolean);

const loadSpecialIssue = async (res, rawId) => {
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid issue id.' });
    return null;
  }
  if (!(await getSpecialIds()).has(id)) {
    res.status(404).json({ success: false, error: 'Special issue not found.' });
    return null;
  }
  return id;
};

// POST /api/issues/:id/special-papers - admin publishes a paper straight into a special issue
// (no author account, review, fee or emails). Multipart: manuscript (PDF), title, authors, abstract, keywords, category.
router.post('/:id/special-papers', requireAdmin, specialPaperUpload, async (req, res) => {
  let pdfUrl = null;
  try {
    if (!ensureSupabase(res)) return;
    const issueId = await loadSpecialIssue(res, req.params.id);
    if (!issueId) return;

    const title = cleanText(req.body?.title);
    const authors = splitList(req.body?.authors);
    if (!title) return res.status(400).json({ success: false, error: 'Enter the paper title.' });
    if (!authors.length) return res.status(400).json({ success: false, error: 'Enter at least one author name.' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Attach the paper as a PDF.' });

    pdfUrl = await uploadFile(req.file, `special-issues/issue-${issueId}`);
    const today = new Date().toISOString().split('T')[0];
    const { data: paper, error } = await supabase.from('papers').insert({
      main_author_id: req.user.id,
      title,
      authors,
      abstract: cleanText(req.body?.abstract),
      keywords: splitList(req.body?.keywords),
      category: cleanText(req.body?.category),
      status: 'published',
      submission_date: today,
      publication_date: today,
      submission_fee: 0,
      payment_status: 'paid',
      pdf_url: pdfUrl,
    }).select('*').single();

    if (error) {
      console.error('Error creating special issue paper', error);
      await removeFileByUrl(pdfUrl);
      return res.status(500).json({ success: false, error: 'Failed to add the paper.' });
    }

    const { error: linkError } = await supabase.from('issue_papers').insert({ issue_id: issueId, paper_id: paper.id });
    if (linkError) {
      console.error('Error linking special issue paper', linkError);
      await supabase.from('papers').delete().eq('id', paper.id);
      await removeFileByUrl(pdfUrl);
      return res.status(500).json({ success: false, error: 'Failed to add the paper.' });
    }

    return res.json({ success: true, paper: { id: paper.id, title: paper.title, authors: paper.authors, pdfUrl: paper.pdf_url } });
  } catch (err) {
    if (pdfUrl) await removeFileByUrl(pdfUrl);
    if (sendStorageError(res, err)) return;
    console.error('Unexpected error in POST /api/issues/:id/special-papers', err);
    return res.status(500).json({ success: false, error: 'Failed to add the paper.' });
  }
});

// DELETE /api/issues/:id/special-papers/:paperId - delete a paper from a special issue
router.delete('/:id/special-papers/:paperId', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const issueId = await loadSpecialIssue(res, req.params.id);
    if (!issueId) return;
    const paperId = parseInt(req.params.paperId, 10);
    if (Number.isNaN(paperId)) return res.status(400).json({ success: false, error: 'Invalid paper id.' });

    const { data: link } = await supabase.from('issue_papers').select('id').eq('issue_id', issueId).eq('paper_id', paperId).maybeSingle();
    if (!link) return res.status(404).json({ success: false, error: 'This paper is not in the special issue.' });

    const { data: paper, error } = await supabase.from('papers').delete().eq('id', paperId).select('pdf_url').maybeSingle();
    if (error) {
      console.error('Error deleting special issue paper', error);
      return res.status(500).json({ success: false, error: 'Failed to remove the paper.' });
    }
    if (paper?.pdf_url) await removeFileByUrl(paper.pdf_url);
    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/issues/:id/special-papers/:paperId', err);
    return res.status(500).json({ success: false, error: 'Failed to remove the paper.' });
  }
});

module.exports = router;
