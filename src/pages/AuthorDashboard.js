import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { mockAPI } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

const AuthorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const navigate = useNavigate();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [authorSearchTerm, setAuthorSearchTerm] = useState('');
  const [authorSortBy, setAuthorSortBy] = useState('recent');
  const [showAllAuthorPapers, setShowAllAuthorPapers] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    keywords: '',
    category: '',
    wordCount: '',
    pdfFile: null
  });
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [revisionModalPaper, setRevisionModalPaper] = useState(null);
  const [revisionFile, setRevisionFile] = useState(null);
  const [revisionUploading, setRevisionUploading] = useState(false);

  useEffect(() => {
    loadAuthorPapers();
    loadNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAuthorPapers = async () => {
    try {
      setLoading(true);
      const allPapers = await mockAPI.getAllPapers();
      const authorPapers = allPapers.filter(paper =>
        paper.authors.some(author => author.includes(user.name.split(' ')[0]))
      );
      setPapers(authorPapers);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const data = await mockAPI.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationClick = async (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    try {
      await mockAPI.markNotificationRead(notificationId);
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

    try {
      await mockAPI.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleUploadFormChange = (e) => {
    const { name, value, files } = e.target;
    setUploadFormData({
      ...uploadFormData,
      [name]: files ? files[0] : value
    });
  };

  const handleSubmitPaper = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const paperData = {
        title: uploadFormData.title,
        authors: uploadFormData.authors.split(',').map(author => author.trim()),
        abstract: uploadFormData.abstract,
        keywords: uploadFormData.keywords.split(',').map(keyword => keyword.trim()),
        category: uploadFormData.category,
        wordCount: parseInt(uploadFormData.wordCount),
        submissionFee: 730,
        paymentStatus: 'pending'
      };

      const result = await mockAPI.submitPaper(paperData);
      if (result.success) {
        setAlert({ type: 'success', message: 'Paper submitted successfully!' });
        setShowUploadForm(false);
        setUploadFormData({
          title: '',
          authors: '',
          abstract: '',
          keywords: '',
          category: '',
          wordCount: '',
          pdfFile: null
        });
        loadAuthorPapers();
      } else {
        setAlert({ type: 'error', message: 'Failed to submit paper. Please try again.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while submitting the paper.' });
    } finally {
      setUploading(false);
    }
  };

  /*
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (paperId) => {
    const res = await loadRazorpay();

    if (!res) {
      setAlert({ type: 'error', message: 'Razorpay SDK failed to load. Are you online?' });
      return;
    }

    try {
      const paper = papers.find(p => p.id === paperId);
      if (!paper) return;

      const key = await mockAPI.getRazorpayKey();
      if (!key) {
        setAlert({ type: 'error', message: 'Failed to load payment configuration.' });
        return;
      }

      const result = await mockAPI.createPaymentOrder(paperId, 150);

      if (!result.success) {
        setAlert({ type: 'error', message: result.error || 'Failed to initiate payment.' });
        return;
      }

      const { amount, id: order_id, currency } = result.order;

      const options = {
        key: key,
        amount: amount.toString(),
        currency: currency,
        name: "Research Paper Submission",
        description: `Submission Fee for ${paper.title}`,
        order_id: order_id,
        handler: async function (response) {
          const data = {
            orderCreationId: order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            paperId: paperId
          };

          const verifyResult = await mockAPI.verifyPayment(data);

          if (verifyResult.success) {
            setAlert({ type: 'success', message: 'Payment processed successfully!' });
            loadAuthorPapers();
          } else {
            setAlert({ type: 'error', message: verifyResult.error || 'Payment verification failed.' });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: "",
        },
        theme: {
          color: "#b45309",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'Payment failed. Please try again.' });
    }
  };
  */

  const handlePayment = async (_paperId) => {
    const hostedPaymentLink = 'https://rzp.io/rzp/dOBF1Tdq';
    window.open(hostedPaymentLink, '_blank', 'noopener,noreferrer');
  };


  const handleRevisionFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setRevisionFile(file);
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();

    if (!revisionModalPaper || !revisionFile) {
      setAlert({ type: 'error', message: 'Please choose a revised manuscript file before submitting.' });
      return;
    }

    setRevisionUploading(true);
    try {
      const result = await mockAPI.uploadRevision(revisionModalPaper.id, user.id, revisionFile);
      if (result.success) {
        setAlert({ type: 'success', message: 'Revised manuscript uploaded successfully.' });
        setRevisionModalPaper(null);
        setRevisionFile(null);
        loadAuthorPapers();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to upload revised manuscript.' });
      }
    } catch (error) {
      console.error('Error uploading revised manuscript:', error);
      setAlert({ type: 'error', message: 'An error occurred while uploading the revised manuscript.' });
    } finally {
      setRevisionUploading(false);
    }
  };

  const getStatusStats = () => {
    const stats = {
      submitted: papers.filter(p => p.status === 'submitted').length,
      under_review: papers.filter(p => p.status === 'under_review').length,
      published: papers.filter(p => p.status === 'published').length,
      rejected: papers.filter(p => p.status === 'rejected').length
    };
    return stats;
  };

  const stats = getStatusStats();

  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  const searchTerm = authorSearchTerm.trim().toLowerCase();

  const matchesAuthorSearch = (paper) => {
    if (!searchTerm) return true;

    const title = (paper.title || '').toLowerCase();
    const abstract = (paper.abstract || '').toLowerCase();
    const category = (paper.category || '').toLowerCase();
    const authorsText = Array.isArray(paper.authors) ? paper.authors.join(' ').toLowerCase() : String(paper.authors || '').toLowerCase();

    return (
      title.includes(searchTerm) ||
      abstract.includes(searchTerm) ||
      category.includes(searchTerm) ||
      authorsText.includes(searchTerm)
    );
  };

  const unfinishedStatuses = ['submitted', 'under_review', 'revisions_requested'];

  let visibleAuthorPapers = (papers || []).filter(matchesAuthorSearch);

  if (!showAllAuthorPapers) {
    visibleAuthorPapers = visibleAuthorPapers.filter(paper => unfinishedStatuses.includes(paper.status));
  }

  visibleAuthorPapers = [...visibleAuthorPapers].sort((a, b) => {
    if (authorSortBy === 'title_az') {
      return (a.title || '').localeCompare(b.title || '');
    }

    if (authorSortBy === 'title_za') {
      return (b.title || '').localeCompare(a.title || '');
    }

    const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);
    const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);

    if (authorSortBy === 'oldest') {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your papers..." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-academic-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-academic-900 mb-3 leading-tight">
              Author Dashboard
            </h1>
            <p className="text-academic-600 text-lg">
              Welcome back, <span className="font-medium">{user.name}</span>. Track your research submissions and manage your academic portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNotificationsModal(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-academic-200 rounded-lg shadow-sm text-sm font-medium text-academic-700 hover:bg-academic-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5 text-academic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotificationsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-amber-700 text-white rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
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

        {showNotificationsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-academic-900">Notifications</h2>
                  <button
                    type="button"
                    onClick={() => setShowNotificationsModal(false)}
                    className="text-academic-400 hover:text-academic-600"
                  >
                    &times;
                  </button>
                </div>

                {notificationsLoading ? (
                  <p className="text-sm text-academic-500">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-academic-500">You have no notifications.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors duration-200 ${notification.read
                          ? 'bg-academic-50 border-academic-100 text-academic-600'
                          : 'bg-white border-amber-100 text-academic-700 hover:bg-amber-50'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">
                                {notification.title}
                              </span>
                              {notification.timestamp && (
                                <span className="text-xs text-academic-400">
                                  {new Date(notification.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-xs">
                              {notification.message}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="ml-2 text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-xl">
                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Submitted</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.submitted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Under Review</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.under_review}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Published</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.published}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-red-50 rounded-xl">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-academic-500 uppercase tracking-wide">Rejected</p>
                <p className="text-3xl font-bold text-academic-900 mt-1">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-10">
          <button
            onClick={() => navigate('/submitform')}
            className="btn-glow"
          >
            <strong>Submit New Paper</strong>
          </button>
        </div>

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-academic-900">Submit New Paper</h2>
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="text-academic-400 hover:text-academic-600 hover:bg-academic-100 rounded-full p-2 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmitPaper} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Paper Title</label>
                    <input
                      type="text"
                      name="title"
                      value={uploadFormData.title}
                      onChange={handleUploadFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                      placeholder="Enter paper title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Authors (comma-separated)</label>
                    <input
                      type="text"
                      name="authors"
                      value={uploadFormData.authors}
                      onChange={handleUploadFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                      placeholder="Author 1, Author 2, Author 3"
                      required
                    />
                    <p className="mt-1 text-xs text-academic-500">Include all contributing authors in order of contribution</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Abstract</label>
                    <textarea
                      name="abstract"
                      value={uploadFormData.abstract}
                      onChange={handleUploadFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200 resize-none"
                      placeholder="Enter paper abstract (150-300 words)"
                      rows="6"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      name="keywords"
                      value={uploadFormData.keywords}
                      onChange={handleUploadFormChange}
                      className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                      placeholder="keyword1, keyword2, keyword3"
                      required
                    />
                    <p className="mt-1 text-xs text-academic-500">3-8 keywords that best represent your paper</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-academic-700 mb-2">Category</label>
                      <select
                        name="category"
                        value={uploadFormData.category}
                        onChange={handleUploadFormChange}
                        className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Environmental Science">Environmental Science</option>
                        <option value="Biomedical Engineering">Biomedical Engineering</option>
                        <option value="Physics">Physics</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Chemistry">Chemistry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-academic-700 mb-2">Word Count</label>
                      <input
                        type="number"
                        name="wordCount"
                        value={uploadFormData.wordCount}
                        onChange={handleUploadFormChange}
                        className="w-full px-4 py-3 border border-academic-300 rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition-colors duration-200"
                        placeholder="e.g., 5000"
                        min="500"
                        required
                      />
                      <p className="mt-1 text-xs text-academic-500">Minimum 500 words</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">PDF File</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-academic-300 border-dashed rounded-lg hover:border-academic-400 transition-colors duration-200">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-academic-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-academic-600">
                          <label className="relative cursor-pointer rounded-md font-medium text-amber-700 hover:text-amber-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-amber-700">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              name="pdfFile"
                              accept=".pdf"
                              onChange={handleUploadFormChange}
                              className="sr-only"
                              required
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-academic-500">PDF up to 20MB</p>
                        {uploadFormData.pdfFile && (
                          <p className="text-sm text-green-600 font-medium">
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            {uploadFormData.pdfFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-academic-50 p-5 rounded-xl border border-academic-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          <p>Submission fee: <strong className="text-lg text-amber-700">₹730</strong></p>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-academic-900">Submission Information</h3>
                        <div className="mt-2 text-sm text-academic-600">
                          <p className="mt-1">Payment is required to initiate the review process. You can pay immediately after submission.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 py-3 px-4 bg-amber-700 hover:bg-amber-800 disabled:bg-amber-500 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2 flex items-center justify-center"
                    >
                      {uploading ? (
                        <span className="flex items-center">
                          <LoadingSpinner size="sm" text="" />
                          <span className="ml-2">Submitting...</span>
                        </span>
                      ) : 'Submit Paper'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
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

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-academic-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('submissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'submissions'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-academic-500 hover:text-academic-700 hover:border-academic-300'
                  }`}
              >
                All Submissions ({papers.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'pending'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-academic-500 hover:text-academic-700 hover:border-academic-300'
                  }`}
              >
                Pending Payment ({stats.submitted})
              </button>
            </nav>
          </div>
        </div>

        {/* Papers List */}
        {activeTab === 'submissions' && (
          <>
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <input
                type="text"
                value={authorSearchTerm}
                onChange={(e) => setAuthorSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="w-full md:max-w-md px-4 py-2 border border-academic-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700 text-sm"
              />
              <div className="flex items-center gap-3">
                <select
                  value={authorSortBy}
                  onChange={(e) => setAuthorSortBy(e.target.value)}
                  className="px-3 py-2 border border-academic-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-amber-700"
                >
                  <option value="recent">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title_az">Title A-Z</option>
                  <option value="title_za">Title Z-A</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowAllAuthorPapers(prev => !prev)}
                  className="px-3 py-2 border border-academic-200 rounded-lg bg-white text-sm font-medium text-academic-700 hover:bg-academic-50"
                >
                  {showAllAuthorPapers ? 'Show unfinished only' : 'View all papers'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visibleAuthorPapers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-academic-900 line-clamp-2 leading-tight">
                      {paper.title}
                    </h3>
                    <span className={`${paper.status === 'published' ? 'badge-success' :
                      paper.status === 'under_review' ? 'badge-warning' :
                        paper.status === 'submitted' ? 'badge-info' :
                          'badge-danger'
                      }`}>
                      {paper.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium text-academic-700 text-sm w-20">Authors:</span>
                      <span className="text-sm text-academic-600">{paper.authors.join(', ')}</span>
                    </div>

                    <div className="flex items-center">
                      <span className="font-medium text-academic-700 text-sm w-20">Submitted:</span>
                      <span className="text-sm text-academic-600">{new Date(paper.submissionDate).toLocaleDateString()}</span>
                    </div>
                    {paper.publicationDate && (
                      <div className="flex items-center">
                        <span className="font-medium text-academic-700 text-sm w-20">Published:</span>
                        <span className="text-sm text-academic-600">{new Date(paper.publicationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-5">
                    <p className="text-academic-700 text-sm leading-relaxed line-clamp-3">
                      {paper.abstract}
                    </p>
                  </div>

                  {paper.pdfUrl && (
                    <div className="mb-5">
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-academic-100 hover:bg-academic-200 text-academic-700 text-xs font-medium rounded-lg border border-black transition-colors duration-200"
                      >
                        View Manuscript (latest version)
                      </a>
                    </div>
                  )}

                  {paper.status === 'submitted' && paper.paymentStatus === 'pending' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-academic-600 font-medium">
                            Submission fee: <span className="text-lg font-bold text-primary-600">₹1500</span>
                          </span>
                          <p className="text-xs text-academic-500 mt-1">Complete payment to initiate review</p>
                        </div>
                        <button
                          onClick={() => handlePayment(paper.id)}
                          className="Btn"
                        >
                          <svg className="svgIcon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M2 6L12 13L22 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                          Pay Now
                        </button>
                      </div>
                    </div>
                  )}

                  {paper.status === 'submitted' && paper.paymentStatus === 'paid' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span className="text-sm text-green-600 font-medium">Payment completed</span>
                        </div>
                        <span className="text-sm text-academic-500">
                          Awaiting reviewer assignment
                        </span>
                      </div>
                    </div>
                  )}

                  {paper.status === 'under_review' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span className="text-sm text-academic-600">Currently under review</span>
                        </div>
                        {paper.reviewDeadline && (
                          <p className="text-xs text-academic-500">
                            Estimated completion: {new Date(paper.reviewDeadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {paper.status === 'revisions_requested' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z"></path>
                          </svg>
                          <span className="text-sm text-academic-700 font-medium">Revisions requested - please upload a revised manuscript.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionModalPaper(paper);
                            setRevisionFile(null);
                          }}
                          className="btn-glow mt-1"
                        >
                          <strong>Upload Revised</strong>
                        </button>
                      </div>
                    </div>
                  )}

                  {paper.status === 'published' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-sm text-green-600 font-medium">Congratulations! Your paper has been published.</span>
                      </div>
                      {paper.doi && (
                        <p className="text-xs text-academic-600 mt-1">
                          DOI: {paper.doi}
                        </p>
                      )}
                    </div>
                  )}

                  {paper.status === 'rejected' && (
                    <div className="pt-4 border-t border-academic-200">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-sm text-red-600">This paper was not accepted for publication.</span>
                      </div>
                      <p className="text-xs text-academic-500 mt-1">
                        Consider revising based on feedback and resubmitting.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'pending' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {papers.filter(paper => paper.status === 'submitted' && paper.paymentStatus === 'pending').map(paper => (
              <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 hover:shadow-md transition-all duration-300">
                <h3 className="text-lg font-semibold text-academic-900 mb-4 line-clamp-2">
                  {paper.title}
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-academic-600 font-medium">
                      Submission fee: <span className="text-lg font-bold text-primary-600">$150</span>
                    </p>
                    <p className="text-xs text-academic-500 mt-1">
                      Submitted on {new Date(paper.submissionDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-academic-500 mt-1">
                      Complete payment to initiate review process
                    </p>
                  </div>
                  <button
                    onClick={() => handlePayment(paper.id)}
                    className="Btn"
                  >
                    <svg className="svgIcon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M2 6L12 13L22 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {papers.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-academic-200">
            <div className="text-academic-300 text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-academic-700 mb-2">
              No Papers Submitted Yet
            </h3>
            <p className="text-academic-500 max-w-md mx-auto mb-6">
              Start your academic journey by submitting your first research paper. We're excited to review your work!
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
            >
              Submit Your First Paper
            </button>
          </div>
        )}

        {/* Revision Upload Modal */}
        {revisionModalPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-academic-900">Upload Revised Manuscript</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setRevisionModalPaper(null);
                      setRevisionFile(null);
                    }}
                    className="text-academic-400 hover:text-academic-600"
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-4 p-4 bg-academic-50 rounded-lg border border-academic-200">
                  <h3 className="font-semibold text-academic-900 mb-1 line-clamp-2">{revisionModalPaper.title}</h3>
                  <p className="text-xs text-academic-600">
                    Upload a revised version of your manuscript in response to reviewer/editor comments.
                  </p>
                </div>

                <form onSubmit={handleSubmitRevision} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-academic-700 mb-2">
                      Revised Manuscript (PDF)
                    </label>
                    <div className="mt-1 flex justify-center px-4 pt-5 pb-6 border-2 border-dashed border-academic-300 rounded-lg hover:border-academic-400 transition-colors duration-200">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-10 w-10 text-academic-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-academic-600 justify-center">
                          <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                            <span>Select file</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleRevisionFileChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-academic-500">PDF format only, up to 20MB.</p>
                        {revisionFile && (
                          <p className="text-xs text-green-700 mt-1">
                            Selected file: <span className="font-medium">{revisionFile.name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={revisionUploading || !revisionFile}
                      className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                      {revisionUploading ? 'Uploading...' : 'Submit Revised Manuscript'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRevisionModalPaper(null);
                        setRevisionFile(null);
                      }}
                      className="flex-1 py-2 px-4 bg-academic-200 hover:bg-academic-300 text-academic-700 text-sm font-medium rounded-lg transition-colors duration-200"
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

export default AuthorDashboard;