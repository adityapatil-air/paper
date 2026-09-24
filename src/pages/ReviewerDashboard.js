import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import { useToast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { Badge } from '../components/ui/StatusBadge';
import Stars, { RECOMMENDATIONS, recommendationLabel } from '../components/ui/Stars';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { DashHeader, StatCard, FilterBar, Segmented, TabList, TabPanel, SORT_OPTIONS, formatDate, joinAuthors } from '../components/ui/DashHeader';

const RATING_LABELS = { 1: 'Poor', 2: 'Below average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const EMPTY_REVIEW = { rating: '', recommendation: '', comments: '' };

const assignmentBadge = ({ isCompleted, isRevisionRound }) => {
  if (isCompleted) return <Badge tone="accepted" icon="check">Reviewed</Badge>;
  if (isRevisionRound) return <Badge tone="review" icon="refresh">Revision to review</Badge>;
  return <Badge tone="revision" icon="clock">Review pending</Badge>;
};

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('assigned');
  const [assignedPapers, setAssignedPapers] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [reviewFormData, setReviewFormData] = useState(EMPTY_REVIEW);
  const [reviewErrors, setReviewErrors] = useState({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewerNotifications, setReviewerNotifications] = useState([]);
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState('');
  const [reviewerSortBy, setReviewerSortBy] = useState('title_az');
  const [showAllReviewerPapers, setShowAllReviewerPapers] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [viewReview, setViewReview] = useState(null);

  const loadReviewerData = useCallback(async () => {
    try {
      setLoading(true);

      // Get assigned papers
      const allPapers = await mockAPI.getAllPapers();
      const assigned = allPapers.filter(paper =>
        paper.assignedReviewers && paper.assignedReviewers.includes(user.id)
      );
      setAssignedPapers(assigned);

      // Get completed reviews
      const reviews = await mockAPI.getReviewsByReviewer(user.id);
      setCompletedReviews(reviews);

      // Get reviewer notifications so we can detect revised manuscripts per paper
      const notifResult = await mockAPI.getNotifications(user.id);
      setReviewerNotifications(Array.isArray(notifResult) ? notifResult : []);
    } catch (error) {
      console.error('Error loading reviewer data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReviewerData();
  }, [loadReviewerData]);

  const handleStartReview = (paper) => {
    setDetailItem(null);
    setSelectedPaper(paper);
    setReviewFormData(EMPTY_REVIEW);
    setReviewErrors({});
    setShowReviewForm(true);
  };

  const closeReviewForm = () => {
    if (submittingReview) return;
    setShowReviewForm(false);
  };

  const setReviewField = (name, value) => {
    setReviewFormData((prev) => ({ ...prev, [name]: value }));
    if (reviewErrors[name]) setReviewErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateReview = () => {
    const next = {};
    if (!reviewFormData.rating) next.rating = 'Choose an overall rating.';
    if (!reviewFormData.recommendation) next.recommendation = 'Choose a recommendation.';
    if (!reviewFormData.comments.trim()) next.comments = 'Add your detailed comments for the author and editor.';
    setReviewErrors(next);
    const first = ['rating', 'recommendation', 'comments'].find((k) => next[k]);
    if (first) {
      setTimeout(() => {
        const el = first === 'comments'
          ? document.getElementById('review-comments')
          : document.querySelector(`input[name="${first}"]`);
        el?.focus();
      }, 0);
    }
    return !first;
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (submittingReview || !validateReview()) return;
    setSubmittingReview(true);

    try {
      const reviewData = {
        paperId: selectedPaper.id,
        reviewerId: user.id,
        reviewerName: user.name,
        rating: parseInt(reviewFormData.rating),
        recommendation: reviewFormData.recommendation,
        comments: reviewFormData.comments
      };

      const result = await mockAPI.submitReview(reviewData);
      if (result.success) {
        toast.success('Review submitted successfully.');
        setShowReviewForm(false);
        setSelectedPaper(null);
        loadReviewerData();
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred while submitting the review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getRevisionRounds = (paper) => {
    if (!paper || !paper.title || !Array.isArray(reviewerNotifications)) return 1;

    const revisionNotifs = reviewerNotifications.filter((n) =>
      n &&
      n.title === 'Revised manuscript uploaded' &&
      typeof n.message === 'string' &&
      n.message.includes(paper.title)
    );

    return 1 + revisionNotifs.length;
  };

  const assignedPapersWithMeta = (assignedPapers || []).map((paper) => {
    const reviewsForPaper = completedReviews.filter((review) => review.paperId === paper.id);
    const totalRounds = getRevisionRounds(paper);
    const reviewCount = reviewsForPaper.length;
    const isCompleted = reviewCount >= totalRounds;
    const isRevisionRound = !isCompleted && totalRounds > 1;

    return {
      paper,
      reviewsForPaper,
      totalRounds,
      reviewCount,
      isCompleted,
      isRevisionRound,
    };
  });

  const stats = {
    assigned: assignedPapers.length,
    completed: completedReviews.length,
    pending: assignedPapersWithMeta.filter((item) => !item.isCompleted).length,
  };

  const reviewerSearch = reviewerSearchTerm.trim().toLowerCase();

  const matchesReviewerSearch = (paper) => {
    if (!reviewerSearch) return true;

    const title = (paper.title || '').toLowerCase();
    const abstract = (paper.abstract || '').toLowerCase();
    const category = (paper.category || '').toLowerCase();
    const authorsText = Array.isArray(paper.authors) ? paper.authors.join(' ').toLowerCase() : String(paper.authors || '').toLowerCase();

    return (
      title.includes(reviewerSearch) ||
      abstract.includes(reviewerSearch) ||
      category.includes(reviewerSearch) ||
      authorsText.includes(reviewerSearch)
    );
  };

  let visibleAssignedWithMeta = assignedPapersWithMeta.filter(({ paper }) => matchesReviewerSearch(paper));

  if (!showAllReviewerPapers) {
    visibleAssignedWithMeta = visibleAssignedWithMeta.filter((item) => !item.isCompleted);
  }

  visibleAssignedWithMeta = [...visibleAssignedWithMeta].sort((a, b) => {
    const paperA = a.paper;
    const paperB = b.paper;

    if (reviewerSortBy === 'title_az') {
      return (paperA.title || '').localeCompare(paperB.title || '');
    }

    if (reviewerSortBy === 'title_za') {
      return (paperB.title || '').localeCompare(paperA.title || '');
    }

    const dateA = paperA.submissionDate ? new Date(paperA.submissionDate) : new Date(0);
    const dateB = paperB.submissionDate ? new Date(paperB.submissionDate) : new Date(0);

    if (reviewerSortBy === 'oldest') {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  const completedWithPaper = completedReviews
    .map((review) => ({ review, paper: assignedPapers.find((p) => p.id === review.paperId) }))
    .filter((row) => row.paper);

  if (loading) {
    return <DashboardSkeleton stats={3} label="Loading your assignments" />;
  }

  return (
    <div className="dash-page">
      <div className="journal-container">
        <DashHeader
          role="Reviewer"
          user={user}
          subtitle="Manage your review assignments and keep track of the reviews you have submitted."
          actions={stats.pending > 0 && (
            <button type="button" className="button button-primary" onClick={() => { setActiveTab('assigned'); setShowAllReviewerPapers(false); }}>
              <Icon name="clock" size={17} /> {stats.pending} review{stats.pending === 1 ? '' : 's'} pending
            </button>
          )}
        />

        <div className="stat-cards stat-cards-3">
          <StatCard label="Assigned papers" value={stats.assigned} icon="inbox" />
          <StatCard label="Pending reviews" value={stats.pending} icon="clock" tone="amber" />
          <StatCard label="Completed reviews" value={stats.completed} icon="checkCircle" tone="green" />
        </div>

        <TabList
          label="Your reviews"
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'assigned', label: 'Assigned papers', count: stats.assigned },
            { id: 'completed', label: 'Completed reviews', count: stats.completed },
          ]}
        />

        {activeTab === 'assigned' && (
          <TabPanel id="assigned">
            {assignedPapers.length === 0 ? (
              <EmptyState title="No papers assigned for review" variant="review">
                You’ll see papers here as soon as the editor assigns them to you. Thank you for contributing to the review process.
              </EmptyState>
            ) : (
              <>
                <FilterBar
                  search={reviewerSearchTerm}
                  onSearch={setReviewerSearchTerm}
                  placeholder="Search by title, author, category…"
                  label="Search assigned papers"
                  sort={reviewerSortBy}
                  onSort={setReviewerSortBy}
                  sortOptions={SORT_OPTIONS}
                >
                  <Segmented
                    label="Which assignments to show"
                    value={showAllReviewerPapers ? 'all' : 'open'}
                    onChange={(v) => setShowAllReviewerPapers(v === 'all')}
                    options={[{ value: 'open', label: 'To review' }, { value: 'all', label: 'All papers' }]}
                  />
                </FilterBar>

                {visibleAssignedWithMeta.length === 0 ? (
                  <EmptyState
                    compact
                    variant={reviewerSearch ? 'search' : 'review'}
                    title={reviewerSearch ? 'No papers match your search' : 'You’re all caught up'}
                    action={reviewerSearch ? (
                      <button type="button" className="button button-ghost button-small" onClick={() => setReviewerSearchTerm('')}>Clear search</button>
                    ) : (
                      <button type="button" className="button button-ghost button-small" onClick={() => setShowAllReviewerPapers(true)}>Show all papers</button>
                    )}
                  >
                    {reviewerSearch ? 'Try a different title, author or category.' : 'Every assigned paper has a submitted review.'}
                  </EmptyState>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption className="sr-only">Papers assigned to you</caption>
                      <thead>
                        <tr>
                          <th scope="col">Paper</th>
                          <th scope="col">Category</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">Deadline</th>
                          <th scope="col">Status</th>
                          <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAssignedWithMeta.map((item) => {
                          const { paper, totalRounds, isCompleted } = item;
                          return (
                            <tr key={`${paper.id}-${totalRounds}`}>
                              <td className="cell-primary">
                                <button type="button" className="cell-title-btn" onClick={() => setDetailItem(item)}>{paper.title}</button>
                                <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                              </td>
                              <td data-label="Category">{paper.category || '—'}</td>
                              <td data-label="Submitted" className="nowrap">{formatDate(paper.submissionDate)}</td>
                              <td data-label="Deadline" className="nowrap">{paper.reviewDeadline ? formatDate(paper.reviewDeadline) : '—'}</td>
                              <td data-label="Status">{assignmentBadge(item)}</td>
                              <td className="col-actions">
                                <div className="row-actions">
                                  <button type="button" onClick={() => navigate(`/review/paper/${paper.id}`)} className="icon-btn">
                                    <Icon name="fileText" size={15} /> Manuscript
                                  </button>
                                  {isCompleted ? (
                                    <button type="button" onClick={() => setDetailItem(item)} className="icon-btn">
                                      <Icon name="eye" size={15} /> Your review
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => handleStartReview(paper)} className="button button-primary button-small">
                                      <Icon name="edit" size={15} /> Start review
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </TabPanel>
        )}

        {activeTab === 'completed' && (
          <TabPanel id="completed">
            {completedWithPaper.length === 0 ? (
              <EmptyState
                title="No completed reviews yet"
                variant="review"
                action={stats.pending > 0 && (
                  <button type="button" className="button button-primary" onClick={() => setActiveTab('assigned')}>Go to assigned papers</button>
                )}
              >
                Your completed reviews will appear here once you’ve submitted them.
              </EmptyState>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="sr-only">Reviews you have submitted</caption>
                  <thead>
                    <tr>
                      <th scope="col">Paper</th>
                      <th scope="col">Reviewed on</th>
                      <th scope="col">Rating</th>
                      <th scope="col">Recommendation</th>
                      <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedWithPaper.map(({ review, paper }) => (
                      <tr key={review.id}>
                        <td className="cell-primary">
                          <button type="button" className="cell-title-btn" onClick={() => setViewReview({ review, paper })}>{paper.title}</button>
                          <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                        </td>
                        <td data-label="Reviewed on" className="nowrap">{formatDate(review.submittedDate)}</td>
                        <td data-label="Rating"><Stars rating={review.rating} /></td>
                        <td data-label="Recommendation">
                          <Badge tone={RECOMMENDATIONS[review.recommendation]?.tone || 'neutral'}>{recommendationLabel(review.recommendation)}</Badge>
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button type="button" className="icon-btn" onClick={() => setViewReview({ review, paper })}>
                              <Icon name="eye" size={15} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabPanel>
        )}
      </div>

      {/* Assigned paper details */}
      <Modal
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        size="lg"
        title={detailItem?.paper.title || ''}
        footer={detailItem && (
          <>
            <button type="button" className="button button-ghost footer-start" onClick={() => navigate(`/review/paper/${detailItem.paper.id}`)}>
              <Icon name="fileText" size={16} /> Open manuscript
            </button>
            <button type="button" className="button button-ghost" onClick={() => setDetailItem(null)}>Close</button>
            {!detailItem.isCompleted && (
              <button type="button" className="button button-primary" onClick={() => handleStartReview(detailItem.paper)}>
                <Icon name="edit" size={16} /> Start review
              </button>
            )}
          </>
        )}
      >
        {detailItem && (
          <>
            <div className="dash-panel-head">{assignmentBadge(detailItem)}</div>
            <dl className="meta-list">
              <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(detailItem.paper.authors) || '—'}</dd></div>
              <div><dt>Category</dt><dd>{detailItem.paper.category || '—'}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDate(detailItem.paper.submissionDate)}</dd></div>
              {detailItem.paper.reviewDeadline && <div><dt>Deadline</dt><dd>{formatDate(detailItem.paper.reviewDeadline)}</dd></div>}
            </dl>
            {detailItem.paper.abstract && (
              <div className="detail-section">
                <h3>Abstract</h3>
                <p>{detailItem.paper.abstract}</p>
              </div>
            )}
            {Array.isArray(detailItem.paper.keywords) && detailItem.paper.keywords.length > 0 && (
              <div className="detail-section">
                <h3>Keywords</h3>
                <div className="chip-list">{detailItem.paper.keywords.map((k, i) => <span key={`${k}-${i}`} className="chip">{k}</span>)}</div>
              </div>
            )}
            {detailItem.isCompleted && detailItem.reviewsForPaper[0] && (
              <div className="detail-section">
                <h3>Your review summary</h3>
                <div className="review-card">
                  <div className="review-card-head">
                    <Stars rating={detailItem.reviewsForPaper[0].rating} />
                    <Badge tone={RECOMMENDATIONS[detailItem.reviewsForPaper[0].recommendation]?.tone || 'neutral'}>
                      {recommendationLabel(detailItem.reviewsForPaper[0].recommendation)}
                    </Badge>
                  </div>
                  <p>{detailItem.reviewsForPaper[0].comments}</p>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Completed review */}
      <Modal
        open={Boolean(viewReview)}
        onClose={() => setViewReview(null)}
        title={viewReview?.paper.title || ''}
        description={viewReview ? `Reviewed on ${formatDate(viewReview.review.submittedDate)}` : undefined}
        footer={<button type="button" className="button button-ghost" onClick={() => setViewReview(null)}>Close</button>}
      >
        {viewReview && (
          <>
            <dl className="meta-list">
              <div><dt>Rating</dt><dd><Stars rating={viewReview.review.rating} /></dd></div>
              <div>
                <dt>Recommendation</dt>
                <dd><Badge tone={RECOMMENDATIONS[viewReview.review.recommendation]?.tone || 'neutral'}>{recommendationLabel(viewReview.review.recommendation)}</Badge></dd>
              </div>
              <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(viewReview.paper.authors)}</dd></div>
            </dl>
            <div className="detail-section">
              <h3>Review comments</h3>
              <p>{viewReview.review.comments}</p>
            </div>
          </>
        )}
      </Modal>

      {/* Review form */}
      <Modal
        open={showReviewForm && Boolean(selectedPaper)}
        onClose={closeReviewForm}
        closeDisabled={submittingReview}
        size="lg"
        title="Submit review"
        description={selectedPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeReviewForm} className="button button-ghost" disabled={submittingReview}>Cancel</button>
            <button type="submit" form="review-form" disabled={submittingReview} className="button button-primary" aria-busy={submittingReview || undefined}>
              {submittingReview ? <><Spinner size="sm" /> Submitting…</> : <><Icon name="send" size={16} /> Submit review</>}
            </button>
          </>
        )}
      >
        {selectedPaper && (
          <form id="review-form" onSubmit={handleSubmitReview} noValidate>
            <div className="paper-ref">
              <dl className="meta-list">
                <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(selectedPaper.authors)}</dd></div>
                <div><dt>Category</dt><dd>{selectedPaper.category || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(selectedPaper.submissionDate)}</dd></div>
                {selectedPaper.reviewDeadline && <div><dt>Deadline</dt><dd>{formatDate(selectedPaper.reviewDeadline)}</dd></div>}
              </dl>
            </div>

            <fieldset className="field choice-fieldset" aria-describedby={reviewErrors.rating ? 'rating-error' : undefined}>
              <legend className="label-text">Overall rating<span className="req" aria-hidden="true">*</span></legend>
              <div className="rating-group">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={`rating-choice${String(reviewFormData.rating) === String(n) ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={String(reviewFormData.rating) === String(n)}
                      onChange={() => setReviewField('rating', String(n))}
                    />
                    <strong>{n}</strong>
                    <span>{RATING_LABELS[n]}</span>
                  </label>
                ))}
              </div>
              {reviewErrors.rating && <p className="field-error" id="rating-error"><Icon name="alert" size={15} />{reviewErrors.rating}</p>}
            </fieldset>

            <fieldset className="field choice-fieldset" aria-describedby={reviewErrors.recommendation ? 'recommendation-error' : undefined}>
              <legend className="label-text">Recommendation<span className="req" aria-hidden="true">*</span></legend>
              <div className="choice-list">
                {Object.entries(RECOMMENDATIONS).map(([value, meta]) => (
                  <label key={value} className={`choice-card${reviewFormData.recommendation === value ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="recommendation"
                      value={value}
                      checked={reviewFormData.recommendation === value}
                      onChange={() => setReviewField('recommendation', value)}
                    />
                    <span>{meta.label}</span>
                  </label>
                ))}
              </div>
              {reviewErrors.recommendation && <p className="field-error" id="recommendation-error"><Icon name="alert" size={15} />{reviewErrors.recommendation}</p>}
            </fieldset>

            <div className="field">
              <div className="field-label">
                <label htmlFor="review-comments">Detailed comments<span className="req" aria-hidden="true">*</span></label>
              </div>
              <textarea
                id="review-comments"
                name="comments"
                value={reviewFormData.comments}
                onChange={(e) => setReviewField('comments', e.target.value)}
                className={`form-textarea${reviewErrors.comments ? ' is-invalid' : ''}`}
                placeholder="Strengths, weaknesses and specific suggestions for improvement…"
                rows={7}
                aria-invalid={reviewErrors.comments ? true : undefined}
                aria-describedby={[reviewErrors.comments ? 'comments-error' : null, 'comments-hint'].filter(Boolean).join(' ')}
              />
              {reviewErrors.comments && <p className="field-error" id="comments-error"><Icon name="alert" size={15} />{reviewErrors.comments}</p>}
              <p className="field-hint" id="comments-hint">Your comments help authors improve their work and help editors make informed decisions.</p>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ReviewerDashboard;
