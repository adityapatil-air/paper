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

  const statusBadgeClass = (status) => {
    if (status === 'published') return 'badge badge-success';
    if (status === 'under_review') return 'badge badge-warning';
    if (status === 'submitted') return 'badge badge-info';
    if (status === 'revisions_requested') return 'badge badge-warning';
    return 'badge badge-danger';
  };

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading your papers..." />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="journal-container">
        <div className="dash-header">
          <div>
            <h1>Author Dashboard</h1>
            <p>Welcome back, <strong>{user.name}</strong>. Track your research submissions and manage your academic portfolio.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNotificationsModal(true)}
            className="icon-btn"
          >
            Notifications
            {unreadNotificationsCount > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 6 }}>
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>

        {alert && (
          <div style={{ marginBottom: 18 }}>
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {showNotificationsModal && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div className="modal-panel-header">
                <h2>Notifications</h2>
                <button
                  type="button"
                  onClick={() => setShowNotificationsModal(false)}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>
              <div className="modal-panel-body">
                {notificationsLoading ? (
                  <p style={{ color: 'var(--muted)', fontSize: 11 }}>Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <div className="dash-empty">You have no notifications.</div>
                ) : (
                  <div>
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className="page-card"
                        style={{
                          cursor: 'pointer',
                          marginBottom: 10,
                          background: notification.read ? '#f4f9fc' : '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--ink)' }}>
                                {notification.title}
                              </span>
                              {notification.timestamp && (
                                <span style={{ fontSize: 8, color: 'var(--muted)' }}>
                                  {new Date(notification.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 9, color: 'var(--muted)' }}>
                              {notification.message}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="icon-btn"
                            style={{ flexShrink: 0 }}
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
        <div className="stat-cards">
          <div className="stat-card">
            <p className="stat-label">Submitted</p>
            <p className="stat-value">{stats.submitted}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Under Review</p>
            <p className="stat-value">{stats.under_review}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Published</p>
            <p className="stat-value">{stats.published}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Rejected</p>
            <p className="stat-value">{stats.rejected}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: 22 }}>
          <button
            onClick={() => navigate('/submitform')}
            className="button button-primary"
          >
            Submit New Paper
          </button>
        </div>

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 720 }}>
              <div className="modal-panel-header">
                <h2>Submit New Paper</h2>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <form onSubmit={handleSubmitPaper}>
                  <div className="form-group">
                    <label>Paper Title</label>
                    <input
                      type="text"
                      name="title"
                      value={uploadFormData.title}
                      onChange={handleUploadFormChange}
                      className="form-input"
                      placeholder="Enter paper title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Authors (comma-separated)</label>
                    <input
                      type="text"
                      name="authors"
                      value={uploadFormData.authors}
                      onChange={handleUploadFormChange}
                      className="form-input"
                      placeholder="Author 1, Author 2, Author 3"
                      required
                    />
                    <p className="form-hint">Include all contributing authors in order of contribution</p>
                  </div>

                  <div className="form-group">
                    <label>Abstract</label>
                    <textarea
                      name="abstract"
                      value={uploadFormData.abstract}
                      onChange={handleUploadFormChange}
                      className="form-textarea"
                      placeholder="Enter paper abstract (150-300 words)"
                      rows="6"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Keywords (comma-separated)</label>
                    <input
                      type="text"
                      name="keywords"
                      value={uploadFormData.keywords}
                      onChange={handleUploadFormChange}
                      className="form-input"
                      placeholder="keyword1, keyword2, keyword3"
                      required
                    />
                    <p className="form-hint">3-8 keywords that best represent your paper</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        name="category"
                        value={uploadFormData.category}
                        onChange={handleUploadFormChange}
                        className="form-select"
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

                    <div className="form-group">
                      <label>Word Count</label>
                      <input
                        type="number"
                        name="wordCount"
                        value={uploadFormData.wordCount}
                        onChange={handleUploadFormChange}
                        className="form-input"
                        placeholder="e.g., 5000"
                        min="500"
                        required
                      />
                      <p className="form-hint">Minimum 500 words</p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>PDF File</label>
                    <label className="file-drop" style={{ display: 'block' }}>
                      <div>Upload a file or drag and drop</div>
                      <div style={{ marginTop: 4 }}>PDF up to 20MB</div>
                      <input
                        type="file"
                        name="pdfFile"
                        accept=".pdf"
                        onChange={handleUploadFormChange}
                        style={{ display: 'none' }}
                        required
                      />
                      {uploadFormData.pdfFile && (
                        <p style={{ color: '#0f7b3d', fontWeight: 600, marginTop: 8 }}>
                          {uploadFormData.pdfFile.name}
                        </p>
                      )}
                    </label>
                  </div>

                  <div className="contact-note" style={{ marginBottom: 20 }}>
                    Submission fee: <strong>₹730</strong>. Payment is required to initiate the review process. You can pay immediately after submission.
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="button button-primary"
                      style={{ flex: 1 }}
                    >
                      {uploading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <LoadingSpinner size="sm" text="" />
                          Submitting...
                        </span>
                      ) : 'Submit Paper'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
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

        {/* Tabs */}
        <div className="dash-tabs">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`dash-tab ${activeTab === 'submissions' ? 'is-active' : ''}`}
          >
            All Submissions ({papers.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`dash-tab ${activeTab === 'pending' ? 'is-active' : ''}`}
          >
            Pending Payment ({stats.submitted})
          </button>
        </div>

        {/* Papers List */}
        {activeTab === 'submissions' && (
          <>
            <div className="search-bar">
              <input
                type="text"
                value={authorSearchTerm}
                onChange={(e) => setAuthorSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="form-input"
                style={{ flex: 1, minWidth: 220 }}
              />
              <select
                value={authorSortBy}
                onChange={(e) => setAuthorSortBy(e.target.value)}
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
                onClick={() => setShowAllAuthorPapers(prev => !prev)}
                className="button button-outline button-small"
              >
                {showAllAuthorPapers ? 'Show unfinished only' : 'View all papers'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {visibleAuthorPapers.map(paper => (
                <div key={paper.id} className="dash-panel">
                  <div className="dash-panel-head">
                    <h2>{paper.title}</h2>
                    <span className={statusBadgeClass(paper.status)}>
                      {paper.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ marginBottom: 12, fontSize: 10, color: 'var(--muted)' }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--ink)' }}>Authors: </strong>{paper.authors.join(', ')}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--ink)' }}>Submitted: </strong>{new Date(paper.submissionDate).toLocaleDateString()}
                    </div>
                    {paper.publicationDate && (
                      <div>
                        <strong style={{ color: 'var(--ink)' }}>Published: </strong>{new Date(paper.publicationDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: 10, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 14 }}>
                    {paper.abstract}
                  </p>

                  {paper.pdfUrl && (
                    <div style={{ marginBottom: 14 }}>
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn"
                      >
                        View Manuscript (latest version)
                      </a>
                    </div>
                  )}

                  {paper.status === 'submitted' && paper.paymentStatus === 'pending' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 600 }}>
                          Submission fee: <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>₹1500</span>
                        </span>
                        <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>Complete payment to initiate review</p>
                      </div>
                      <button
                        onClick={() => handlePayment(paper.id)}
                        className="button button-primary button-small"
                      >
                        Pay Now
                      </button>
                    </div>
                  )}

                  {paper.status === 'submitted' && paper.paymentStatus === 'paid' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-success">Payment completed</span>
                      <span style={{ fontSize: 9, color: 'var(--muted)' }}>Awaiting reviewer assignment</span>
                    </div>
                  )}

                  {paper.status === 'under_review' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 10, color: 'var(--ink)' }}>Currently under review</span>
                      {paper.reviewDeadline && (
                        <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>
                          Estimated completion: {new Date(paper.reviewDeadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {paper.status === 'revisions_requested' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 600 }}>Revisions requested - please upload a revised manuscript.</span>
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionModalPaper(paper);
                            setRevisionFile(null);
                          }}
                          className="button button-primary button-small"
                        >
                          Upload Revised
                        </button>
                      </div>
                    </div>
                  )}

                  {paper.status === 'published' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 10, color: '#0f7b3d', fontWeight: 600 }}>Congratulations! Your paper has been published.</span>
                      {paper.doi && (
                        <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>
                          DOI: {paper.doi}
                        </p>
                      )}
                    </div>
                  )}

                  {paper.status === 'rejected' && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 10, color: '#c0342c' }}>This paper was not accepted for publication.</span>
                      <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {papers.filter(paper => paper.status === 'submitted' && paper.paymentStatus === 'pending').map(paper => (
              <div key={paper.id} className="dash-panel">
                <h2 style={{ color: 'var(--navy)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                  {paper.title}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 600, margin: 0 }}>
                      Submission fee: <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>$150</span>
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>
                      Submitted on {new Date(paper.submissionDate).toLocaleDateString()}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--muted)', margin: '4px 0 0' }}>
                      Complete payment to initiate review process
                    </p>
                  </div>
                  <button
                    onClick={() => handlePayment(paper.id)}
                    className="button button-primary button-small"
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {papers.length === 0 && (
          <div className="dash-empty">
            <h3 style={{ color: 'var(--navy)', fontSize: 14, margin: '0 0 8px' }}>
              No Papers Submitted Yet
            </h3>
            <p style={{ maxWidth: 420, margin: '0 auto 16px' }}>
              Start your academic journey by submitting your first research paper. We're excited to review your work!
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="button button-primary"
            >
              Submit Your First Paper
            </button>
          </div>
        )}

        {/* Revision Upload Modal */}
        {revisionModalPaper && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div className="modal-panel-header">
                <h2>Upload Revised Manuscript</h2>
                <button
                  type="button"
                  onClick={() => {
                    setRevisionModalPaper(null);
                    setRevisionFile(null);
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div className="contact-note" style={{ marginBottom: 16 }}>
                  <strong style={{ display: 'block', color: 'var(--navy)', marginBottom: 4 }}>{revisionModalPaper.title}</strong>
                  Upload a revised version of your manuscript in response to reviewer/editor comments.
                </div>

                <form onSubmit={handleSubmitRevision}>
                  <div className="form-group">
                    <label>Revised Manuscript (PDF)</label>
                    <label className="file-drop" style={{ display: 'block' }}>
                      <div>Select file or drag and drop</div>
                      <div style={{ marginTop: 4 }}>PDF format only, up to 20MB.</div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleRevisionFileChange}
                        style={{ display: 'none' }}
                      />
                      {revisionFile && (
                        <p style={{ color: '#0f7b3d', fontSize: 9, marginTop: 8 }}>
                          Selected file: <strong>{revisionFile.name}</strong>
                        </p>
                      )}
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={revisionUploading || !revisionFile}
                      className="button button-primary"
                      style={{ flex: 1 }}
                    >
                      {revisionUploading ? 'Uploading...' : 'Submit Revised Manuscript'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRevisionModalPaper(null);
                        setRevisionFile(null);
                      }}
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

export default AuthorDashboard;
