const { supabase } = require('../supabaseClient');

// Recipient lookups for workflow emails. All return [{ id, email, name }] and never throw.

const safe = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    console.error('[email] recipient lookup failed:', err.message || err);
    return [];
  }
};

const getAdminRecipients = () => safe(async () => {
  const { data, error } = await supabase.from('users').select('id, email, name').eq('role', 'admin');
  if (error) throw error;
  return data || [];
});

const getUserRecipients = (ids) => safe(async () => {
  const unique = Array.from(new Set((ids || []).filter((id) => id !== null && id !== undefined)));
  if (!unique.length) return [];
  const { data, error } = await supabase.from('users').select('id, email, name').in('id', unique);
  if (error) throw error;
  return data || [];
});

const getUserRecipient = async (id) => (await getUserRecipients([id]))[0] || null;

// Reviewers who submitted a review for the paper (same rule as review certificates).
const getPaperReviewerIds = (paperId) => safe(async () => {
  const { data, error } = await supabase.from('reviews').select('reviewer_id').eq('paper_id', paperId);
  if (error) throw error;
  return Array.from(new Set((data || []).map((r) => r.reviewer_id)));
});

// Reviewers assigned to the paper (whether or not they have reviewed yet).
const getAssignedReviewerIds = (paperId) => safe(async () => {
  const { data, error } = await supabase.from('review_assignments').select('reviewer_id').eq('paper_id', paperId);
  if (error) throw error;
  return Array.from(new Set((data || []).map((r) => r.reviewer_id)));
});

// The paper's submitting author: the linked account, or the corresponding author entered on the form.
const getPaperAuthorRecipient = async (paper) => {
  if (paper?.main_author_id) {
    const user = await getUserRecipient(paper.main_author_id);
    if (user) return user;
  }
  const rows = await safe(async () => {
    const { data, error } = await supabase
      .from('paper_authors')
      .select('full_name, email')
      .eq('paper_id', paper.id)
      .eq('is_corresponding', true)
      .limit(1);
    if (error) throw error;
    return data || [];
  });
  return rows[0]?.email ? { id: null, email: rows[0].email, name: rows[0].full_name } : null;
};

// Best-effort in-app notifications for several users.
const notifyInApp = async (userIds, { title, message, type = 'info' }) => {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').insert(ids.map((user_id) => ({ user_id, title, message, type })));
  if (error) console.error(`Error inserting "${title}" notifications`, error);
};

module.exports = {
  getAdminRecipients,
  getUserRecipients,
  getUserRecipient,
  getPaperReviewerIds,
  getAssignedReviewerIds,
  getPaperAuthorRecipient,
  notifyInApp,
};
