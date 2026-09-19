import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { mockAPI } from '../data/mockData';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [paperReviews, setPaperReviews] = useState({});
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [issues, setIssues] = useState([]);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [issuePapersByIssueId, setIssuePapersByIssueId] = useState({});
  const [issuePapersLoadingId, setIssuePapersLoadingId] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [alert, setAlert] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);

  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsModalPaper, setReviewsModalPaper] = useState(null);
  const [reviewsModalReviews, setReviewsModalReviews] = useState([]);

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionModalPaper, setRevisionModalPaper] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectModalPaper, setRejectModalPaper] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [showDeletePaperModal, setShowDeletePaperModal] = useState(false);
  const [deleteModalPaper, setDeleteModalPaper] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [showAdminSubmitModal, setShowAdminSubmitModal] = useState(false);
  const [adminSubmitForm, setAdminSubmitForm] = useState({
    fullName: '',
    email: '',
    affiliation: '',
    paperTitle: '',
    keywords: '',
    comments: '',
    manuscriptFile: null,
  });
  const [adminSubmitCoAuthors, setAdminSubmitCoAuthors] = useState([]);
  const [adminSubmittingPaper, setAdminSubmittingPaper] = useState(false);

  const [pendingMenuPaperId, setPendingMenuPaperId] = useState(null);
  const [showQuickPublishModal, setShowQuickPublishModal] = useState(false);
  const [quickPublishPaper, setQuickPublishPaper] = useState(null);

  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false);
  const [pdfViewerPaper, setPdfViewerPaper] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [pdfViewerError, setPdfViewerError] = useState('');

  const [showReplaceFilesModal, setShowReplaceFilesModal] = useState(false);
  const [replaceFilesPaper, setReplaceFilesPaper] = useState(null);
  const [replaceManuscriptFile, setReplaceManuscriptFile] = useState(null);
  const [replaceCopyrightFile, setReplaceCopyrightFile] = useState(null);
  const [replaceFilesSubmitting, setReplaceFilesSubmitting] = useState(false);

  const [showAssignIssueModal, setShowAssignIssueModal] = useState(false);
  const [assignIssuePaper, setAssignIssuePaper] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [assignIssueSubmitting, setAssignIssueSubmitting] = useState(false);

  // Search functionality
  const [issueForm, setIssueForm] = useState({
    volume: '',
    issue: '',
    month: '',
    year: '',
  });

  const [importantDates, setImportantDates] = useState({
    'Manuscript Submission Deadline': '20 December 2024',
    'Notification of Acceptance': 'To be announced',
    'Final Camera-Ready Paper Due': 'To be announced',
    'Publication Date': 'To be announced',
  });
  const [importantDatesLoading, setImportantDatesLoading] = useState(false);
  const [importantDatesSaving, setImportantDatesSaving] = useState(false);

  const [editorialBoard, setEditorialBoard] = useState([]);
  const [editorialBoardLoading, setEditorialBoardLoading] = useState(false);
  const [editorialBoardSaving, setEditorialBoardSaving] = useState(false);
  const [editorialSearchTerm, setEditorialSearchTerm] = useState('');
  const [showEditorialModal, setShowEditorialModal] = useState(false);
  const [editingEditorialId, setEditingEditorialId] = useState(null);
  const [editorialDraft, setEditorialDraft] = useState({
    section: 'Associate Editors',
    name: '',
    title: '',
    affiliation: '',
    email: '',
    profileUrl: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [, setIsDropdownOpen] = useState(false);
  const [reviewerSortBy, setReviewerSortBy] = useState('name_az');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSortBy, setAdminSortBy] = useState('recent');
  const [adminShowAllPapers, setAdminShowAllPapers] = useState(false);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      const allPapers = await mockAPI.getAllPapers();

      // Load reviews for each paper so admins can see review progress
      const reviewResults = await Promise.all(
        allPapers.map(async (paper) => {
          const reviews = await mockAPI.getReviewsByPaper(paper.id);
          return { paperId: paper.id, reviews };
        })
      );

      const reviewsMap = {};
      reviewResults.forEach(({ paperId, reviews }) => {
        reviewsMap[paperId] = reviews;
      });
      setPaperReviews(reviewsMap);

      const reviewerUsers = await mockAPI.getReviewers();
      setReviewers(reviewerUsers);

      const loadedIssues = await mockAPI.getIssues();
      setIssues(loadedIssues);

      // Load admin notifications so we can detect revised manuscripts
      if (user && user.id) {
        try {
          const notifResult = await mockAPI.getNotifications(user.id);
          setAdminNotifications(Array.isArray(notifResult) ? notifResult : []);
        } catch (err) {
          console.error('Error loading admin notifications in dashboard', err);
          setAdminNotifications([]);
        }
      } else {
        setAdminNotifications([]);
      }

      // Load issue assignments so we know which issue each published paper belongs to
      const assignments = await mockAPI.getIssueAssignments();
      const assignmentsByPaperId = {};
      assignments.forEach((assignment) => {
        if (assignment && assignment.paperId && assignment.issue) {
          assignmentsByPaperId[assignment.paperId] = assignment.issue;
        }
      });
      // Attach assignedIssue info to each paper for easier rendering
      const papersWithAssignments = (allPapers || []).map((paper) => ({
        ...paper,
        assignedIssue: assignmentsByPaperId[paper.id] || null,
      }));
      setPapers(papersWithAssignments);
    } catch (error) {
      console.error('Error loading admin ', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleAdminSubmitFormChange = (e) => {
    const { name, value, files } = e.target;
    setAdminSubmitForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const addAdminCoAuthor = () => {
    setAdminSubmitCoAuthors((prev) => ([
      ...(prev || []),
      { fullName: '', affiliation: '', email: '' },
    ]));
  };

  const updateAdminCoAuthor = (index, field, value) => {
    setAdminSubmitCoAuthors((prev) =>
      (prev || []).map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const removeAdminCoAuthor = (index) => {
    setAdminSubmitCoAuthors((prev) => (prev || []).filter((_a, i) => i !== index));
  };

  const handleAdminSubmitNewPaper = async (e) => {
    e.preventDefault();

    try {
      setAdminSubmittingPaper(true);
      setAlert(null);

      const coAuthors = (adminSubmitCoAuthors || [])
        .map((a) => ({
          fullName: String(a?.fullName || '').trim(),
          affiliation: String(a?.affiliation || '').trim(),
          email: String(a?.email || '').trim(),
        }))
        .filter((a) => a.fullName || a.affiliation || a.email);

      const result = await mockAPI.submitFullPaper({
        fullName: adminSubmitForm.fullName,
        email: adminSubmitForm.email,
        affiliation: adminSubmitForm.affiliation,
        paperTitle: adminSubmitForm.paperTitle,
        keywords: adminSubmitForm.keywords,
        comments: adminSubmitForm.comments,
        coAuthors,
        manuscriptFile: adminSubmitForm.manuscriptFile,
      });

      if (result.success) {
        setAlert({ type: 'success', message: 'Paper submitted successfully.' });
        setShowAdminSubmitModal(false);
        setAdminSubmitForm({
          fullName: '',
          email: '',
          affiliation: '',
          paperTitle: '',
          keywords: '',
          comments: '',
          manuscriptFile: null,
        });
        setAdminSubmitCoAuthors([]);
        await loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to submit paper.' });
      }
    } catch (err) {
      console.error('Admin submit paper failed', err);
      setAlert({ type: 'error', message: 'Failed to submit paper.' });
    } finally {
      setAdminSubmittingPaper(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const openPdfViewer = (paper) => {
    setPdfViewerPaper(paper);
    setPdfNumPages(null);
    setPdfPageNumber(1);
    setPdfZoom(1);
    setPdfViewerError('');
    setShowPdfViewerModal(true);
  };

  const closePdfViewer = () => {
    setShowPdfViewerModal(false);
    setPdfViewerPaper(null);
    setPdfNumPages(null);
    setPdfPageNumber(1);
    setPdfZoom(1);
    setPdfViewerError('');
  };

  const onPdfLoadSuccess = ({ numPages }) => {
    setPdfNumPages(numPages);
    setPdfPageNumber(1);
  };

  const handlePdfPrevPage = () => setPdfPageNumber((prev) => Math.max(prev - 1, 1));
  const handlePdfNextPage = () => setPdfPageNumber((prev) => (pdfNumPages ? Math.min(prev + 1, pdfNumPages) : prev + 1));
  const handlePdfZoomIn = () => setPdfZoom((prev) => Math.min(prev + 0.25, 2));
  const handlePdfZoomOut = () => setPdfZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handlePdfResetZoom = () => setPdfZoom(1);

  const openReplaceFilesModal = (paper) => {
    setReplaceFilesPaper(paper);
    setReplaceManuscriptFile(null);
    setReplaceCopyrightFile(null);
    setShowReplaceFilesModal(true);
  };

  const closeReplaceFilesModal = () => {
    if (replaceFilesSubmitting) return;
    setShowReplaceFilesModal(false);
    setReplaceFilesPaper(null);
    setReplaceManuscriptFile(null);
    setReplaceCopyrightFile(null);
  };

  const handleConfirmReplaceFiles = async () => {
    if (!replaceFilesPaper) return;
    if (!replaceManuscriptFile && !replaceCopyrightFile) {
      setAlert({ type: 'error', message: 'Please choose at least one file to upload.' });
      return;
    }

    try {
      setReplaceFilesSubmitting(true);
      const result = await mockAPI.adminReplacePaperFiles(replaceFilesPaper.id, {
        manuscriptFile: replaceManuscriptFile,
        copyrightFile: replaceCopyrightFile,
      });

      if (result.success) {
        setAlert({ type: 'success', message: 'Paper files updated successfully.' });
        closeReplaceFilesModal();
        await loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to update paper files.' });
      }
    } catch (err) {
      console.error('Admin replace files failed', err);
      setAlert({ type: 'error', message: 'Failed to update paper files.' });
    } finally {
      setReplaceFilesSubmitting(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    const loadImportantDates = async () => {
      try {
        setImportantDatesLoading(true);
        const result = await mockAPI.getImportantDates();
        if (result.success && result.dates && typeof result.dates === 'object') {
          setImportantDates((prev) => ({
            ...prev,
            ...result.dates,
          }));
        }
      } catch (err) {
        console.error('Failed to load important dates', err);
      } finally {
        setImportantDatesLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      loadImportantDates();
    }
  }, [user]);

  useEffect(() => {
    const loadEditorialBoard = async () => {
      try {
        setEditorialBoardLoading(true);
        const result = await mockAPI.getEditorialBoard();
        if (result.success && Array.isArray(result.board)) {
          setEditorialBoard(result.board);
        } else {
          setEditorialBoard([]);
        }
      } catch (err) {
        console.error('Failed to load editorial board', err);
        setEditorialBoard([]);
      } finally {
        setEditorialBoardLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      loadEditorialBoard();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load admin notifications based on the logged-in user so we can show revised-manuscript badges
  useEffect(() => {
    const loadNotificationsForAdmin = async () => {
      if (!user || !user.id) {
        setAdminNotifications([]);
        return;
      }

      try {
        const notifResult = await mockAPI.getNotifications(user.id);
        setAdminNotifications(Array.isArray(notifResult) ? notifResult : []);
      } catch (err) {
        console.error('Error loading admin notifications in AdminDashboard', err);
        setAdminNotifications([]);
      }
    };

    loadNotificationsForAdmin();
  }, [user]);

  const handleAssignReviewer = async () => {
    if (!selectedPaper || !selectedReviewer) return;

    setAssigning(true);
    try {
      const result = await mockAPI.assignReviewer(selectedPaper.id, parseInt(selectedReviewer));
      if (result.success) {
        setAlert({ type: 'success', message: 'Reviewer assigned successfully.' });
        setShowAssignModal(false);
        setSelectedPaper(null);
        setSelectedReviewer('');
        setSearchTerm('');
        loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to assign reviewer.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while assigning the reviewer.' });
    } finally {
      setAssigning(false);
    }
  };

  const openDeletePaperModal = (paper) => {
    setDeleteModalPaper(paper);
    setShowDeletePaperModal(true);
  };

  const handleConfirmDeletePaper = async () => {
    if (!deleteModalPaper) return;
    setDeleteSubmitting(true);
    try {
      const result = await mockAPI.deletePaper(deleteModalPaper.id);
      if (result.success) {
        setAlert({ type: 'success', message: 'Paper deleted successfully.' });
        setShowDeletePaperModal(false);
        setDeleteModalPaper(null);
        await loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to delete paper.' });
      }
    } catch (err) {
      console.error('Failed to delete paper', err);
      setAlert({ type: 'error', message: 'Failed to delete paper.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleEditorialMemberChange = (id, field, value) => {
    setEditorialBoard((prev) =>
      (prev || []).map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // eslint-disable-next-line no-unused-vars
  const handleAddEditorialMember = () => {
    const newId = `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setEditorialBoard((prev) => ([
      ...(prev || []),
      {
        id: newId,
        section: 'Associate Editors',
        name: '',
        title: '',
        affiliation: '',
        email: '',
      }
    ]));
  };

  const handleRemoveEditorialMember = (id) => {
    setEditorialBoard((prev) => (prev || []).filter((m) => m.id !== id));
  };

  const openAddEditorialModal = () => {
    setEditingEditorialId(null);
    setEditorialDraft({
      section: 'Associate Editors',
      name: '',
      title: '',
      affiliation: '',
      email: '',
      profileUrl: '',
    });
    setShowEditorialModal(true);
  };

  const openEditEditorialModal = (member) => {
    setEditingEditorialId(member?.id || null);
    setEditorialDraft({
      section: member?.section || 'Associate Editors',
      name: member?.name || '',
      title: member?.title || '',
      affiliation: member?.affiliation || '',
      email: member?.email || '',
      profileUrl: member?.profileUrl || '',
    });
    setShowEditorialModal(true);
  };

  const closeEditorialModal = () => {
    setShowEditorialModal(false);
    setEditingEditorialId(null);
  };

  const handleEditorialDraftChange = (field, value) => {
    setEditorialDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEditorialDraft = () => {
    const trimmed = {
      section: String(editorialDraft.section || '').trim(),
      name: String(editorialDraft.name || '').trim(),
      title: String(editorialDraft.title || '').trim(),
      affiliation: String(editorialDraft.affiliation || '').trim(),
      email: String(editorialDraft.email || '').trim(),
      profileUrl: String(editorialDraft.profileUrl || '').trim(),
    };

    if (!trimmed.section || !trimmed.name) {
      setAlert({ type: 'error', message: 'Section and Name are required.' });
      return;
    }

    if (editingEditorialId) {
      setEditorialBoard((prev) =>
        (prev || []).map((m) => (m.id === editingEditorialId ? { ...m, ...trimmed } : m))
      );
    } else {
      const newId = `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setEditorialBoard((prev) => ([
        ...(prev || []),
        { id: newId, ...trimmed },
      ]));
    }

    closeEditorialModal();
  };

  const handleSaveEditorialBoard = async () => {
    try {
      setEditorialBoardSaving(true);
      const result = await mockAPI.saveEditorialBoard(editorialBoard);
      if (result.success) {
        setAlert({ type: 'success', message: 'Editorial Board updated successfully.' });
        if (Array.isArray(result.board)) {
          setEditorialBoard(result.board);
        }
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save Editorial Board.' });
      }
    } catch (err) {
      console.error('Failed to save editorial board', err);
      setAlert({ type: 'error', message: 'Failed to save Editorial Board.' });
    } finally {
      setEditorialBoardSaving(false);
    }
  };

  const [draggingEditorialId, setDraggingEditorialId] = useState(null);

  const reorderEditorialBoard = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const next = (editorialBoard || []).slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const normalized = next.map((m, idx) => ({
      ...m,
      sortOrder: idx,
    }));

    setEditorialBoard(normalized);

    try {
      setEditorialBoardSaving(true);
      const result = await mockAPI.saveEditorialBoard(normalized);
      if (result.success && Array.isArray(result.board)) {
        setEditorialBoard(result.board);
      }
    } catch (err) {
      console.error('Failed to persist editorial board order', err);
    } finally {
      setEditorialBoardSaving(false);
    }
  };

  const handlePublishPaper = async (paperId) => {
    try {
      const result = await mockAPI.publishPaper(paperId);
      if (result.success) {
        setAlert({ type: 'success', message: 'Paper published successfully.' });
        loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to publish paper.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while publishing the paper.' });
    }
  };

  const openRequestRevisionsModal = (paper) => {
    if (!paper) return;
    setRevisionModalPaper(paper);
    setRevisionNote('');
    setShowRevisionModal(true);
  };

  const handleRequestRevisions = async () => {
    if (!revisionModalPaper) return;

    const note = revisionNote.trim();
    if (!note) {
      setAlert({ type: 'error', message: 'Please describe the requested changes before sending a revision request.' });
      return;
    }

    try {
      setRevisionSubmitting(true);
      const result = await mockAPI.requestRevisions(revisionModalPaper.id, note);
      if (result.success) {
        setAlert({ type: 'success', message: 'Revision request sent to the author.' });
        setShowRevisionModal(false);
        setRevisionModalPaper(null);
        setRevisionNote('');
        loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to request revisions.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while requesting revisions.' });
    } finally {
      setRevisionSubmitting(false);
    }
  };

  const openRejectPaperModal = (paper) => {
    if (!paper) return;
    setRejectModalPaper(paper);
    setRejectNote('');
    setShowRejectModal(true);
  };

  const handleRejectPaper = async () => {
    if (!rejectModalPaper) return;

    try {
      setRejectSubmitting(true);
      const note = rejectNote.trim();
      const result = await mockAPI.rejectPaper(rejectModalPaper.id, note || undefined);
      if (result.success) {
        setAlert({ type: 'success', message: 'Paper rejected and author notified.' });
        setShowRejectModal(false);
        setRejectModalPaper(null);
        setRejectNote('');
        loadAdminData();
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to reject paper.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while rejecting the paper.' });
    } finally {
      setRejectSubmitting(false);
    }
  };

  const openAssignPaperToIssueModal = (paper) => {
    if (!paper) return;

    if (!issues || issues.length === 0) {
      setAlert({ type: 'error', message: 'No issues available. Please create an issue first in the Journal Issues tab.' });
      return;
    }

    setAssignIssuePaper(paper);
    if (issues.length > 0) {
      setSelectedIssueId(String(issues[0].id));
    } else {
      setSelectedIssueId('');
    }
    setShowAssignIssueModal(true);
  };

  const handleAssignPaperToIssue = async () => {
    if (!assignIssuePaper || !selectedIssueId) return;

    const issueId = parseInt(selectedIssueId, 10);
    if (Number.isNaN(issueId)) {
      setAlert({ type: 'error', message: 'Invalid issue ID.' });
      return;
    }

    try {
      setAssignIssueSubmitting(true);
      const result = await mockAPI.assignPaperToIssue(assignIssuePaper.id, issueId);
      if (result.success) {
        setAlert({ type: 'success', message: 'Paper assigned to issue successfully.' });
        setShowAssignIssueModal(false);
        setAssignIssuePaper(null);
        setSelectedIssueId('');
        loadAdminData(); // Refresh admin data after assigning paper to issue
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to assign paper to issue.' });
      }
    } catch (error) {
      console.error('Error assigning paper to issue:', error);
      setAlert({ type: 'error', message: 'An error occurred while assigning the paper to an issue.' });
    } finally {
      setAssignIssueSubmitting(false);
    }
  };

  const handleIssueFormChange = (e) => {
    const { name, value } = e.target;
    setIssueForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImportantDateChange = (label, value) => {
    setImportantDates((prev) => ({
      ...prev,
      [label]: value,
    }));
  };

  const handleSaveImportantDates = async () => {
    try {
      setImportantDatesSaving(true);
      const result = await mockAPI.saveImportantDates(importantDates);
      if (result.success) {
        setAlert({ type: 'success', message: 'Important Dates updated successfully.' });
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save Important Dates.' });
      }
    } catch (err) {
      console.error('Failed to save important dates', err);
      setAlert({ type: 'error', message: 'Failed to save Important Dates.' });
    } finally {
      setImportantDatesSaving(false);
    }
  };

  const handleAddIssue = async (e) => {
    e.preventDefault();

    try {
      const volume = parseInt(issueForm.volume, 10);
      const issueNumber = parseInt(issueForm.issue, 10);
      const year = parseInt(issueForm.year, 10);

      const result = await mockAPI.createIssue({
        volume,
        issue: issueNumber,
        month: issueForm.month,
        year,
      });

      if (result.success && result.issue) {
        setIssues(prev => [result.issue, ...prev].sort((a, b) => b.year - a.year || b.issue - a.issue));
        setIssueForm({ volume: '', issue: '', month: '', year: '' });
        setAlert({ type: 'success', message: 'New issue added successfully.' });
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to add issue.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while adding the issue.' });
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      const result = await mockAPI.deleteIssue(issueId);
      if (result.success) {
        setIssues(prev => prev.filter(issue => issue.id !== issueId));
        setAlert({ type: 'success', message: 'Issue deleted successfully.' });
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to delete issue.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while deleting the issue.' });
    }
  };

  const handleSetCurrentIssue = async (issueId) => {
    try {
      const result = await mockAPI.setCurrentIssue(issueId);
      if (result.success && result.issue) {
        const updated = result.issue;
        setIssues(prev =>
          prev.map(issue => ({
            ...issue,
            isCurrent: issue.id === updated.id,
          }))
        );
        setAlert({ type: 'success', message: 'Current issue has been updated.' });
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to update current issue.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'An error occurred while updating the current issue.' });
    }
  };

  const handleIssueClick = async (issue) => {
    if (!issue) return;

    if (expandedIssueId === issue.id) {
      setExpandedIssueId(null);
      return;
    }

    setExpandedIssueId(issue.id);

    if (issuePapersByIssueId[issue.id]) {
      return;
    }

    try {
      setIssuePapersLoadingId(issue.id);
      const papers = await mockAPI.getIssuePapers(issue.id);
      setIssuePapersByIssueId((prev) => ({
        ...prev,
        [issue.id]: papers || [],
      }));
    } catch (error) {
      console.error('Error loading papers for issue', issue.id, error);
      setIssuePapersByIssueId((prev) => ({
        ...prev,
        [issue.id]: [],
      }));
      setIssuePapersLoadingId(null);
    }
  };

  const reviewerSearch = searchTerm.trim().toLowerCase();

  let filteredReviewers = reviewers.filter((reviewer) => {
    const name = (reviewer.name || '').toLowerCase();
    const email = (reviewer.email || '').toLowerCase();
    const affiliation = (reviewer.affiliation || '').toLowerCase();

    if (!reviewerSearch) return true;

    return (
      name.includes(reviewerSearch) ||
      email.includes(reviewerSearch) ||
      affiliation.includes(reviewerSearch)
    );
  });

  filteredReviewers = [...filteredReviewers].sort((a, b) => {
    if (reviewerSortBy === 'name_az') {
      return (a.name || '').localeCompare(b.name || '');
    }

    if (reviewerSortBy === 'name_za') {
      return (b.name || '').localeCompare(a.name || '');
    }

    if (reviewerSortBy === 'affiliation_az') {
      return (a.affiliation || '').localeCompare(b.affiliation || '');
    }

    return 0;
  });

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

  const adminSearch = adminSearchTerm.trim().toLowerCase();

  const matchesAdminSearch = (paper) => {
    if (!adminSearch) return true;

    const title = (paper.title || '').toLowerCase();
    const abstract = (paper.abstract || '').toLowerCase();
    const category = (paper.category || '').toLowerCase();
    const authorsText = Array.isArray(paper.authors) ? paper.authors.join(' ').toLowerCase() : String(paper.authors || '').toLowerCase();

    return (
      title.includes(adminSearch) ||
      abstract.includes(adminSearch) ||
      category.includes(adminSearch) ||
      authorsText.includes(adminSearch)
    );
  };

  const adminUnfinishedStatuses = ['submitted', 'under_review', 'revisions_requested'];

  let visibleAdminPapers = (papers || []).filter(matchesAdminSearch);

  if (!adminShowAllPapers) {
    visibleAdminPapers = visibleAdminPapers.filter(paper => adminUnfinishedStatuses.includes(paper.status));
  }

  visibleAdminPapers = [...visibleAdminPapers].sort((a, b) => {
    if (adminSortBy === 'title_az') {
      return (a.title || '').localeCompare(b.title || '');
    }

    if (adminSortBy === 'title_za') {
      return (b.title || '').localeCompare(a.title || '');
    }

    const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);
    const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);

    if (adminSortBy === 'oldest') {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  const underReviewPapersBase = (papers || []).filter(
    (p) => p.status === 'under_review' || p.status === 'revisions_requested'
  );

  let visibleUnderReviewPapers = underReviewPapersBase.filter(matchesAdminSearch);

  visibleUnderReviewPapers = [...visibleUnderReviewPapers].sort((a, b) => {
    if (adminSortBy === 'title_az') {
      return (a.title || '').localeCompare(b.title || '');
    }

    if (adminSortBy === 'title_za') {
      return (b.title || '').localeCompare(a.title || '');
    }

    const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);
    const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);

    if (adminSortBy === 'oldest') {
      return dateA - dateB;
    }

    return dateB - dateA;
  });

  const hasRevisedManuscript = (paper) => {
    if (!paper || !paper.title || !Array.isArray(adminNotifications)) return false;
    return adminNotifications.some((n) =>
      n && n.title === 'Revised manuscript uploaded' &&
      typeof n.message === 'string' && n.message.includes(paper.title)
    );
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading admin data..." />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="journal-container">
        <div className="dash-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome back, <strong>{user.name}</strong>. Manage submissions and reviewer assignments.</p>
          </div>
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

        {showAdminSubmitModal && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div className="modal-panel-header">
                <h2>Submit New Paper (Admin)</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (adminSubmittingPaper) return;
                    setShowAdminSubmitModal(false);
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAdminSubmitNewPaper} className="modal-panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Corresponding Author Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={adminSubmitForm.fullName}
                      onChange={handleAdminSubmitFormChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Corresponding Author Email</label>
                    <input
                      type="email"
                      name="email"
                      value={adminSubmitForm.email}
                      onChange={handleAdminSubmitFormChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Affiliation</label>
                  <input
                    type="text"
                    name="affiliation"
                    value={adminSubmitForm.affiliation}
                    onChange={handleAdminSubmitFormChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Paper Title</label>
                  <input
                    type="text"
                    name="paperTitle"
                    value={adminSubmitForm.paperTitle}
                    onChange={handleAdminSubmitFormChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Keywords (comma-separated)</label>
                  <input
                    type="text"
                    name="keywords"
                    value={adminSubmitForm.keywords}
                    onChange={handleAdminSubmitFormChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Abstract / Comments</label>
                  <textarea
                    name="comments"
                    value={adminSubmitForm.comments}
                    onChange={handleAdminSubmitFormChange}
                    className="form-textarea"
                    rows={5}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <label style={{ margin: 0 }}>Co-authors</label>
                    <button
                      type="button"
                      onClick={addAdminCoAuthor}
                      className="icon-btn"
                    >
                      Add Co-author
                    </button>
                  </div>

                  {(adminSubmitCoAuthors || []).length === 0 ? (
                    <div className="dash-empty">No co-authors added.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(adminSubmitCoAuthors || []).map((co, idx) => (
                        <div key={idx} style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 10 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            <input
                              type="text"
                              value={co.fullName}
                              onChange={(e) => updateAdminCoAuthor(idx, 'fullName', e.target.value)}
                              placeholder="Name"
                              className="form-input"
                            />
                            <input
                              type="text"
                              value={co.affiliation}
                              onChange={(e) => updateAdminCoAuthor(idx, 'affiliation', e.target.value)}
                              placeholder="Affiliation"
                              className="form-input"
                            />
                            <input
                              type="email"
                              value={co.email}
                              onChange={(e) => updateAdminCoAuthor(idx, 'email', e.target.value)}
                              placeholder="Email"
                              className="form-input"
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                            <button
                              type="button"
                              onClick={() => removeAdminCoAuthor(idx)}
                              className="icon-btn"
                              style={{ color: '#c0342c' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Manuscript (PDF)</label>
                  <input
                    type="file"
                    name="manuscriptFile"
                    accept="application/pdf"
                    onChange={handleAdminSubmitFormChange}
                    required
                  />
                </div>

                <div className="modal-panel-footer" style={{ padding: 0, border: 0, background: 'none' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdminSubmitModal(false)}
                    disabled={adminSubmittingPaper}
                    className="button button-outline"
                    style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminSubmittingPaper}
                    className="button button-primary"
                  >
                    {adminSubmittingPaper ? 'Submitting...' : 'Submit Paper'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReplaceFilesModal && replaceFilesPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 500 }}>
              <div className="modal-panel-header">
                <h2>Upload/Replace Paper Files</h2>
                <button
                  type="button"
                  onClick={closeReplaceFilesModal}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 14 }}>{replaceFilesPaper.title}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>New Manuscript (optional)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setReplaceManuscriptFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>New Copyright Form (optional)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setReplaceCopyrightFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={closeReplaceFilesModal}
                  disabled={replaceFilesSubmitting}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReplaceFiles}
                  disabled={replaceFilesSubmitting}
                  className="button button-primary"
                >
                  {replaceFilesSubmitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPdfViewerModal && pdfViewerPaper && (
          <div className="paper-modal-overlay">
            <div className="paper-modal" style={{ maxWidth: 1100 }}>
              <div className="paper-modal-header">
                <div style={{ minWidth: 0 }}>
                  <h2>{pdfViewerPaper.title}</h2>
                  <p>Paper ID: {pdfViewerPaper.id}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pdfViewerPaper.pdfUrl && (
                    <a
                      href={pdfViewerPaper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-primary button-small"
                    >
                      Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closePdfViewer}
                    className="paper-modal-close"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="paper-modal-body">
                {pdfViewerError ? (
                  <div className="pdf-unavailable">{pdfViewerError}</div>
                ) : (
                  <Document
                    file={pdfViewerPaper.pdfUrl}
                    onLoadSuccess={onPdfLoadSuccess}
                    loading={<div className="pdf-unavailable"><LoadingSpinner size="sm" text="Loading PDF..." /></div>}
                    error={<div className="pdf-unavailable">Failed to load PDF.</div>}
                    onLoadError={() => setPdfViewerError('Failed to load PDF.')}
                  >
                    <Page pageNumber={pdfPageNumber} height={700} scale={pdfZoom} />
                  </Document>
                )}

                {pdfNumPages && (
                  <div className="viewer-controls">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handlePdfZoomOut}
                        className="button button-dark button-small"
                        disabled={pdfZoom <= 0.5}
                      >
                        -
                      </button>
                      <span>{Math.round(pdfZoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={handlePdfZoomIn}
                        className="button button-dark button-small"
                        disabled={pdfZoom >= 2}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={handlePdfResetZoom}
                        className="button button-dark button-small"
                      >
                        Reset
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={handlePdfPrevPage}
                        disabled={pdfPageNumber <= 1}
                        className="button button-dark button-small"
                      >
                        Previous
                      </button>
                      <span>
                        Page {pdfPageNumber} of {pdfNumPages}
                      </span>
                      <button
                        type="button"
                        onClick={handlePdfNextPage}
                        disabled={pdfNumPages && pdfPageNumber >= pdfNumPages}
                        className="button button-dark button-small"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            Pending Assignment ({stats.submitted})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`dash-tab ${activeTab === 'issues' ? 'is-active' : ''}`}
          >
            Journal Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`dash-tab ${activeTab === 'review' ? 'is-active' : ''}`}
          >
            Under Review ({stats.under_review})
          </button>
          <button
            onClick={() => setActiveTab('important_dates')}
            className={`dash-tab ${activeTab === 'important_dates' ? 'is-active' : ''}`}
          >
            Important Dates
          </button>
          <button
            onClick={() => setActiveTab('editorial_board')}
            className={`dash-tab ${activeTab === 'editorial_board' ? 'is-active' : ''}`}
          >
            Editorial Board
          </button>
        </div>

        {activeTab === 'important_dates' && (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>Important Dates</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 10 }}>
                  Update the dates shown on the Call for Papers page.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveImportantDates}
                disabled={importantDatesSaving}
                className="button button-primary button-small"
              >
                {importantDatesSaving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {importantDatesLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {Object.entries(importantDates).map(([label, value]) => (
                  <div key={label} className="form-group" style={{ border: '1px solid var(--line)', borderRadius: 5, padding: 14, marginBottom: 0 }}>
                    <label>{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleImportantDateChange(label, e.target.value)}
                      className="form-input"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'editorial_board' && (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>Editorial Board</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 10 }}>
                  Search members by name/section/email. Drag to reorder (saved automatically) or click to edit.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={openAddEditorialModal}
                  className="icon-btn"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditorialBoard}
                  disabled={editorialBoardSaving}
                  className="button button-primary button-small"
                >
                  {editorialBoardSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="search-bar">
              <input
                type="text"
                value={editorialSearchTerm}
                onChange={(e) => setEditorialSearchTerm(e.target.value)}
                placeholder="Search by name, section, affiliation, email..."
                className="form-input"
                style={{ maxWidth: 420 }}
              />
            </div>

            {editorialBoardLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <div style={{ border: '1px solid var(--line)', borderRadius: 5 }}>
                {(editorialBoard || []).filter((m) => {
                  if (!editorialSearchTerm.trim()) return true;
                  const q = editorialSearchTerm.toLowerCase();
                  return (
                    (m?.name || '').toLowerCase().includes(q) ||
                    (m?.section || '').toLowerCase().includes(q) ||
                    (m?.email || '').toLowerCase().includes(q) ||
                    (m?.affiliation || '').toLowerCase().includes(q)
                  );
                }).map((m) => {
                  const all = editorialBoard || [];
                  const fromIndex = all.findIndex((x) => x?.id === m?.id);
                  const isDragging = draggingEditorialId && draggingEditorialId === m?.id;

                  return (
                    <div
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => {
                        setDraggingEditorialId(m?.id || null);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(m?.id || ''));
                      }}
                      onDragEnd={() => setDraggingEditorialId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/plain');
                        if (!draggedId) return;
                        const toIndex = all.findIndex((x) => String(x?.id || '') === String(m?.id || ''));
                        const resolvedFromIndex = all.findIndex((x) => String(x?.id || '') === String(draggedId));
                        if (resolvedFromIndex < 0 || toIndex < 0) return;
                        await reorderEditorialBoard(resolvedFromIndex, toIndex);
                      }}
                      onClick={() => openEditEditorialModal(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openEditEditorialModal(m);
                      }}
                      style={{
                        padding: '11px 14px',
                        borderBottom: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        cursor: 'pointer',
                        opacity: isDragging ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ color: 'var(--muted)', userSelect: 'none' }}>⋮⋮</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>
                            {m.name || '(No name)'}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--muted)' }}>
                            {m.section || 'Editorial Board'}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--muted)' }}>{fromIndex >= 0 ? fromIndex + 1 : '—'}</div>
                    </div>
                  );
                })}

                {(editorialBoard || []).length === 0 && (
                  <div className="dash-empty">No members found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {showEditorialModal && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <div className="modal-panel-header">
                <h2>{editingEditorialId ? 'Edit Member' : 'Add Member'}</h2>
                <button
                  type="button"
                  onClick={closeEditorialModal}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Section</label>
                    <input
                      type="text"
                      value={editorialDraft.section}
                      onChange={(e) => handleEditorialDraftChange('section', e.target.value)}
                      className="form-input"
                      placeholder="e.g., Editor-in-Chief"
                    />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editorialDraft.name}
                      onChange={(e) => handleEditorialDraftChange('name', e.target.value)}
                      className="form-input"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Title / Designation</label>
                    <input
                      type="text"
                      value={editorialDraft.title}
                      onChange={(e) => handleEditorialDraftChange('title', e.target.value)}
                      className="form-input"
                      placeholder="e.g., Professor, Dept. of ..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Affiliation</label>
                    <input
                      type="text"
                      value={editorialDraft.affiliation}
                      onChange={(e) => handleEditorialDraftChange('affiliation', e.target.value)}
                      className="form-input"
                      placeholder="Institute / Organization"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={editorialDraft.email}
                      onChange={(e) => handleEditorialDraftChange('email', e.target.value)}
                      className="form-input"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Affiliated Institutional profile URL</label>
                    <input
                      type="url"
                      value={editorialDraft.profileUrl}
                      onChange={(e) => handleEditorialDraftChange('profileUrl', e.target.value)}
                      className="form-input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-panel-footer" style={{ justifyContent: 'space-between' }}>
                {editingEditorialId ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveEditorialMember(editingEditorialId);
                      closeEditorialModal();
                    }}
                    className="icon-btn"
                    style={{ color: '#c0342c' }}
                  >
                    Delete
                  </button>
                ) : <span />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={closeEditorialModal}
                    className="button button-outline"
                    style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditorialDraft}
                    className="button button-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeletePaperModal && deleteModalPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 480 }}>
              <div className="modal-panel-header">
                <h2>Delete Paper</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteSubmitting) return;
                    setShowDeletePaperModal(false);
                    setDeleteModalPaper(null);
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <p style={{ margin: '0 0 14px', color: 'var(--ink)', fontSize: 11 }}>
                  Are you sure you want to delete this paper?
                </p>
                <div style={{ background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>{deleteModalPaper.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
                    ID: {deleteModalPaper.id}
                  </div>
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={() => {
                    if (deleteSubmitting) return;
                    setShowDeletePaperModal(false);
                    setDeleteModalPaper(null);
                  }}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePaper}
                  disabled={deleteSubmitting}
                  className="button button-primary"
                  style={{ background: '#c0342c' }}
                >
                  {deleteSubmitting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Papers List */}
        {activeTab === 'submissions' && (
          <>
            <div className="search-bar" style={{ justifyContent: 'space-between' }}>
              <input
                type="text"
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="form-input"
                style={{ maxWidth: 380 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAdminSubmitModal(true)}
                  className="button button-primary button-small"
                >
                  Submit New Paper
                </button>
                <select
                  value={adminSortBy}
                  onChange={(e) => setAdminSortBy(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto' }}
                >
                  <option value="recent">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title_az">Title A-Z</option>
                  <option value="title_za">Title Z-A</option>
                </select>
                <button
                  type="button"
                  onClick={() => setAdminShowAllPapers(prev => !prev)}
                  className="icon-btn"
                >
                  {adminShowAllPapers ? 'Show unfinished only' : 'View all papers'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {visibleAdminPapers.map(paper => (
                <div key={paper.id} className="dash-panel" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: 13 }}>{paper.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => openDeletePaperModal(paper)}
                        className="icon-btn"
                        style={{ color: '#c0342c' }}
                        title="Delete paper"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                          <path fillRule="evenodd" d="M8.5 3a1 1 0 00-1 1v1H5a1 1 0 000 2h.293l.853 10.24A2 2 0 008.14 19h3.72a2 2 0 001.994-1.76L14.707 7H15a1 1 0 100-2h-2.5V4a1 1 0 00-1-1h-3zM9.5 5V4h1v1h-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className={`badge ${
                        paper.status === 'published' ? 'badge-success' :
                        paper.status === 'under_review' ? 'badge-warning' :
                        paper.status === 'submitted' ? 'badge-info' :
                        'badge-danger'
                      }`}>
                        {paper.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <span className={`badge ${paper.paymentStatus === 'paid' ? 'badge-success' : 'badge-neutral'}`}>
                      {paper.paymentStatus === 'paid' ? 'PAYMENT: PAID' : 'PAYMENT: PENDING'}
                    </span>
                  </div>

                  <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: 'var(--ink)' }}>
                    <div><strong>Authors:</strong> {paper.authors.join(', ')}</div>
                    <div><strong>Category:</strong> {paper.category}</div>
                    <div><strong>Submitted:</strong> {new Date(paper.submissionDate).toLocaleDateString()}</div>
                    {paper.doi && <div><strong>DOI:</strong> {paper.doi}</div>}
                  </div>

                  <p style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 18 }}>{paper.abstract}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {paper.pdfUrl && (
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-primary button-small"
                      >
                        Download Paper
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openReplaceFilesModal(paper)}
                      className="button button-dark button-small"
                    >
                      Upload / Replace
                    </button>
                    {paper.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handlePublishPaper(paper.id)}
                        className="button button-outline button-small"
                        style={{ color: 'var(--navy)', borderColor: 'var(--line)' }}
                      >
                        Publish Paper
                      </button>
                    )}
                  </div>

                  {paper.status === 'published' && issues.length > 0 && (
                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--line)', marginBottom: 14 }}>
                      {paper.assignedIssue ? (
                        <span className="badge badge-success">
                          Assigned to Volume {paper.assignedIssue.volume}, Issue {paper.assignedIssue.issue}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAssignPaperToIssueModal(paper)}
                          className="button button-primary button-small"
                        >
                          Add to Journal Issue
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {paper.keywords.map((keyword, index) => (
                      <span key={index} className="badge badge-neutral">
                        {keyword}
                      </span>
                    ))}
                  </div>

                  {paper.assignedReviewers && (
                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--muted)' }}>
                      <strong>Assigned Reviewers:</strong> {paper.assignedReviewers.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pending Assignment */}
        {activeTab === 'pending' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {papers.filter(p => p.status === 'submitted').map(paper => (
              <div key={paper.id} className="dash-panel" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: 13 }}>{paper.title}</h3>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setPendingMenuPaperId((prev) => (prev === paper.id ? null : paper.id))}
                        className="icon-btn"
                        title="Actions"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ width: 12, height: 12 }}>
                          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.16l3.71-3.93a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                        </svg>
                      </button>

                      {pendingMenuPaperId === paper.id && (
                        <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 160, background: '#fff', border: '1px solid var(--line)', borderRadius: 6, boxShadow: '0 12px 24px #143b5720', zIndex: 10 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingMenuPaperId(null);
                              setQuickPublishPaper(paper);
                              setShowQuickPublishModal(true);
                            }}
                            style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 10, color: 'var(--ink)', background: 'none', border: 0, cursor: 'pointer' }}
                          >
                            Publish Paper
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => openDeletePaperModal(paper)}
                      className="icon-btn"
                      style={{ color: '#c0342c' }}
                      title="Delete paper"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                        <path fillRule="evenodd" d="M8.5 3a1 1 0 00-1 1v1H5a1 1 0 000 2h.293l.853 10.24A2 2 0 008.14 19h3.72a2 2 0 001.994-1.76L14.707 7H15a1 1 0 100-2h-2.5V4a1 1 0 00-1-1h-3zM9.5 5V4h1v1h-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="badge badge-warning">
                      PENDING ASSIGNMENT
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: 'var(--ink)' }}>
                  <div><strong>Authors:</strong> {paper.authors.join(', ')}</div>
                  <div><strong>Category:</strong> {paper.category}</div>
                  <div><strong>Submitted:</strong> {new Date(paper.submissionDate).toLocaleDateString()}</div>
                </div>

                <p style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 18 }}>{paper.abstract}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-primary button-small"
                    >
                      Download Paper
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openReplaceFilesModal(paper)}
                    className="button button-dark button-small"
                  >
                    Upload / Replace
                  </button>
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <button
                    onClick={() => {
                      setSelectedPaper(paper);
                      setShowAssignModal(true);
                    }}
                    className="button button-primary"
                    style={{ width: '100%' }}
                  >
                    Assign Reviewer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showQuickPublishModal && quickPublishPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 460 }}>
              <div className="modal-panel-header">
                <h2>Publish Paper</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickPublishModal(false);
                    setQuickPublishPaper(null);
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>
              <div className="modal-panel-body">
                <p style={{ margin: '0 0 14px', color: 'var(--ink)', fontSize: 11 }}>Are you sure you want to publish this paper?</p>
                <div style={{ background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>{quickPublishPaper.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>ID: {quickPublishPaper.id}</div>
                </div>
              </div>
              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickPublishModal(false);
                    setQuickPublishPaper(null);
                  }}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const paperId = quickPublishPaper.id;
                    setShowQuickPublishModal(false);
                    setQuickPublishPaper(null);
                    await handlePublishPaper(paperId);
                  }}
                  className="button button-primary"
                >
                  Yes, Publish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Under Review */}
        {activeTab === 'review' && (
          <>
            <div className="search-bar" style={{ justifyContent: 'space-between' }}>
              <input
                type="text"
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                placeholder="Search by title, author, category..."
                className="form-input"
                style={{ maxWidth: 380 }}
              />
              <select
                value={adminSortBy}
                onChange={(e) => setAdminSortBy(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title_az">Title A-Z</option>
                <option value="title_za">Title Z-A</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {visibleUnderReviewPapers.map(paper => {
                const reviews = paperReviews[paper.id] || [];
                const latestRecommendation = reviews[0]?.recommendation || '';

                return (
                  <div key={paper.id} className="dash-panel" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, marginRight: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: 13 }}>{paper.title}</h3>
                        {paper.status === 'revisions_requested' && (
                          <span className="badge badge-warning">
                            Revision requested / waiting for updated manuscript
                          </span>
                        )}
                        {hasRevisedManuscript(paper) && (
                          <span className="badge badge-info">
                            Revised manuscript received
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => openDeletePaperModal(paper)}
                          className="icon-btn"
                          style={{ color: '#c0342c' }}
                          title="Delete paper"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                            <path fillRule="evenodd" d="M8.5 3a1 1 0 00-1 1v1H5a1 1 0 000 2h.293l.853 10.24A2 2 0 008.14 19h3.72a2 2 0 001.994-1.76L14.707 7H15a1 1 0 100-2h-2.5V4a1 1 0 00-1-1h-3zM9.5 5V4h1v1h-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="badge badge-warning" style={{ whiteSpace: 'nowrap' }}>
                          UNDER REVIEW
                        </span>
                      </div>
                    </div>

                    {reviews.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewsModalPaper(paper);
                            setReviewsModalReviews(reviews);
                            setShowReviewsModal(true);
                          }}
                          className="icon-btn"
                        >
                          View all reviews
                        </button>
                      </div>
                    )}

                    <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: 'var(--ink)' }}>
                      <div><strong>Authors:</strong> {paper.authors.join(', ')}</div>
                      <div><strong>Category:</strong> {paper.category}</div>
                      <div><strong>Submitted:</strong> {new Date(paper.submissionDate).toLocaleDateString()}</div>
                      {paper.reviewDeadline && (
                        <div><strong>Deadline:</strong> {new Date(paper.reviewDeadline).toLocaleDateString()}</div>
                      )}
                    </div>

                    <p style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 18 }}>{paper.abstract}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                      {paper.pdfUrl && (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button button-primary button-small"
                        >
                          Download Paper
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openReplaceFilesModal(paper)}
                        className="button button-dark button-small"
                      >
                        Upload / Replace
                      </button>
                      {paper.status !== 'revisions_requested' && (
                        <button
                          type="button"
                          onClick={() => openRequestRevisionsModal(paper)}
                          className="button button-outline button-small"
                          style={{ color: '#b4700a', borderColor: '#fef3e0' }}
                        >
                          Request Revisions
                        </button>
                      )}
                    </div>

                    {paper.assignedReviewers && (
                      <div style={{ marginBottom: 18, fontSize: 10, color: 'var(--muted)' }}>
                        <strong>Assigned Reviewers:</strong> {paper.assignedReviewers.length}
                      </div>
                    )}

                    {reviews.length > 0 && (
                      <div style={{ marginBottom: 18, fontSize: 10, color: 'var(--ink)' }}>
                        <strong>Completed Reviews:</strong> {reviews.length}
                        {latestRecommendation && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewsModalPaper(paper);
                              setReviewsModalReviews(reviews);
                              setShowReviewsModal(true);
                            }}
                            className="badge badge-info"
                            style={{ marginLeft: 10, border: 0, cursor: 'pointer' }}
                          >
                            Recommendation: {latestRecommendation.replace('_', ' ')}
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handlePublishPaper(paper.id)}
                          className="button button-primary button-small"
                          style={{ flex: 1 }}
                        >
                          Publish Paper
                        </button>

                        <button
                          onClick={() => {
                            setSelectedPaper(paper);
                            setShowAssignModal(true);
                          }}
                          className="button button-outline button-small"
                          style={{ flex: 1, color: 'var(--ink)', borderColor: 'var(--line)' }}
                        >
                          Assign More
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Journal Issues Management */}
        {activeTab === 'issues' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div>
              <h3 style={{ color: 'var(--navy)', fontSize: 14, margin: '0 0 14px' }}>All Issues</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {issues.map(issue => (
                  <div key={issue.id} className="dash-panel" style={{ marginBottom: 0, borderLeft: issue.isCurrent ? '3px solid #0f7b3d' : '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>
                          Volume {issue.volume}, Issue {issue.issue} ({issue.month} {issue.year})
                        </p>
                        {issue.isCurrent && (
                          <span className="badge badge-success" style={{ marginTop: 6 }}>
                            Current Issue
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => handleIssueClick(issue)}
                          className="icon-btn"
                        >
                          {expandedIssueId === issue.id ? 'Hide Papers' : 'View Papers'}
                        </button>
                        {!issue.isCurrent && (
                          <button
                            onClick={() => handleSetCurrentIssue(issue.id)}
                            className="icon-btn"
                          >
                            Set as Current
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="icon-btn"
                          style={{ color: '#c0342c' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expandedIssueId === issue.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 10 }}>
                        {issuePapersLoadingId === issue.id ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>Loading papers for this issue...</p>
                        ) : (issuePapersByIssueId[issue.id] || []).length === 0 ? (
                          <p style={{ color: 'var(--muted)', margin: 0 }}>No papers have been assigned to this issue yet.</p>
                        ) : (
                          (issuePapersByIssueId[issue.id] || []).map((paper) => (
                            <div key={paper.id} style={{ display: 'flex', flexDirection: 'column' }}>
                              <a
                                href={paper.pdfUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontWeight: 700, color: 'var(--blue)' }}
                              >
                                {paper.title}
                              </a>
                              <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                                {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ color: 'var(--navy)', fontSize: 14, margin: '0 0 14px' }}>Add New Issue</h3>
              <form onSubmit={handleAddIssue} className="dash-panel">
                <div className="form-group">
                  <label htmlFor="volume">Volume</label>
                  <input
                    type="number"
                    name="volume"
                    id="volume"
                    value={issueForm.volume}
                    onChange={handleIssueFormChange}
                    required
                    className="form-input"
                    placeholder="e.g., 3"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issue">Issue</label>
                  <input
                    type="number"
                    name="issue"
                    id="issue"
                    value={issueForm.issue}
                    onChange={handleIssueFormChange}
                    required
                    className="form-input"
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="month">Month</label>
                  <input
                    type="text"
                    name="month"
                    id="month"
                    value={issueForm.month}
                    onChange={handleIssueFormChange}
                    required
                    className="form-input"
                    placeholder="e.g., December"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="year">Year</label>
                  <input
                    type="number"
                    name="year"
                    id="year"
                    value={issueForm.year}
                    onChange={handleIssueFormChange}
                    required
                    className="form-input"
                    placeholder="e.g., 2025"
                  />
                </div>
                <button
                  type="submit"
                  className="button button-primary"
                  style={{ width: '100%' }}
                >
                  Add Issue
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'pending' && papers.filter(p => p.status === 'submitted').length === 0 && (
          <div className="dash-empty">
            <h3 style={{ margin: '0 0 6px', color: 'var(--navy)', fontSize: 13 }}>All Papers Assigned</h3>
            <p style={{ margin: 0 }}>
              All submitted papers have been assigned to reviewers. Check back later for new submissions.
            </p>
          </div>
        )}

        {activeTab === 'review' && papers.filter(p => p.status === 'under_review').length === 0 && (
          <div className="dash-empty">
            <h3 style={{ margin: '0 0 6px', color: 'var(--navy)', fontSize: 13 }}>No Papers Under Review</h3>
            <p style={{ margin: 0 }}>
              Papers currently under review will appear here. You can assign reviewers to pending papers.
            </p>
          </div>
        )}

        {/* Assign Reviewer Modal */}
        {showAssignModal && selectedPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 680 }}>
              <div className="modal-panel-header">
                <h2>Assign Reviewer</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ marginBottom: 18, background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--navy)', fontSize: 12 }}>{selectedPaper.title}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: 'var(--ink)' }}>
                    <div><strong>Authors:</strong> {selectedPaper.authors.join(', ')}</div>
                    <div><strong>Category:</strong> {selectedPaper.category}</div>
                    <div><strong>Submitted:</strong> {new Date(selectedPaper.submissionDate).toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }} ref={dropdownRef}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: 200 }}>
                      <label>Search Reviewers</label>
                      <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or affiliation..."
                        className="form-input"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, width: 200 }}>
                      <label>Sort By</label>
                      <select
                        value={reviewerSortBy}
                        onChange={(e) => setReviewerSortBy(e.target.value)}
                        className="form-select"
                      >
                        <option value="name_az">Name A-Z</option>
                        <option value="name_za">Name Z-A</option>
                        <option value="affiliation_az">Affiliation A-Z</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--line)', borderRadius: 5, maxHeight: 280, overflowY: 'auto' }}>
                    {filteredReviewers.length > 0 ? (
                      filteredReviewers.map((reviewer) => (
                        <button
                          type="button"
                          key={reviewer.id}
                          onClick={() => {
                            setSelectedReviewer(String(reviewer.id));
                            setSearchTerm(reviewer.name || reviewer.email || '');
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                            border: 0,
                            borderBottom: '1px solid var(--line)',
                            borderLeft: selectedReviewer === String(reviewer.id) ? '3px solid var(--blue)' : '3px solid transparent',
                            background: selectedReviewer === String(reviewer.id) ? 'var(--sky)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>
                              {reviewer.name || 'Unnamed reviewer'}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--muted)' }}>
                              {reviewer.email && <span>{reviewer.email}</span>}
                              {reviewer.affiliation && (
                                <span style={{ marginLeft: 4 }}>
                                  • {reviewer.affiliation}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="dash-empty" style={{ border: 0 }}>
                        No reviewers found. Try a different search.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignReviewer}
                  disabled={assigning || !selectedReviewer}
                  className="button button-primary"
                >
                  {assigning ? 'Assigning...' : 'Assign Reviewer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Modal */}
        {showReviewsModal && reviewsModalPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 680 }}>
              <div className="modal-panel-header">
                <h2>Reviews for this paper</h2>
                <button
                  onClick={() => setShowReviewsModal(false)}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ marginBottom: 14, background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--navy)', fontSize: 12 }}>{reviewsModalPaper.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 10 }}>Authors: {reviewsModalPaper.authors.join(', ')}</p>
                </div>

                {reviewsModalReviews.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 11 }}>No reviews have been submitted yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {reviewsModalReviews.map(review => (
                      <div key={review.id} style={{ border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>
                              Reviewer: {review.reviewerName || `#${review.reviewerId}`}
                            </p>
                            <p style={{ margin: 0, fontSize: 9, color: 'var(--muted)' }}>
                              Submitted on {review.submittedDate ? new Date(review.submittedDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 11 }}>
                            Rating: {review.rating}/5
                          </div>
                        </div>
                        <p style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 10 }}>
                          <strong>Recommendation:</strong> {review.recommendation.replace('_', ' ')}
                        </p>
                        <p style={{ margin: 0, color: 'var(--ink)', fontSize: 10, whiteSpace: 'pre-line' }}>
                          {review.comments}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-panel-footer" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => openRequestRevisionsModal(reviewsModalPaper)}
                  className="button button-outline button-small"
                  style={{ color: '#b4700a', borderColor: '#fef3e0' }}
                >
                  Request Revisions
                </button>
                <button
                  type="button"
                  onClick={() => openRejectPaperModal(reviewsModalPaper)}
                  className="button button-outline button-small"
                  style={{ color: '#c0342c', borderColor: '#fde8e8' }}
                >
                  Reject Paper
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewsModal(false)}
                  className="button button-outline button-small"
                  style={{ marginLeft: 'auto', color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Revisions Modal */}
        {showRevisionModal && revisionModalPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 520 }}>
              <div className="modal-panel-header">
                <h2>Request Revisions</h2>
                <button
                  onClick={() => {
                    setShowRevisionModal(false);
                    setRevisionModalPaper(null);
                    setRevisionNote('');
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ marginBottom: 14, background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--navy)', fontSize: 12 }}>{revisionModalPaper.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 9 }}>
                    This message will be sent to the author. Please clearly describe the requested changes.
                  </p>
                </div>

                <div className="form-group">
                  <label>Message to author</label>
                  <textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    rows={5}
                    className="form-textarea"
                    placeholder="Describe the requested revisions..."
                  />
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowRevisionModal(false);
                    setRevisionModalPaper(null);
                    setRevisionNote('');
                  }}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestRevisions}
                  disabled={revisionSubmitting || !revisionNote.trim()}
                  className="button button-primary"
                >
                  {revisionSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Paper Modal */}
        {showRejectModal && rejectModalPaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 520 }}>
              <div className="modal-panel-header">
                <h2>Reject Paper</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectModalPaper(null);
                    setRejectNote('');
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ marginBottom: 14, background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--navy)', fontSize: 12 }}>{rejectModalPaper.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 9 }}>
                    You can optionally include a short note explaining the reason for rejection. This will be shared with the author.
                  </p>
                </div>

                <div className="form-group">
                  <label>Optional note to author</label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={4}
                    className="form-textarea"
                    placeholder="Explain briefly why the paper is being rejected (optional)."
                  />
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectModalPaper(null);
                    setRejectNote('');
                  }}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectPaper}
                  disabled={rejectSubmitting}
                  className="button button-primary"
                  style={{ background: '#c0342c' }}
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Reject Paper'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Issue Modal */}
        {showAssignIssueModal && assignIssuePaper && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ maxWidth: 520 }}>
              <div className="modal-panel-header">
                <h2>Assign to Journal Issue</h2>
                <button
                  onClick={() => {
                    setShowAssignIssueModal(false);
                    setAssignIssuePaper(null);
                    setSelectedIssueId('');
                  }}
                  className="modal-panel-close"
                >
                  &times;
                </button>
              </div>

              <div className="modal-panel-body">
                <div style={{ marginBottom: 14, background: '#f4f9fc', border: '1px solid var(--line)', borderRadius: 5, padding: 14 }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--navy)', fontSize: 12 }}>{assignIssuePaper.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 9 }}>
                    Choose a journal issue to which this published paper should belong.
                  </p>
                </div>

                <div className="form-group">
                  <label>Select issue</label>
                  <select
                    value={selectedIssueId}
                    onChange={(e) => setSelectedIssueId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Choose an issue...</option>
                    {issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {`Volume ${issue.volume}, Issue ${issue.issue} (${issue.month} ${issue.year})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-panel-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignIssueModal(false);
                    setAssignIssuePaper(null);
                    setSelectedIssueId('');
                  }}
                  className="button button-outline"
                  style={{ color: 'var(--ink)', borderColor: 'var(--line)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignPaperToIssue}
                  disabled={assignIssueSubmitting || !selectedIssueId}
                  className="button button-primary"
                >
                  {assignIssueSubmitting ? 'Assigning...' : 'Assign to Issue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;