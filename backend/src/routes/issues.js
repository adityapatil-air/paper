const express = require('express');
const { supabase } = require('../supabaseClient');

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
});

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

// POST /api/issues - create new issue
router.post('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { volume, issue, month, year } = req.body || {};

    if (!volume || !issue || !year) {
      return res.status(400).json({ success: false, error: 'volume, issue and year are required.' });
    }

    const { data, error } = await supabase
      .from('issues')
      .insert({
        volume,
        issue,
        month: month || null,
        year,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating issue', error);
      return res.status(500).json({ success: false, error: 'Failed to create issue.' });
    }

    return res.json({ success: true, issue: mapIssueRow(data) });
  } catch (err) {
    console.error('Unexpected error in POST /api/issues', err);
    return res.status(500).json({ success: false, error: 'Failed to create issue.' });
  }
});

// POST /api/issues/:id/set-current - mark an issue as current
router.post('/:id/set-current', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
router.post('/:id/assign-paper', async (req, res) => {
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
router.delete('/:id/assign-paper/:paperId', async (req, res) => {
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
