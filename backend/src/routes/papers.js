const express = require('express');
const { supabase } = require('../supabaseClient');
const { Readable } = require('stream');

const router = express.Router();

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

// DELETE /api/papers/:id - delete a paper by id
router.delete('/:id', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid paper id.' });
    }

    const { error } = await supabase
      .from('papers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting paper', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to delete paper.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/papers/:id', err);
    return res.status(500).json({ success: false, error: 'Failed to delete paper.' });
  }
});

const mapPaperRow = (row, assignmentsByPaperId) => {
  const assignedReviewers = assignmentsByPaperId[row.id] || [];

  return {
    id: row.id,
    title: row.title,
    authors: row.authors || [],
    abstract: row.abstract || '',
    keywords: row.keywords || [],
    status: row.status,
    submissionDate: row.submission_date,
    publicationDate: row.publication_date,
    doi: row.doi,
    pdfUrl: row.pdf_url,
    copyrightUrl: row.copyright_url || null,
    category: row.category,
    wordCount: row.word_count,
    citationCount: row.citation_count,
    submissionFee: row.submission_fee,
    paymentStatus: row.payment_status,
    assignedReviewers,
    reviewDeadline: row.review_deadline,
  };
};

const loadAssignmentsByPaper = async () => {
  const result = await supabase
    .from('review_assignments')
    .select('paper_id, reviewer_id');

  if (result.error) {
    throw result.error;
  }

  const assignmentsByPaperId = {};
  for (const row of result.data || []) {
    if (!assignmentsByPaperId[row.paper_id]) {
      assignmentsByPaperId[row.paper_id] = [];
    }
    assignmentsByPaperId[row.paper_id].push(row.reviewer_id);
  }

  return assignmentsByPaperId;
};

// GET /api/papers - all papers
router.get('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data: paperRows, error } = await supabase
      .from('papers')
      .select('*')
      .order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching papers', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to fetch papers.' });
    }

    const assignmentsByPaperId = await loadAssignmentsByPaper();
    const papers = (paperRows || []).map((row) => mapPaperRow(row, assignmentsByPaperId));

    return res.json({ success: true, papers });
  } catch (err) {
    console.error('Unexpected error in GET /api/papers', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch papers.' });
  }
});

// GET /api/papers/published - published papers only
router.get('/published', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data: paperRows, error } = await supabase
      .from('papers')
      .select('*')
      .eq('status', 'published')
      .order('publication_date', { ascending: false });

    if (error) {
      console.error('Error fetching published papers', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to fetch published papers.' });
    }

    const assignmentsByPaperId = await loadAssignmentsByPaper();
    const papers = (paperRows || []).map((row) => mapPaperRow(row, assignmentsByPaperId));

    return res.json({ success: true, papers });
  } catch (err) {
    console.error('Unexpected error in GET /api/papers/published', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch published papers.' });
  }
});

// GET /api/papers/:id/download - stream a paper PDF through this server
router.get('/:id/download', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid paper id.' });
    }

    const { data: row, error } = await supabase
      .from('papers')
      .select('id, title, pdf_url')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching paper for download', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to fetch paper.' });
    }

    if (!row) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    const pdfUrl = row.pdf_url;
    if (!pdfUrl) {
      return res.status(404).json({ success: false, error: 'Paper PDF is not available.' });
    }

    let cleanedPdfUrl = String(pdfUrl || '').trim();

    // If it starts with http, it might be a full URL (possibly with quotes)
    if (cleanedPdfUrl.toLowerCase().includes('http')) {
      cleanedPdfUrl = cleanedPdfUrl
        .replace(/^["'“”]+/, '')
        .replace(/["'“”]+$/, '')
        .trim();
    }

    let validatedUrl = null;
    try {
      const urlObj = new URL(cleanedPdfUrl);
      validatedUrl = urlObj.toString();
    } catch (_e) {
      console.error('Invalid pdf_url stored for paper', { id: row.id, pdf_url: pdfUrl });
      return res.status(404).json({ success: false, error: 'Paper PDF URL is invalid or not found.' });
    }

    // ALWAYS redirect for now as it is the most reliable across all environments
    // and avoids the header character issues with titles.
    return res.redirect(302, validatedUrl);
  } catch (err) {
    console.error('Unexpected error in GET /api/papers/:id/download', err);
    return res.status(500).json({ success: false, error: 'Failed to download paper file.' });
  }
});

// GET /api/papers/:id - single paper by id
router.get('/:id', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid paper id.' });
    }

    const { data: row, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching paper by id', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to fetch paper.' });
    }

    if (!row) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }

    const assignmentsByPaperId = await loadAssignmentsByPaper();
    const paper = mapPaperRow(row, assignmentsByPaperId);

    return res.json({ success: true, paper });
  } catch (err) {
    console.error('Unexpected error in GET /api/papers/:id', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch paper.' });
  }
});

// POST /api/papers - submit a new paper
router.post('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const {
      title,
      authors,
      abstract,
      keywords,
      category,
      wordCount,
      submissionFee,
      paymentStatus,
      mainAuthorId,
    } = req.body || {};

    if (!title || !authors || !Array.isArray(authors) || authors.length === 0) {
      return res.status(400).json({ success: false, error: 'Title and at least one author are required.' });
    }

    const mappedKeywords = Array.isArray(keywords) ? keywords : [];
    const wordCountInt = wordCount ? parseInt(wordCount, 10) : null;
    const submissionFeeNumber = typeof submissionFee === 'number' ? submissionFee : 150;
    const paymentStatusValue = paymentStatus || 'pending';

    const insertPayload = {
      title,
      authors,
      abstract: abstract || null,
      keywords: mappedKeywords,
      category: category || null,
      word_count: wordCountInt,
      submission_fee: submissionFeeNumber,
      payment_status: paymentStatusValue,
      status: 'submitted',
    };

    if (mainAuthorId) {
      insertPayload.main_author_id = mainAuthorId;
    }

    const { data, error } = await supabase
      .from('papers')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting paper', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to submit paper.' });
    }

    const assignmentsByPaperId = {};
    const paper = mapPaperRow(data, assignmentsByPaperId);

    return res.json({ success: true, paper });
  } catch (err) {
    console.error('Unexpected error in POST /api/papers', err);
    return res.status(500).json({ success: false, error: 'Failed to submit paper.' });
  }
});

module.exports = router;
