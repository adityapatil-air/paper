import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import { useToast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import FilePicker from '../components/ui/FilePicker';
import PaperStepper from '../components/ui/PaperStepper';
import Spinner from '../components/ui/Spinner';
import StatusBadge, { Badge } from '../components/ui/StatusBadge';
import { recommendationLabel } from '../components/ui/Stars';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { DashHeader, StatCard, FilterBar, Segmented, TabList, TabPanel, SORT_OPTIONS, formatDate, joinAuthors } from '../components/ui/DashHeader';
import copyrightTemplate from '../assets/Copyright.pdf';

const UNFINISHED_STATUSES = ['submitted', 'under_review', 'revisions_requested', 'accepted'];

// The article processing charge is due only after acceptance (see Author Guidelines §6).
const needsPayment = (paper) => paper.status === 'accepted' && paper.paymentStatus !== 'paid';
// The signed copyright form is requested once the paper is accepted (see Author Guidelines §8).
const needsCopyright = (paper) => ['accepted', 'published'].includes(paper.status) && !paper.copyrightUrl;

const CURRENCY_LABEL = { INR: (n) => `₹${Number(n).toLocaleString('en-IN')}`, USD: (n) => `US$${n}` };

// Loads Razorpay Checkout once and resolves to window.Razorpay.
const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) { resolve(window.Razorpay); return; }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay unavailable')));
  script.onerror = () => reject(new Error('Could not load Razorpay'));
  document.body.appendChild(script);
});

// Short, status-driven hint shown in the table's "Next step" column.
const nextStep = (paper) => {
  if (needsPayment(paper)) return { text: 'Payment pending', tone: 'warning' };
  if (paper.status === 'accepted') return { text: 'Awaiting publication' };
  if (paper.status === 'submitted') return { text: 'Awaiting reviewer assignment' };
  if (paper.status === 'under_review') {
    return { text: paper.reviewDeadline ? `Est. completion ${formatDate(paper.reviewDeadline)}` : 'With reviewers' };
  }
  if (paper.status === 'revisions_requested') return { text: 'Upload revised manuscript', tone: 'warning' };
  if (paper.status === 'published') return { text: paper.doi ? `DOI ${paper.doi}` : 'Published' };
  if (paper.status === 'rejected') return { text: 'Not accepted' };
  return { text: '—' };
};

const AuthorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Only the first load shows the skeleton; later refreshes keep the current content on screen.
  const hasLoadedOnce = useRef(false);
  useEffect(() => { if (!loading) hasLoadedOnce.current = true; }, [loading]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [authorSearchTerm, setAuthorSearchTerm] = useState('');
  const [authorSortBy, setAuthorSortBy] = useState('recent');
  const [showAllAuthorPapers, setShowAllAuthorPapers] = useState(false);
  const [detailPaper, setDetailPaper] = useState(null);
  const [revisionModalPaper, setRevisionModalPaper] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState({ loading: false, reviews: [], error: '' });
  const [revisionFile, setRevisionFile] = useState(null);
  const [revisionUploading, setRevisionUploading] = useState(false);
  const [paymentPaper, setPaymentPaper] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentCurrency, setPaymentCurrency] = useState('INR');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [copyrightPaper, setCopyrightPaper] = useState(null);
  const [copyrightFile, setCopyrightFile] = useState(null);
  const [copyrightUploading, setCopyrightUploading] = useState(false);

  useEffect(() => {
    loadAuthorPapers();
    loadNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAuthorPapers = async () => {
    try {
      setLoading(true);
      // The server returns only the papers this author submitted.
      const authorPapers = await mockAPI.getAllPapers();
      setPapers(authorPapers);
    } catch (error) {
      console.error('Error loading papers:', error);
      toast.error('We couldn’t load your papers. Please refresh the page.');
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
    setNotificationToDelete(null);

    try {
      await mockAPI.deleteNotification(notificationId);
      toast.success('Notification deleted.');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handlePayment = async (paper) => {
    setDetailPaper(null);
    setPaymentPaper(paper);
    setPaymentConfig(null);
    setPaymentConfig(await mockAPI.getPaymentConfig());
  };

  const closePaymentModal = () => {
    if (paymentBusy) return;
    setPaymentPaper(null);
  };

  const startCheckout = async () => {
    if (!paymentPaper || !paymentConfig?.configured) return;
    setPaymentBusy(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const orderResult = await mockAPI.createPaymentOrder(paymentPaper.id, paymentCurrency);
      if (!orderResult.success) {
        toast.error(orderResult.error);
        setPaymentBusy(false);
        return;
      }
      const { order } = orderResult;
      const paper = paymentPaper;
      const checkout = new Razorpay({
        key: paymentConfig.key,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'IJEPA',
        description: `Article processing charge · Paper #${paper.id}`,
        prefill: { name: user?.name || '', email: user?.email || '' },
        notes: { paperId: String(paper.id) },
        theme: { color: '#0a6acb' },
        handler: async (response) => {
          const verify = await mockAPI.verifyPayment({
            paperId: paper.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setPaymentBusy(false);
          if (verify.success) {
            toast.success('Payment received. Thank you!');
            setPaymentPaper(null);
            loadAuthorPapers();
          } else {
            toast.error(`${verify.error} If money was deducted, contact editor@ijepa.org with paper ID #${paper.id}.`);
          }
        },
        modal: { ondismiss: () => setPaymentBusy(false) },
      });
      checkout.on('payment.failed', (resp) => {
        setPaymentBusy(false);
        toast.error(resp?.error?.description || 'Payment failed. Please try again.');
      });
      checkout.open();
    } catch (error) {
      console.error('Checkout error', error);
      toast.error('Could not open the payment window. Check your connection and try again.');
      setPaymentBusy(false);
    }
  };

  const openCopyrightModal = (paper) => {
    setDetailPaper(null);
    setCopyrightPaper(paper);
    setCopyrightFile(null);
  };

  const closeCopyrightModal = () => {
    if (copyrightUploading) return;
    setCopyrightPaper(null);
    setCopyrightFile(null);
  };

  const handleSubmitCopyright = async (e) => {
    e.preventDefault();
    if (!copyrightPaper || !copyrightFile) return;
    setCopyrightUploading(true);
    const result = await mockAPI.uploadCopyrightForm(copyrightPaper.id, copyrightFile);
    setCopyrightUploading(false);
    if (result.success) {
      toast.success('Copyright form uploaded.');
      setCopyrightPaper(null);
      setCopyrightFile(null);
      loadAuthorPapers();
    } else {
      toast.error(result.error);
    }
  };

  const openRevisionModal = async (paper) => {
    setDetailPaper(null);
    setRevisionModalPaper(paper);
    setRevisionFile(null);
    setRevisionFeedback({ loading: true, reviews: [], error: '' });
    const result = await mockAPI.getReviewsForAuthor(paper.id);
    setRevisionFeedback({
      loading: false,
      reviews: result.success ? result.reviews : [],
      error: result.success ? '' : result.error,
    });
  };

  // The editor's revision request is delivered as a notification naming the paper.
  const editorRevisionMessage = (paper) => {
    if (!paper) return '';
    const match = notifications.find((n) =>
      n && n.title === 'Revisions requested for your paper' &&
      typeof n.message === 'string' && n.message.includes(`"${paper.title}"`)
    );
    return match ? match.message : '';
  };

  const closeRevisionModal = () => {
    if (revisionUploading) return;
    setRevisionModalPaper(null);
    setRevisionFile(null);
  };

  const handleSubmitRevision = async (e) => {
    e.preventDefault();

    if (!revisionModalPaper || !revisionFile) {
      toast.error('Please choose a revised manuscript file before submitting.');
      return;
    }

    setRevisionUploading(true);
    try {
      const result = await mockAPI.uploadRevision(revisionModalPaper.id, user.id, revisionFile);
      if (result.success) {
        toast.success('Revised manuscript uploaded successfully.');
        setRevisionModalPaper(null);
        setRevisionFile(null);
        loadAuthorPapers();
      } else {
        toast.error(result.error || 'Failed to upload revised manuscript.');
      }
    } catch (error) {
      console.error('Error uploading revised manuscript:', error);
      toast.error('An error occurred while uploading the revised manuscript.');
    } finally {
      setRevisionUploading(false);
    }
  };

  const stats = {
    submitted: papers.filter(p => p.status === 'submitted').length,
    under_review: papers.filter(p => p.status === 'under_review').length,
    published: papers.filter(p => p.status === 'published').length,
    rejected: papers.filter(p => p.status === 'rejected').length
  };

  const pendingPaymentPapers = papers.filter(needsPayment);
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

  let visibleAuthorPapers = (papers || []).filter(matchesAuthorSearch);

  if (!showAllAuthorPapers) {
    visibleAuthorPapers = visibleAuthorPapers.filter(paper => UNFINISHED_STATUSES.includes(paper.status));
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

  if (loading && !hasLoadedOnce.current) {
    return <DashboardSkeleton label="Loading your papers" />;
  }

  const primaryAction = (paper) => {
    if (needsPayment(paper)) {
      return (
        <button type="button" onClick={() => handlePayment(paper)} className="button button-primary button-small">
          <Icon name="credit" size={15} /> Pay now
        </button>
      );
    }
    if (paper.status === 'revisions_requested') {
      return (
        <button type="button" onClick={() => openRevisionModal(paper)} className="button button-primary button-small">
          <Icon name="upload" size={15} /> Upload revision
        </button>
      );
    }
    if (needsCopyright(paper)) {
      return (
        <button type="button" onClick={() => openCopyrightModal(paper)} className="button button-primary button-small">
          <Icon name="upload" size={15} /> Upload copyright form
        </button>
      );
    }
    return null;
  };

  const copyrightCallout = (paper) => {
    if (!['accepted', 'published'].includes(paper.status)) return null;
    if (paper.copyrightUrl) {
      return (
        <div className="callout-box is-success">
          <Icon name="checkCircle" size={20} />
          <div>
            <strong>Copyright form received</strong>
            <p><a href={paper.copyrightUrl} target="_blank" rel="noopener noreferrer">View the uploaded form</a></p>
          </div>
        </div>
      );
    }
    return (
      <div className="callout-box is-warning">
        <Icon name="fileText" size={20} />
        <div>
          <strong>Signed copyright form needed</strong>
          <p>Download the form, sign it and upload it as a PDF. <a href={copyrightTemplate} download="IJEPA Copyright Form.pdf">Download the copyright form</a></p>
        </div>
        <div className="callout-actions">
          <button type="button" onClick={() => openCopyrightModal(paper)} className="button button-primary button-small">Upload form</button>
        </div>
      </div>
    );
  };

  const statusCallout = (paper) => {
    if (needsPayment(paper)) {
      return (
        <div className="callout-box is-warning">
          <Icon name="credit" size={20} />
          <div>
            <strong>Accepted: article processing charge due</strong>
            <p>INR 1500 for Indian authors or USD 50 for international authors. Your paper ID is #{paper.id}.</p>
          </div>
          <div className="callout-actions">
            <button type="button" onClick={() => handlePayment(paper)} className="button button-primary button-small">Pay now</button>
          </div>
        </div>
      );
    }
    if (paper.status === 'accepted' && paper.paymentStatus === 'paid') {
      return (
        <div className="callout-box is-success">
          <Icon name="checkCircle" size={20} />
          <div><strong>Payment received</strong><p>Your paper is accepted and waiting to be published.</p></div>
        </div>
      );
    }
    if (paper.status === 'under_review') {
      return (
        <div className="callout-box">
          <Icon name="clock" size={20} />
          <div>
            <strong>Currently under review</strong>
            {paper.reviewDeadline && <p>Estimated completion: {formatDate(paper.reviewDeadline)}</p>}
          </div>
        </div>
      );
    }
    if (paper.status === 'revisions_requested') {
      return (
        <div className="callout-box is-warning">
          <Icon name="edit" size={20} />
          <div><strong>Revisions requested</strong><p>Please upload a revised manuscript.</p></div>
          <div className="callout-actions">
            <button type="button" onClick={() => openRevisionModal(paper)} className="button button-primary button-small">Upload revision</button>
          </div>
        </div>
      );
    }
    if (paper.status === 'published') {
      return (
        <div className="callout-box is-success">
          <Icon name="globe" size={20} />
          <div>
            <strong>Congratulations! Your paper has been published.</strong>
            {paper.doi && <p>DOI: {paper.doi}</p>}
          </div>
        </div>
      );
    }
    if (paper.status === 'rejected') {
      return (
        <div className="callout-box is-danger">
          <Icon name="xCircle" size={20} />
          <div>
            <strong>This paper was not accepted for publication.</strong>
            <p>Consider revising based on feedback and resubmitting.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dash-page">
      <div className="journal-container">
        <DashHeader
          role="Author"
          user={user}
          subtitle="Track your research submissions, respond to editors and manage your portfolio."
          actions={(
            <>
              <button type="button" onClick={() => setShowNotificationsModal(true)} className="button button-ghost">
                <Icon name="bell" size={17} /> Notifications
                {unreadNotificationsCount > 0 && (
                  <span className="count-pill" aria-label={`${unreadNotificationsCount} unread`}>{unreadNotificationsCount}</span>
                )}
              </button>
              <button type="button" onClick={() => navigate('/submitform')} className="button button-primary">
                <Icon name="plus" size={17} /> Submit new paper
              </button>
            </>
          )}
        />

        <div className="stat-cards">
          <StatCard label="Submitted" value={stats.submitted} icon="send" />
          <StatCard label="Under review" value={stats.under_review} icon="clock" tone="amber" />
          <StatCard label="Published" value={stats.published} icon="globe" tone="green" />
          <StatCard label="Rejected" value={stats.rejected} icon="xCircle" tone="red" />
        </div>

        {papers.length === 0 ? (
          <EmptyState
            title="No papers submitted yet"
            action={(
              <button type="button" onClick={() => navigate('/submitform')} className="button button-primary">
                <Icon name="plus" size={17} /> Submit your first paper
              </button>
            )}
          >
            Start your academic journey by submitting your first research paper. You can track it here through review and publication.
          </EmptyState>
        ) : (
          <>
            <TabList
              label="Your papers"
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'submissions', label: 'All submissions', count: papers.length },
                { id: 'pending', label: 'Pending payment', count: pendingPaymentPapers.length },
              ]}
            />

            {activeTab === 'submissions' && (
              <TabPanel id="submissions">
                <FilterBar
                  search={authorSearchTerm}
                  onSearch={setAuthorSearchTerm}
                  placeholder="Search by title, author, category…"
                  label="Search your papers"
                  sort={authorSortBy}
                  onSort={setAuthorSortBy}
                  sortOptions={SORT_OPTIONS}
                >
                  <Segmented
                    label="Which papers to show"
                    value={showAllAuthorPapers ? 'all' : 'open'}
                    onChange={(v) => setShowAllAuthorPapers(v === 'all')}
                    options={[{ value: 'open', label: 'In progress' }, { value: 'all', label: 'All papers' }]}
                  />
                </FilterBar>

                {visibleAuthorPapers.length === 0 ? (
                  <EmptyState
                    compact
                    variant="search"
                    title={searchTerm ? 'No papers match your search' : 'No papers in progress'}
                    action={searchTerm ? (
                      <button type="button" className="button button-ghost button-small" onClick={() => setAuthorSearchTerm('')}>Clear search</button>
                    ) : !showAllAuthorPapers ? (
                      <button type="button" className="button button-ghost button-small" onClick={() => setShowAllAuthorPapers(true)}>Show all papers</button>
                    ) : null}
                  >
                    {searchTerm ? 'Try a different title, author or category.' : 'Finished papers (published or rejected) are hidden. Show all papers to see them.'}
                  </EmptyState>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption className="sr-only">Your submissions</caption>
                      <thead>
                        <tr>
                          <th scope="col">Paper</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">Status</th>
                          <th scope="col">Next step</th>
                          <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAuthorPapers.map(paper => {
                          const step = nextStep(paper);
                          return (
                            <tr key={paper.id}>
                              <td className="cell-primary">
                                <button type="button" className="cell-title-btn" onClick={() => setDetailPaper(paper)}>{paper.title}</button>
                                <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                              </td>
                              <td data-label="Submitted" className="nowrap">{formatDate(paper.submissionDate)}</td>
                              <td data-label="Status"><StatusBadge status={paper.status} /></td>
                              <td data-label="Next step">
                                {step.tone ? <Badge tone={step.tone}>{step.text}</Badge> : <span className="cell-sub">{step.text}</span>}
                              </td>
                              <td className="col-actions">
                                <div className="row-actions">
                                  {primaryAction(paper)}
                                  <button type="button" className="icon-btn" onClick={() => setDetailPaper(paper)} aria-label={`View details for ${paper.title}`}>
                                    <Icon name="eye" size={15} /> Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabPanel>
            )}

            {activeTab === 'pending' && (
              <TabPanel id="pending">
                {pendingPaymentPapers.length === 0 ? (
                  <EmptyState compact variant="review" title="No payments due">
                    You have no submissions waiting for payment.
                  </EmptyState>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption className="sr-only">Submissions awaiting payment</caption>
                      <thead>
                        <tr>
                          <th scope="col">Paper</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">Fee</th>
                          <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPaymentPapers.map(paper => (
                          <tr key={paper.id}>
                            <td className="cell-primary">
                              <button type="button" className="cell-title-btn" onClick={() => setDetailPaper(paper)}>{paper.title}</button>
                              <span className="cell-sub">Accepted. Pay the article processing charge so the paper can be published (paper ID #{paper.id}).</span>
                            </td>
                            <td data-label="Submitted" className="nowrap">{formatDate(paper.submissionDate)}</td>
                            <td data-label="Fee" className="nowrap"><strong>INR 1500</strong> / USD 50</td>
                            <td className="col-actions">
                              <div className="row-actions">
                                <button type="button" onClick={() => handlePayment(paper)} className="button button-primary button-small">
                                  <Icon name="credit" size={15} /> Pay now
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
          </>
        )}
      </div>

      {/* Paper details */}
      <Modal
        open={Boolean(detailPaper)}
        onClose={() => setDetailPaper(null)}
        size="lg"
        title={detailPaper?.title || ''}
        footer={detailPaper && (
          <>
            {detailPaper.pdfUrl && (
              <a href={detailPaper.pdfUrl} target="_blank" rel="noopener noreferrer" className="button button-ghost footer-start">
                <Icon name="fileText" size={16} /> View manuscript (latest version)
              </a>
            )}
            <button type="button" className="button button-ghost" onClick={() => setDetailPaper(null)}>Close</button>
            {primaryAction(detailPaper)}
          </>
        )}
      >
        {detailPaper && (
          <>
            <div className="dash-panel-head">
              <StatusBadge status={detailPaper.status} />
            </div>
            <PaperStepper paper={detailPaper} />
            <div className="detail-section">
              {statusCallout(detailPaper)}
              {copyrightCallout(detailPaper)}
            </div>
            <div className="detail-section">
              <dl className="meta-list">
                <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(detailPaper.authors) || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(detailPaper.submissionDate)}</dd></div>
                {detailPaper.publicationDate && <div><dt>Published</dt><dd>{formatDate(detailPaper.publicationDate)}</dd></div>}
                {detailPaper.category && <div><dt>Category</dt><dd>{detailPaper.category}</dd></div>}
                {detailPaper.doi && <div><dt>DOI</dt><dd>{detailPaper.doi}</dd></div>}
              </dl>
            </div>
            {detailPaper.abstract && (
              <div className="detail-section">
                <h3>Abstract</h3>
                <p>{detailPaper.abstract}</p>
              </div>
            )}
            {Array.isArray(detailPaper.keywords) && detailPaper.keywords.filter(Boolean).length > 0 && (
              <div className="detail-section">
                <h3>Keywords</h3>
                <div className="chip-list">{detailPaper.keywords.filter(Boolean).map((k) => <span key={k} className="chip">{k}</span>)}</div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Notifications */}
      <Modal
        open={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title="Notifications"
        description={unreadNotificationsCount ? `${unreadNotificationsCount} unread` : undefined}
      >
        {notificationsLoading ? (
          <div className="loading-spinner"><Spinner size="sm" label="Loading notifications" /></div>
        ) : notifications.length === 0 ? (
          <EmptyState compact title="You’re all caught up">You have no notifications.</EmptyState>
        ) : (
          <ul className="notif-list">
            {notifications.map(notification => (
              <li key={notification.id} className={`notif-item${notification.read ? '' : ' is-unread'}`}>
                <button type="button" className="notif-main" onClick={() => handleNotificationClick(notification.id)}>
                  <strong>
                    {!notification.read && <span className="dot" aria-hidden="true" />}
                    {notification.title}
                    {!notification.read && <span className="sr-only"> (unread — select to mark as read)</span>}
                  </strong>
                  <p>{notification.message}</p>
                  {notification.timestamp && <time dateTime={notification.timestamp}>{formatDate(notification.timestamp)}</time>}
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationToDelete(notification)}
                  className="icon-btn is-square icon-btn-danger"
                  aria-label={`Delete notification: ${notification.title}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(notificationToDelete)}
        tone="danger"
        title="Delete notification?"
        message="This notification will be removed permanently."
        confirmLabel="Delete"
        onCancel={() => setNotificationToDelete(null)}
        onConfirm={() => handleDeleteNotification(notificationToDelete.id)}
      >
        {notificationToDelete && <div className="paper-ref"><strong>{notificationToDelete.title}</strong></div>}
      </ConfirmDialog>

      {/* Revision upload */}
      <Modal
        open={Boolean(revisionModalPaper)}
        onClose={closeRevisionModal}
        closeDisabled={revisionUploading}
        title="Upload revised manuscript"
        description="Upload a revised version in response to reviewer and editor comments."
        footer={(
          <>
            <button type="button" onClick={closeRevisionModal} className="button button-ghost" disabled={revisionUploading}>Cancel</button>
            <button type="submit" form="revision-form" disabled={revisionUploading || !revisionFile} className="button button-primary" aria-busy={revisionUploading || undefined}>
              {revisionUploading ? <><Spinner size="sm" /> Uploading…</> : <><Icon name="upload" size={16} /> Submit revised manuscript</>}
            </button>
          </>
        )}
      >
        {revisionModalPaper && (
          <form id="revision-form" onSubmit={handleSubmitRevision} noValidate>
            <div className="paper-ref"><strong>{revisionModalPaper.title}</strong></div>
            <section className="detail-section" aria-labelledby="revision-editor-heading">
              <h3 id="revision-editor-heading">Editor’s message</h3>
              <p>{editorRevisionMessage(revisionModalPaper) || 'The editor did not add a message. Please address the reviewer comments below.'}</p>
            </section>
            <section className="detail-section" aria-labelledby="revision-reviews-heading">
              <h3 id="revision-reviews-heading">Reviewer comments</h3>
              {revisionFeedback.loading ? (
                <Spinner size="sm" label="Loading reviewer comments" />
              ) : revisionFeedback.error ? (
                <p role="alert">{revisionFeedback.error}</p>
              ) : revisionFeedback.reviews.length === 0 ? (
                <p>No reviewer comments have been shared for this paper.</p>
              ) : (
                revisionFeedback.reviews.map((review, index) => (
                  <article key={index} className="review-card">
                    <div className="review-card-head">
                      <strong>Reviewer {index + 1}</strong>
                      {review.recommendation && <span>{recommendationLabel(review.recommendation)}</span>}
                    </div>
                    <p>{review.comments}</p>
                  </article>
                ))
              )}
            </section>
            <FilePicker
              id="revision-file"
              label="Revised manuscript (PDF)"
              extensions={['pdf']}
              file={revisionFile}
              onChange={setRevisionFile}
              disabled={revisionUploading}
            />
          </form>
        )}
      </Modal>

      {/* Payment */}
      <Modal
        open={Boolean(paymentPaper)}
        onClose={closePaymentModal}
        closeDisabled={paymentBusy}
        title="Pay article processing charge"
        description={paymentPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closePaymentModal} className="button button-ghost" disabled={paymentBusy}>Cancel</button>
            {paymentConfig?.configured && (
              <button type="button" onClick={startCheckout} disabled={paymentBusy} className="button button-primary" aria-busy={paymentBusy || undefined}>
                {paymentBusy
                  ? <><Spinner size="sm" /> Opening payment…</>
                  : <><Icon name="credit" size={16} /> Pay {CURRENCY_LABEL[paymentCurrency](paymentConfig.fees[paymentCurrency])}</>}
              </button>
            )}
          </>
        )}
      >
        {paymentPaper && (
          !paymentConfig ? (
            <Spinner size="sm" label="Checking payment options" />
          ) : !paymentConfig.configured ? (
            <div className="callout-box is-warning">
              <Icon name="info" size={20} />
              <div>
                <strong>Online payment isn't available yet</strong>
                <p>Please email <a href={`mailto:editor@ijepa.org?subject=APC payment for paper %23${paymentPaper.id}`}>editor@ijepa.org</a> with your paper ID (#{paymentPaper.id}) and the editorial office will send payment details.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="paper-ref"><strong>Paper ID #{paymentPaper.id}</strong></div>
              <p>Choose how you are paying. The amount is set by the journal (Author Guidelines §6).</p>
              <Segmented
                label="Author type"
                value={paymentCurrency}
                onChange={setPaymentCurrency}
                options={[
                  { value: 'INR', label: `Indian author · ${CURRENCY_LABEL.INR(paymentConfig.fees.INR)}` },
                  { value: 'USD', label: `International author · ${CURRENCY_LABEL.USD(paymentConfig.fees.USD)}` },
                ]}
              />
              <p className="form-hint">Payments are processed securely by Razorpay. You'll get a confirmation here once it's complete.</p>
            </>
          )
        )}
      </Modal>

      {/* Copyright form upload */}
      <Modal
        open={Boolean(copyrightPaper)}
        onClose={closeCopyrightModal}
        closeDisabled={copyrightUploading}
        title="Upload signed copyright form"
        description={copyrightPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeCopyrightModal} className="button button-ghost" disabled={copyrightUploading}>Cancel</button>
            <button type="submit" form="copyright-form" disabled={copyrightUploading || !copyrightFile} className="button button-primary" aria-busy={copyrightUploading || undefined}>
              {copyrightUploading ? <><Spinner size="sm" /> Uploading…</> : <><Icon name="upload" size={16} /> Upload form</>}
            </button>
          </>
        )}
      >
        {copyrightPaper && (
          <form id="copyright-form" onSubmit={handleSubmitCopyright} noValidate>
            <p>
              Download the IJEPA copyright transfer form, fill it in, sign it and upload it as a PDF.{' '}
              <a href={copyrightTemplate} download="IJEPA Copyright Form.pdf">Download the copyright form</a>
            </p>
            <FilePicker
              id="copyright-file"
              label="Signed copyright form (PDF)"
              extensions={['pdf']}
              file={copyrightFile}
              onChange={setCopyrightFile}
              disabled={copyrightUploading}
            />
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AuthorDashboard;
