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

// GET /api/reviews/reviewer/:reviewerId
router.get('/reviewer/:reviewerId', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const reviewerId = parseInt(req.params.reviewerId, 10);
    if (Number.isNaN(reviewerId)) {
      return res.status(400).json({ success: false, error: 'Invalid reviewer id.' });
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

// GET /api/reviews/paper/:paperId
router.get('/paper/:paperId', async (req, res) => {
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

// POST /api/reviews - submit a review
router.post('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const {
      paperId,
      reviewerId,
      reviewerName,
      rating,
      recommendation,
      comments,
    } = req.body || {};

    if (!paperId || !reviewerId || !rating || !recommendation || !comments) {
      return res.status(400).json({ success: false, error: 'Missing required review fields.' });
    }

    const ratingInt = parseInt(rating, 10);

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        paper_id: paperId,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName || null,
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
