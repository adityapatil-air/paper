const express = require('express');
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Certificates are issued once a paper is published:
//   - review: to each reviewer who submitted a review for it
//   - author: to the submitting author
// Numbers are derived from the paper and the recipient, so the same certificate always
// carries the same number and can be checked against the database.

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

const certificateNumber = (type, paper, userId) => {
  const year = String(paper.publication_date || '').slice(0, 4) || new Date().getFullYear();
  return `IJEPA-${type === 'review' ? 'REV' : 'AUT'}-${year}-${String(paper.id).padStart(4, '0')}-${String(userId).padStart(3, '0')}`;
};

// Journal paper ID, e.g. IJEPA-2026-031 (same rule as src/components/ArticleCard.js): taken from
// the back-catalogue PDF name, otherwise IJEPA-<year>-<database id>.
const paperCode = (paper) => {
  const fromFile = String(paper.pdf_url || '').match(/IJEPA-\d{4}-\d{3,}/i);
  if (fromFile) return fromFile[0].toUpperCase();
  const year = String(paper.publication_date || '').slice(0, 4) || new Date().getFullYear();
  return `IJEPA-${year}-${String(paper.id).padStart(3, '0')}`;
};

// Issue the paper was published in, if it has been assigned to one.
const loadIssueFor = async (paperId) => {
  const { data: link } = await supabase.from('issue_papers').select('issue_id').eq('paper_id', paperId).limit(1).maybeSingle();
  if (!link) return null;
  const { data: issue } = await supabase.from('issues').select('volume, issue, month, year, title').eq('id', link.issue_id).maybeSingle();
  return issue || null;
};

// GET /api/certificates/mine - certificates the signed-in user can download
router.get('/mine', requireAuth, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const userId = req.user.id;
    const items = [];

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('paper_id, submitted_date')
      .eq('reviewer_id', userId);
    if (reviewsError) throw reviewsError;

    const reviewedIds = Array.from(new Set((reviews || []).map((r) => r.paper_id)));
    if (reviewedIds.length) {
      const { data: papers, error } = await supabase
        .from('papers')
        .select('id, title, publication_date')
        .in('id', reviewedIds)
        .eq('status', 'published');
      if (error) throw error;
      (papers || []).forEach((p) => items.push({ type: 'review', paperId: p.id, paperTitle: p.title, publicationDate: p.publication_date }));
    }

    const { data: authored, error: authoredError } = await supabase
      .from('papers')
      .select('id, title, publication_date')
      .eq('main_author_id', userId)
      .eq('status', 'published');
    if (authoredError) throw authoredError;
    (authored || []).forEach((p) => items.push({ type: 'author', paperId: p.id, paperTitle: p.title, publicationDate: p.publication_date }));

    return res.json({ success: true, certificates: items });
  } catch (err) {
    console.error('Error listing certificates', err);
    return res.status(500).json({ success: false, error: 'Failed to load certificates.' });
  }
});

// GET /api/certificates/:type/:paperId - one certificate, only for an eligible recipient
router.get('/:type/:paperId', requireAuth, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const { type } = req.params;
    const paperId = parseInt(req.params.paperId, 10);
    if (!['review', 'author'].includes(type) || Number.isNaN(paperId)) {
      return res.status(400).json({ success: false, error: 'Unknown certificate.' });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, authors, status, publication_date, main_author_id, doi, pdf_url')
      .eq('id', paperId)
      .maybeSingle();
    if (paperError) throw paperError;
    if (!paper || paper.status !== 'published') {
      return res.status(404).json({ success: false, error: 'A certificate is available once the paper is published.' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, affiliation')
      .eq('id', req.user.id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) return res.status(404).json({ success: false, error: 'Account not found.' });

    let reviewDate = null;
    if (type === 'review') {
      const { data: review } = await supabase
        .from('reviews')
        .select('submitted_date')
        .eq('paper_id', paperId)
        .eq('reviewer_id', user.id)
        .order('submitted_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!review) return res.status(403).json({ success: false, error: 'Only reviewers of this paper can download this certificate.' });
      reviewDate = review.submitted_date;
    } else if (paper.main_author_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Only the author of this paper can download this certificate.' });
    }

    const issue = await loadIssueFor(paperId);

    return res.json({
      success: true,
      certificate: {
        type,
        number: certificateNumber(type, paper, user.id),
        recipientName: user.name,
        recipientAffiliation: user.affiliation || null,
        paperTitle: paper.title,
        paperCode: paperCode(paper),
        authors: paper.authors || [],
        publicationDate: paper.publication_date,
        reviewDate,
        doi: paper.doi || null,
        issue,
      },
    });
  } catch (err) {
    console.error('Error loading certificate', err);
    return res.status(500).json({ success: false, error: 'Failed to load the certificate.' });
  }
});

module.exports = router;
