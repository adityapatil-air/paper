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
      <div className="min-h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your assignments..." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-academic-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-academic-900 mb-3 leading-tight">
            Reviewer Dashboard
          </h1>
          <p className="text-academic-600 text-lg">
            Welcome back, <span className="font-medium">{user.name}</span>. Manage your review assignments with precision.
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div className="mb-8">
            <Alert 
              type={alert.type} 
              message={alert.message} 
              onClose={() => setAlert(null)} 
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-xl">
                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Assigned Papers</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.assigned}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Pending Reviews</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Completed Reviews</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-academic-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('assigned')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'assigned'
                    ? 'border-amber-700 text-amber-700'
                    : 'border-transparent text-academic-500 hover:text-academic-700 hover:border-academic-300'
                }`}
              >
                Assigned Papers ({stats.assigned})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'completed'
                    ? 'border-amber-700 text-amber-700'
                    : 'border-transparent text-academic-500 hover:text-academic-700 hover:border-academic-300'
                }`}
              >
                Completed Reviews ({stats.completed})
              </button>
            </nav>
          </div>
        </div>

        {/* Assigned Papers */}
        {activeTab === 'assigned' && (
          <>
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <input
                type="text"
                value={reviewerSearchTerm}
                onChange={(e) => setReviewerSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="w-full md:max-w-md px-4 py-2 border border-academic-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 text-sm"
              />
              <div className="flex items-center gap-3">
                <select
                  value={reviewerSortBy}
                  onChange={(e) => setReviewerSortBy(e.target.value)}
                  className="px-3 py-2 border border-academic-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700"
                >
                  <option value="recent">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title_az">Title A-Z</option>
                  <option value="title_za">Title Z-A</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowAllReviewerPapers((prev) => !prev)}
                  className="px-3 py-2 border border-academic-200 rounded-lg bg-white text-sm font-medium text-academic-700 hover:bg-academic-50"
                >
                  {showAllReviewerPapers ? 'Show unfinished only' : 'View all papers'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleAssignedWithMeta.map(({ paper, reviewsForPaper, totalRounds, reviewCount, isCompleted, isRevisionRound }) => {
                const review = reviewsForPaper[0] || null;

                return (
                  <div key={`${paper.id}-${totalRounds}`} className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-academic-900 line-clamp-2 leading-tight">
                        {paper.title}
                      </h3>
                      <span className={`${
                        isCompleted
                          ? 'badge-success'
                          : isRevisionRound
                            ? 'badge-info'
                            : 'badge-warning'
                      }`}>
                        {isCompleted
                          ? 'REVIEWED'
                          : isRevisionRound
                            ? 'REVISION PENDING'
                            : 'PENDING'}
                      </span>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center">
                        <span className="font-medium text-academic-700 text-sm w-20">Authors:</span>
                        <span className="text-sm text-academic-600">{paper.authors.join(', ')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-academic-700 text-sm w-20">Category:</span>
                        <span className="text-sm text-academic-600">{paper.category}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-academic-700 text-sm w-20">Submitted:</span>
                        <span className="text-sm text-academic-600">{new Date(paper.submissionDate).toLocaleDateString()}</span>
                      </div>
                      {paper.reviewDeadline && (
                        <div className="flex items-center">
                          <span className="font-medium text-academic-700 text-sm w-20">Deadline:</span>
                          <span className="text-sm text-academic-600">{new Date(paper.reviewDeadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-5">
                      <p className="text-academic-700 text-sm leading-relaxed line-clamp-3">
                        {paper.abstract}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {paper.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-academic-100 text-academic-700 text-xs rounded-full font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    {isCompleted && review && (
                      <div className="pt-4 border-t border-academic-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-academic-600">Your Review Summary</span>
                          <span className="text-sm text-academic-500 font-medium">
                            Rating: {review.rating}/5
                          </span>
                        </div>
                        <p className="text-sm text-academic-600 mb-2">
                          <span className="font-medium">Recommendation:</span> <span className="font-semibold capitalize">
                            {review.recommendation.replace('_', ' ')}
                          </span>
                        </p>
                        <p className="text-sm text-academic-700 line-clamp-2 bg-academic-50 p-3 rounded-md">
                          {review.comments}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-academic-200 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => navigate(`/review/paper/${paper.id}`)}
                        className="flex-1 py-3 px-4 bg-academic-200 hover:bg-academic-300 text-academic-700 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-academic-500 focus:ring-offset-2"
                      >
                        View Manuscript
                      </button>
                      {!isCompleted && (
                        <button
                          onClick={() => handleStartReview(paper)}
                          className="Btn"
                        >
                          <strong>Start Review</strong>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedReviews.map(review => {
              const paper = assignedPapers.find(p => p.id === review.paperId);
              if (!paper) return null;

              return (
                <div key={review.id} className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-academic-900 line-clamp-2 leading-tight">
                      {paper.title}
                    </h3>
                    <span className="badge-success">
                      COMPLETED
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium text-academic-700 text-sm w-24">Authors:</span>
                      <span className="text-sm text-academic-600">{paper.authors.join(', ')}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-academic-700 text-sm w-24">Submitted:</span>
                      <span className="text-sm text-academic-600">{new Date(paper.submissionDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-academic-700 text-sm w-24">Reviewed On:</span>
                      <span className="text-sm text-academic-600">{new Date(review.submittedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-academic-200">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-academic-600">Rating</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-academic-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-2 text-sm text-academic-600 font-medium">({review.rating}/5)</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-academic-600">
                          <span className="font-medium">Recommendation:</span> 
                          <span className="ml-2 font-semibold capitalize">{review.recommendation.replace('_', ' ')}</span>
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-academic-600 mb-2">Review Comments</p>
                        <div className="bg-academic-50 p-4 rounded-lg border-l-4 border-academic-200">
                          <p className="text-sm text-academic-700 leading-relaxed">
                            {review.comments}
                          </p>
                        </div>
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
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-academic-200">
            <div className="text-academic-300 text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-academic-700 mb-2">
              No Papers Assigned for Review
            </h3>
            <p className="text-academic-500 max-w-md mx-auto">
              You will be notified when new papers are assigned to you. Thank you for your contribution to the academic review process.
            </p>
          </div>
        )}

        {activeTab === 'completed' && completedReviews.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-academic-200">
            <div className="text-academic-300 text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-academic-700 mb-2">
              No Completed Reviews Yet
            </h3>
            <p className="text-academic-500 max-w-md mx-auto">
              Your completed reviews will appear here once you've submitted them. Start reviewing your assigned papers to build your review history.
            </p>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && selectedPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-academic-900">Submit Review</h2>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="text-academic-400 hover:text-academic-600 hover:bg-academic-100 rounded-full p-2 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <div className="mb-8 p-5 bg-academic-50 rounded-xl border border-academic-200">
                  <h3 className="font-semibold text-academic-900 text-lg mb-3">{selectedPaper.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-academic-700">Authors:</span>
                      <p className="text-academic-600 mt-1">{selectedPaper.authors.join(', ')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-academic-700">Category:</span>
                      <p className="text-academic-600 mt-1">{selectedPaper.category}</p>
                    </div>
                    <div>
                      <span className="font-medium text-academic-700">Submitted:</span>
                      <p className="text-academic-600 mt-1">{new Date(selectedPaper.submissionDate).toLocaleDateString()}</p>
                    </div>
                    {selectedPaper.reviewDeadline && (
                      <div>
                        <span className="font-medium text-academic-700">Deadline:</span>
                        <p className="text-academic-600 mt-1">{new Date(selectedPaper.reviewDeadline).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Overall Rating (1-5)</label>
                    <select
                      name="rating"
                      value={reviewFormData.rating}
                      onChange={handleReviewFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
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

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Recommendation</label>
                    <select
                      name="recommendation"
                      value={reviewFormData.recommendation}
                      onChange={handleReviewFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                      required
                    >
                      <option value="">Select a recommendation</option>
                      <option value="accept">Accept</option>
                      <option value="accept_with_revisions">Accept with Minor Revisions</option>
                      <option value="reject_with_revisions">Reject with Major Revisions</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Detailed Comments</label>
                    <textarea
                      name="comments"
                      value={reviewFormData.comments}
                      onChange={handleReviewFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 resize-none"
                      placeholder="Provide detailed feedback on the paper's strengths, weaknesses, and suggestions for improvement..."
                      rows="6"
                      required
                    />
                    <p className="mt-2 text-xs text-academic-500">
                      Your comments will help authors improve their work and assist editors in making informed decisions.
                    </p>
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="Btn"
                    >
                      {submittingReview ? (
                        <span className="flex items-center">
                          <LoadingSpinner size="sm" text="" />
                          <span className="ml-2">Submitting...</span>
                        </span>
                      ) : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 py-3 px-4 bg-academic-200 hover:bg-academic-300 text-academic-700 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-academic-500 focus:ring-offset-2"
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