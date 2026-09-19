import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { mockAPI } from '../data/mockData';

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('assigned');
  const [assignedPapers, setAssignedPapers] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [reviewFormData, setReviewFormData] = useState({
    rating: '',
    recommendation: '',
    comments: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [alert, setAlert] = useState(null);
  const [reviewerNotifications, setReviewerNotifications] = useState([]);
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState('');
  const [reviewerSortBy, setReviewerSortBy] = useState('title_az');
  const [showAllReviewerPapers, setShowAllReviewerPapers] = useState(false);

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
    setSelectedPaper(paper);
    setReviewFormData({
      rating: '',
      recommendation: '',
      comments: '',
    });
    setShowReviewForm(true);
  };

  const handleReviewFormChange = (e) => {
    setReviewFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
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
        setAlert({ type: 'success', message: 'Review submitted successfully!' });
        setShowReviewForm(false);
        setSelectedPaper(null);
        loadReviewerData();
      } else {
        setAlert({ type: 'error', message: 'Failed to submit review. Please try again.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while submitting the review.' });
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

  const getReviewStats = () => {
    const pendingCount = assignedPapers.filter((paper) => {
      const reviewsForPaper = completedReviews.filter((review) => review.paperId === paper.id);
      const reviewCount = reviewsForPaper.length;
      const totalRounds = getRevisionRounds(paper);
      return reviewCount < totalRounds;
    }).length;

    const stats = {
      assigned: assignedPapers.length,
      completed: completedReviews.length,
      pending: pendingCount,
    };
    return stats;
  };

  const stats = getReviewStats();

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

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading your assignments..." />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="journal-container">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1>Reviewer Dashboard</h1>
            <p>Welcome back, <strong>{user.name}</strong>. Manage your review assignments with precision.</p>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div style={{ marginBottom: 18 }}>
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="stat-cards">
          <div className="stat-card">
            <p className="stat-label">Assigned Papers</p>
            <p className="stat-value">{stats.assigned}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Pending Reviews</p>
            <p className="stat-value">{stats.pending}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Completed Reviews</p>
            <p className="stat-value">{stats.completed}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="dash-tabs">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`dash-tab ${activeTab === 'assigned' ? 'is-active' : ''}`}
          >
            Assigned Papers ({stats.assigned})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`dash-tab ${activeTab === 'completed' ? 'is-active' : ''}`}
          >
            Completed Reviews ({stats.completed})
          </button>
        </div>

        {/* Assigned Papers */}
        {activeTab === 'assigned' && (
          <>
            <div className="search-bar">
              <input
                type="text"
                value={reviewerSearchTerm}
                onChange={(e) => setReviewerSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="form-input"
                style={{ flex: 1, minWidth: 220 }}
              />
              <select
                value={reviewerSortBy}
                onChange={(e) => setReviewerSortBy(e.target.value)}
                className="form-select"
                style={{ maxWidth: 180 }}
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title_az">Title A-Z</option>
                <option value="title_za">Title Z-A</option>
              </select>
              <button
                type="button"
                onClick={() => setShowAllReviewerPapers((prev) => !prev)}
                className="button button-outline button-small"
              >
                {showAllReviewerPapers ? 'Show unfinished only' : 'View all papers'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {visibleAssignedWithMeta.map(({ paper, reviewsForPaper, totalRounds, isCompleted, isRevisionRound }) => {
                const review = reviewsForPaper[0] || null;

                return (
                  <div key={`${paper.id}-${totalRounds}`} className="dash-panel">
                    <div className="dash-panel-head">
                      <h2>{paper.title}</h2>
                      <span className={`badge ${isCompleted ? 'badge-success' : isRevisionRound ? 'badge-info' : 'badge-warning'}`}>
                        {isCompleted ? 'REVIEWED' : isRevisionRound ? 'REVISION PENDING' : 'PENDING'}
                      </span>
                    </div>

                    <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--muted)' }}>
                      <div style={{ marginBottom: 4 }}>
                        <strong style={{ color: 'var(--ink)' }}>Authors: </strong>{paper.authors.join(', ')}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong style={{ color: 'var(--ink)' }}>Category: </strong>{paper.category}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong style={{ color: 'var(--ink)' }}>Submitted: </strong>{new Date(paper.submissionDate).toLocaleDateString()}
                      </div>
                      {paper.reviewDeadline && (
                        <div>
                          <strong style={{ color: 'var(--ink)' }}>Deadline: </strong>{new Date(paper.reviewDeadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: 10, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 12 }}>
                      {paper.abstract}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {paper.keywords.map((keyword, index) => (
                        <span key={index} className="badge badge-neutral">
                          {keyword}
                        </span>
                      ))}
                    </div>

                    {isCompleted && review && (
                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>Your Review Summary</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Rating: {review.rating}/5</span>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--ink)', margin: '0 0 6px' }}>
                          <strong>Recommendation:</strong> {review.recommendation.replace('_', ' ')}
                        </p>
                        <div className="contact-note">
                          {review.comments}
                        </div>
                      </div>
                    )}

                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => navigate(`/review/paper/${paper.id}`)}
                        className="button button-outline"
                        style={{ flex: 1 }}
                      >
                        View Manuscript
                      </button>
                      {!isCompleted && (
                        <button
                          onClick={() => handleStartReview(paper)}
                          className="button button-primary"
                          style={{ flex: 1 }}
                        >
                          Start Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Completed Reviews */}
        {activeTab === 'completed' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {completedReviews.map(review => {
              const paper = assignedPapers.find(p => p.id === review.paperId);
              if (!paper) return null;

              return (
                <div key={review.id} className="dash-panel">
                  <div className="dash-panel-head">
                    <h2>{paper.title}</h2>
                    <span className="badge badge-success">COMPLETED</span>
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--muted)' }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--ink)' }}>Authors: </strong>{paper.authors.join(', ')}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--ink)' }}>Submitted: </strong>{new Date(paper.submissionDate).toLocaleDateString()}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--ink)' }}>Reviewed On: </strong>{new Date(review.submittedDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>Rating</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            width="14"
                            height="14"
                            fill={i < review.rating ? '#eab308' : '#dce7ef'}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>({review.rating}/5)</span>
                      </div>
                    </div>

                    <p style={{ fontSize: 10, color: 'var(--ink)', margin: '0 0 10px' }}>
                      <strong>Recommendation:</strong> {review.recommendation.replace('_', ' ')}
                    </p>

                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Review Comments</p>
                      <div className="contact-note">
                        {review.comments}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'assigned' && assignedPapers.length === 0 && (
          <div className="dash-empty">
            <h3 style={{ color: 'var(--navy)', fontSize: 14, margin: '0 0 8px' }}>
              No Papers Assigned for Review
            </h3>
            <p style={{ maxWidth: 420, margin: '0 auto' }}>
              You will be notified when new papers are assigned to you. Thank you for your contribution to the academic review process.
            </p>
          </div>
        )}

        {activeTab === 'completed' && completedReviews.length === 0 && (
          <div className="dash-empty">
            <h3 style={{ color: 'var(--navy)', fontSize: 14, margin: '0 0 8px' }}>
              No Completed Reviews Yet
            </h3>
            <p style={{ maxWidth: 420, margin: '0 auto' }}>
              Your completed reviews will appear here once you've submitted them. Start reviewing your assigned papers to build your review history.
            </p>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && selectedPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 720 }}>
              <div className="modal-panel-header">
                <h2>Submit Review</h2>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div className="contact-note" style={{ marginBottom: 18 }}>
                  <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: 8 }}>{selectedPaper.title}</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <strong>Authors:</strong> {selectedPaper.authors.join(', ')}
                    </div>
                    <div>
                      <strong>Category:</strong> {selectedPaper.category}
                    </div>
                    <div>
                      <strong>Submitted:</strong> {new Date(selectedPaper.submissionDate).toLocaleDateString()}
                    </div>
                    {selectedPaper.reviewDeadline && (
                      <div>
                        <strong>Deadline:</strong> {new Date(selectedPaper.reviewDeadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmitReview}>
                  <div className="form-group">
                    <label>Overall Rating (1-5)</label>
                    <select
                      name="rating"
                      value={reviewFormData.rating}
                      onChange={handleReviewFormChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select a rating</option>
                      <option value="1">1 - Poor</option>
                      <option value="2">2 - Below Average</option>
                      <option value="3">3 - Average</option>
                      <option value="4">4 - Good</option>
                      <option value="5">5 - Excellent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Recommendation</label>
                    <select
                      name="recommendation"
                      value={reviewFormData.recommendation}
                      onChange={handleReviewFormChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select a recommendation</option>
                      <option value="accept">Accept</option>
                      <option value="accept_with_revisions">Accept with Minor Revisions</option>
                      <option value="reject_with_revisions">Reject with Major Revisions</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Detailed Comments</label>
                    <textarea
                      name="comments"
                      value={reviewFormData.comments}
                      onChange={handleReviewFormChange}
                      className="form-textarea"
                      placeholder="Provide detailed feedback on the paper's strengths, weaknesses, and suggestions for improvement..."
                      rows="6"
                      required
                    />
                    <p className="form-hint">
                      Your comments will help authors improve their work and assist editors in making informed decisions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="button button-primary"
                      style={{ flex: 1 }}
                    >
                      {submittingReview ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <LoadingSpinner size="sm" text="" />
                          Submitting...
                        </span>
                      ) : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="button button-outline"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerDashboard;
