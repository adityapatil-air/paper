const express = require('express');
const { supabase } = require('../supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();

const RECOMMENDATIONS = ['accept', 'accept_with_revisions', 'reject_with_revisions', 'reject'];

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

const mapReviewRow = (row) => ({
  id: row.id,
  paperId: row.paper_id,
  reviewerId: row.reviewer_id,
  reviewerName: row.reviewer_name,
  rating: row.rating,
  comments: row.comments,
  recommendation: row.recommendation,
  submittedDate: row.submitted_date,
  status: row.status,
});

// GET /api/reviews/reviewer/:reviewerId - a reviewer's own reviews (or any, for admins)
router.get('/reviewer/:reviewerId', requireAuth, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const reviewerId = parseInt(req.params.reviewerId, 10);
    if (Number.isNaN(reviewerId)) {
      return res.status(400).json({ success: false, error: 'Invalid reviewer id.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== reviewerId) {
      return res.status(403).json({ success: false, error: 'You can only view your own reviews.', code: 'FORBIDDEN' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .order('submitted_date', { ascending: false });

    if (error) {
      console.error('Error fetching reviews by reviewer', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }

    const reviews = (data || []).map(mapReviewRow);
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('Unexpected error in GET /api/reviews/reviewer/:reviewerId', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
  }
});

// GET /api/reviews/paper/:paperId - all reviews of a paper, with reviewer identities (admins only)
router.get('/paper/:paperId', requireAdmin, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const paperId = parseInt(req.params.paperId, 10);
    if (Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper id.' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('paper_id', paperId)
      .order('submitted_date', { ascending: false });

    if (error) {
      console.error('Error fetching reviews by paper', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }

    const reviews = (data || []).map(mapReviewRow);
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('Unexpected error in GET /api/reviews/paper/:paperId', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
  }
});

// GET /api/reviews/paper/:paperId/for-author - the reviewers' comments for the paper's own
// author, without reviewer identities. Released once the editor has made a decision.
const AUTHOR_VISIBLE_STATUSES = ['revisions_requested', 'accepted', 'rejected', 'published'];

router.get('/paper/:paperId/for-author', requireAuth, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const paperId = parseInt(req.params.paperId, 10);
    if (Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Invalid paper id.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, status, main_author_id')
      .eq('id', paperId)
      .maybeSingle();

    if (paperError) {
      console.error('Error loading paper for author reviews', paperError);
      return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }
    if (!paper || paper.main_author_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Paper not found.' });
    }
    if (!AUTHOR_VISIBLE_STATUSES.includes(paper.status)) {
      return res.json({ success: true, reviews: [] });
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('recommendation, comments, submitted_date')
      .eq('paper_id', paperId)
      .order('submitted_date', { ascending: true });

    if (error) {
      console.error('Error fetching reviews for author', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }

    const reviews = (data || []).map((row) => ({
      recommendation: row.recommendation,
      comments: row.comments,
      submittedDate: row.submitted_date,
    }));
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('Unexpected error in GET /api/reviews/paper/:paperId/for-author', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews - the signed-in reviewer submits their review of a paper assigned to them
router.post('/', requireRole('reviewer'), async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { rating, recommendation, comments } = req.body || {};
    const paperId = parseInt(req.body?.paperId, 10);
    const reviewerId = req.user.id;

    if (Number.isNaN(paperId) || !rating || !recommendation || !comments) {
      return res.status(400).json({ success: false, error: 'Missing required review fields.' });
    }

    const ratingInt = parseInt(rating, 10);
    if (Number.isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
    }
    if (!RECOMMENDATIONS.includes(recommendation)) {
      return res.status(400).json({ success: false, error: 'Choose a valid recommendation.' });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('review_assignments')
      .select('id')
      .eq('paper_id', paperId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error checking review assignment', assignmentError);
      return res.status(500).json({ success: false, error: 'Failed to submit review.' });
    }
    if (!assignment) {
      return res.status(403).json({ success: false, error: 'This paper is not assigned to you for review.', code: 'FORBIDDEN' });
    }

    // Reviews are taken only while the paper is with reviewers. Each revised manuscript
    // starts a new round, so an assigned reviewer may review the same paper again.
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('status')
      .eq('id', paperId)
      .maybeSingle();

    if (paperError) {
      console.error('Error loading paper before review', paperError);
      return res.status(500).json({ success: false, error: 'Failed to submit review.' });
    }
    if (!paper || paper.status !== 'under_review') {
      return res.status(409).json({ success: false, error: 'Reviews can only be submitted while the paper is under review.' });
    }

    const { data: reviewer } = await supabase
      .from('users')
      .select('name')
      .eq('id', reviewerId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        paper_id: paperId,
        reviewer_id: reviewerId,
        reviewer_name: reviewer?.name || null,
        rating: ratingInt,
        recommendation,
        comments,
        status: 'completed',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting review', error);
      return res.status(500).json({ success: false, error: 'Failed to submit review.' });
    }

    const review = mapReviewRow(data);
    return res.json({ success: true, review });
  } catch (err) {
    console.error('Unexpected error in POST /api/reviews', err);
    return res.status(500).json({ success: false, error: 'Failed to submit review.' });
  }
});

module.exports = router;
