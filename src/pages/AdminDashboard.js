import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import { useToast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import FilePicker from '../components/ui/FilePicker';
import Spinner from '../components/ui/Spinner';
import StatusBadge, { Badge } from '../components/ui/StatusBadge';
import Stars, { RECOMMENDATIONS, recommendationLabel } from '../components/ui/Stars';
import { DashboardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { DashHeader, StatCard, FilterBar, Segmented, SORT_OPTIONS, formatDate, joinAuthors } from '../components/ui/DashHeader';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [paperReviews, setPaperReviews] = useState({});
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Only the first load shows the skeleton; later refreshes keep the current content on screen.
  const hasLoadedOnce = useRef(false);
  useEffect(() => { if (!loading) hasLoadedOnce.current = true; }, [loading]);

  const [issues, setIssues] = useState([]);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [issuePapersByIssueId, setIssuePapersByIssueId] = useState({});
  const [issuePapersLoadingId, setIssuePapersLoadingId] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);

  // UI-only state for the redesigned layout (dialogs and confirmations)
  const [managePaper, setManagePaper] = useState(null);
  const [issueToDelete, setIssueToDelete] = useState(null);
  const [issueDeleting, setIssueDeleting] = useState(false);
  const [confirmMemberDelete, setConfirmMemberDelete] = useState(false);
  const [adminFileError, setAdminFileError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);

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

    if (!adminSubmitForm.manuscriptFile) {
      setAdminFileError('Attach the manuscript PDF before submitting.');
      return;
    }

    try {
      setAdminSubmittingPaper(true);

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
        toast.success('Paper submitted successfully.');
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
        toast.error(result.error || 'Failed to submit paper.');
      }
    } catch (err) {
      console.error('Admin submit paper failed', err);
      toast.error('Failed to submit paper.');
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
      toast.error('Please choose at least one file to upload.');
      return;
    }

    try {
      setReplaceFilesSubmitting(true);
      const result = await mockAPI.adminReplacePaperFiles(replaceFilesPaper.id, {
        manuscriptFile: replaceManuscriptFile,
        copyrightFile: replaceCopyrightFile,
      });

      if (result.success) {
        toast.success('Paper files updated successfully.');
        closeReplaceFilesModal();
        await loadAdminData();
      } else {
        toast.error(result.error || 'Failed to update paper files.');
      }
    } catch (err) {
      console.error('Admin replace files failed', err);
      toast.error('Failed to update paper files.');
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
        toast.success('Reviewer assigned successfully.');
        setShowAssignModal(false);
        setSelectedPaper(null);
        setSelectedReviewer('');
        setSearchTerm('');
        loadAdminData();
      } else {
        toast.error(result.error || 'Failed to assign reviewer.');
      }
    } catch (error) {
      toast.error('An error occurred while assigning the reviewer.');
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
        toast.success('Paper deleted successfully.');
        setShowDeletePaperModal(false);
        setDeleteModalPaper(null);
        await loadAdminData();
      } else {
        toast.error(result.error || 'Failed to delete paper.');
      }
    } catch (err) {
      console.error('Failed to delete paper', err);
      toast.error('Failed to delete paper.');
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
      toast.error('Section and Name are required.');
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
        toast.success('Editorial Board updated successfully.');
        if (Array.isArray(result.board)) {
          setEditorialBoard(result.board);
        }
      } else {
        toast.error(result.error || 'Failed to save Editorial Board.');
      }
    } catch (err) {
      console.error('Failed to save editorial board', err);
      toast.error('Failed to save Editorial Board.');
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
        toast.success('Paper published successfully.');
        loadAdminData();
      } else {
        toast.error(result.error || 'Failed to publish paper.');
      }
    } catch (error) {
      toast.error('An error occurred while publishing the paper.');
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
      toast.error('Please describe the requested changes before sending a revision request.');
      return;
    }

    try {
      setRevisionSubmitting(true);
      const result = await mockAPI.requestRevisions(revisionModalPaper.id, note);
      if (result.success) {
        toast.success('Revision request sent to the author.');
        setShowRevisionModal(false);
        setRevisionModalPaper(null);
        setRevisionNote('');
        loadAdminData();
      } else {
        toast.error(result.error || 'Failed to request revisions.');
      }
    } catch (error) {
      toast.error('An error occurred while requesting revisions.');
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
        toast.success('Paper rejected and author notified.');
        setShowRejectModal(false);
        setRejectModalPaper(null);
        setRejectNote('');
        loadAdminData();
      } else {
        toast.error(result.error || 'Failed to reject paper.');
      }
    } catch (error) {
      toast.error('An error occurred while rejecting the paper.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const openAssignPaperToIssueModal = (paper) => {
    if (!paper) return;

    if (!issues || issues.length === 0) {
      toast.error('No issues available. Please create an issue first in the Journal issues section.');
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
      toast.error('Invalid issue ID.');
      return;
    }

    try {
      setAssignIssueSubmitting(true);
      const result = await mockAPI.assignPaperToIssue(assignIssuePaper.id, issueId);
      if (result.success) {
        toast.success('Paper assigned to issue successfully.');
        setShowAssignIssueModal(false);
        setAssignIssuePaper(null);
        setSelectedIssueId('');
        loadAdminData(); // Refresh admin data after assigning paper to issue
      } else {
        toast.error(result.error || 'Failed to assign paper to issue.');
      }
    } catch (error) {
      console.error('Error assigning paper to issue:', error);
      toast.error('An error occurred while assigning the paper to an issue.');
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
        toast.success('Important Dates updated successfully.');
      } else {
        toast.error(result.error || 'Failed to save Important Dates.');
      }
    } catch (err) {
      console.error('Failed to save important dates', err);
      toast.error('Failed to save Important Dates.');
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
        toast.success('New issue added successfully.');
      } else {
        toast.error(result.error || 'Failed to add issue.');
      }
    } catch (error) {
      toast.error('An error occurred while adding the issue.');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      const result = await mockAPI.deleteIssue(issueId);
      if (result.success) {
        setIssues(prev => prev.filter(issue => issue.id !== issueId));
        toast.success('Issue deleted successfully.');
      } else {
        toast.error(result.error || 'Failed to delete issue.');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the issue.');
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
        toast.success('Current issue has been updated.');
      } else {
        toast.error(result.error || 'Failed to update current issue.');
      }
    } catch (error) {
      toast.error('An error occurred while updating the current issue.');
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
    } finally {
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

  // --- presentation helpers (UI only) ----------------------------------------------------

  const requestPublish = (paper) => {
    setManagePaper(null);
    setQuickPublishPaper(paper);
    setShowQuickPublishModal(true);
  };

  const confirmPublish = async () => {
    if (!quickPublishPaper) return;
    setPublishing(true);
    await handlePublishPaper(quickPublishPaper.id);
    setPublishing(false);
    setShowQuickPublishModal(false);
    setQuickPublishPaper(null);
  };

  const confirmDeleteIssue = async () => {
    if (!issueToDelete) return;
    setIssueDeleting(true);
    await handleDeleteIssue(issueToDelete.id);
    setIssueDeleting(false);
    setIssueToDelete(null);
  };

  const openAssignReviewer = (paper) => {
    setManagePaper(null);
    setSelectedPaper(paper);
    setSelectedReviewer('');
    setSearchTerm('');
    setShowAssignModal(true);
  };

  const openReviews = (paper) => {
    setManagePaper(null);
    setReviewsModalPaper(paper);
    setReviewsModalReviews(paperReviews[paper.id] || []);
    setShowReviewsModal(true);
  };

  const closeAssignModal = () => {
    if (assigning) return;
    setShowAssignModal(false);
  };

  const closeRevisionModal = () => {
    if (revisionSubmitting) return;
    setShowRevisionModal(false);
    setRevisionModalPaper(null);
    setRevisionNote('');
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setShowRejectModal(false);
    setRejectModalPaper(null);
    setRejectNote('');
  };

  const closeAssignIssueModal = () => {
    if (assignIssueSubmitting) return;
    setShowAssignIssueModal(false);
    setAssignIssuePaper(null);
    setSelectedIssueId('');
  };

  const closeDeletePaper = () => {
    if (deleteSubmitting) return;
    setShowDeletePaperModal(false);
    setDeleteModalPaper(null);
  };

  const moveEditorialMember = (fromIndex, toIndex) => {
    const all = editorialBoard || [];
    if (toIndex < 0 || toIndex >= all.length) return;
    reorderEditorialBoard(fromIndex, toIndex);
    setTimeout(() => document.getElementById(`board-${all[fromIndex]?.id}`)?.focus(), 0);
  };

  const pendingPapers = (papers || []).filter((p) => p.status === 'submitted');
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const NAV = [
    { group: 'Manuscripts', items: [
      { id: 'submissions', label: 'All submissions', icon: 'layers', count: papers.length },
      { id: 'pending', label: 'Pending assignment', icon: 'inbox', count: stats.submitted },
      { id: 'review', label: 'Under review', icon: 'clock', count: underReviewPapersBase.length },
    ] },
    { group: 'Journal', items: [
      { id: 'issues', label: 'Journal issues', icon: 'book', count: issues.length },
      { id: 'important_dates', label: 'Important dates', icon: 'calendar' },
      { id: 'editorial_board', label: 'Editorial board', icon: 'users' },
    ] },
  ];

  const paperFlags = (paper) => (
    (paper.status === 'revisions_requested' || hasRevisedManuscript(paper)) && (
      <span className="cell-flags">
        {paper.status === 'revisions_requested' && <Badge tone="revision" icon="edit">Waiting for revised manuscript</Badge>}
        {hasRevisedManuscript(paper) && <Badge tone="review" icon="refresh">Revised manuscript received</Badge>}
      </span>
    )
  );

  const paymentBadge = (paper) => (paper.paymentStatus === 'paid'
    ? <Badge tone="accepted" icon="check">Paid</Badge>
    : <Badge tone="neutral" icon="clock">Pending</Badge>);

  const manageButton = (paper) => (
    <button type="button" className="icon-btn" onClick={() => setManagePaper(paper)} aria-label={`Manage ${paper.title}`}>
      <Icon name="edit" size={15} /> Manage
    </button>
  );

  const searchEmpty = (onReset) => (
    <EmptyState
      compact
      variant="search"
      title={adminSearch ? 'No papers match your search' : 'Nothing here right now'}
      action={adminSearch ? (
        <button type="button" className="button button-ghost button-small" onClick={() => setAdminSearchTerm('')}>Clear search</button>
      ) : onReset}
    >
      {adminSearch ? 'Try a different title, author or category.' : 'Papers will appear here as their status changes.'}
    </EmptyState>
  );

  if (loading && !hasLoadedOnce.current) {
    return <DashboardSkeleton label="Loading admin data" />;
  }

  return (
    <div className="dash-page">
      <div className="journal-container">
        <DashHeader
          role="Administrator"
          user={user}
          subtitle="Manage submissions, reviewer assignments and journal content."
          actions={(
            <button type="button" onClick={() => setShowAdminSubmitModal(true)} className="button button-primary">
              <Icon name="plus" size={17} /> Submit new paper
            </button>
          )}
        />

        <div className="stat-cards">
          <StatCard label="Submitted" value={stats.submitted} icon="send" />
          <StatCard label="Under review" value={stats.under_review} icon="clock" tone="amber" />
          <StatCard label="Published" value={stats.published} icon="globe" tone="green" />
          <StatCard label="Rejected" value={stats.rejected} icon="xCircle" tone="red" />
        </div>

        <div className="admin-shell">
          <nav className="admin-nav" aria-label="Admin sections">
            {NAV.map((group, gi) => (
              <React.Fragment key={group.group}>
                {gi > 0 && <div className="admin-nav-sep" aria-hidden="true" />}
                <p className="admin-nav-label">{group.group}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={activeTab === item.id ? 'is-active' : ''}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                        {typeof item.count === 'number' && <span className="tab-count">{item.count}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </React.Fragment>
            ))}
          </nav>

          <div className="admin-main">
            {/* ---------------- All submissions ---------------- */}
            {activeTab === 'submissions' && (
              <section aria-labelledby="sec-submissions">
                <div className="section-title">
                  <div>
                    <h2 id="sec-submissions">All submissions</h2>
                    <p>Every manuscript in the system. Select a paper to manage it.</p>
                  </div>
                </div>
                <FilterBar
                  search={adminSearchTerm}
                  onSearch={setAdminSearchTerm}
                  placeholder="Search by title, author, category…"
                  label="Search submissions"
                  sort={adminSortBy}
                  onSort={setAdminSortBy}
                  sortOptions={SORT_OPTIONS}
                >
                  <Segmented
                    label="Which papers to show"
                    value={adminShowAllPapers ? 'all' : 'open'}
                    onChange={(v) => setAdminShowAllPapers(v === 'all')}
                    options={[{ value: 'open', label: 'In progress' }, { value: 'all', label: 'All papers' }]}
                  />
                </FilterBar>

                {visibleAdminPapers.length === 0 ? searchEmpty(!adminShowAllPapers && (
                  <button type="button" className="button button-ghost button-small" onClick={() => setAdminShowAllPapers(true)}>Show all papers</button>
                )) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption className="sr-only">All submissions</caption>
                      <thead>
                        <tr>
                          <th scope="col">Paper</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">Status</th>
                          <th scope="col">Reviewers</th>
                          <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAdminPapers.map((paper) => (
                          <tr key={paper.id}>
                            <td className="cell-primary">
                              <button type="button" className="cell-title-btn" onClick={() => setManagePaper(paper)}>{paper.title}</button>
                              <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                              {paperFlags(paper)}
                            </td>
                            <td data-label="Submitted" className="nowrap">{formatDate(paper.submissionDate)}</td>
                            <td data-label="Status">
                              <span className="badge-stack">
                                <StatusBadge status={paper.status} />
                                <span className="cell-sub">Payment: {paper.paymentStatus === 'paid' ? 'paid' : 'pending'}</span>
                              </span>
                            </td>
                            <td data-label="Reviewers">{Array.isArray(paper.assignedReviewers) ? paper.assignedReviewers.length : 0}</td>
                            <td className="col-actions">
                              <div className="row-actions">
                                {paper.pdfUrl && (
                                  <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="icon-btn is-square" aria-label={`Download ${paper.title}`} title="Download paper">
                                    <Icon name="download" size={16} />
                                  </a>
                                )}
                                {manageButton(paper)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ---------------- Pending assignment ---------------- */}
            {activeTab === 'pending' && (
              <section aria-labelledby="sec-pending">
                <div className="section-title">
                  <div>
                    <h2 id="sec-pending">Pending assignment</h2>
                    <p>Submitted papers waiting for a reviewer.</p>
                  </div>
                </div>
                {pendingPapers.length === 0 ? (
                  <EmptyState variant="review" title="All papers assigned">
                    All submitted papers have been assigned to reviewers. Check back later for new submissions.
                  </EmptyState>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <caption className="sr-only">Papers pending reviewer assignment</caption>
                      <thead>
                        <tr>
                          <th scope="col">Paper</th>
                          <th scope="col">Category</th>
                          <th scope="col">Submitted</th>
                          <th scope="col">Payment</th>
                          <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPapers.map((paper) => (
                          <tr key={paper.id}>
                            <td className="cell-primary">
                              <button type="button" className="cell-title-btn" onClick={() => setManagePaper(paper)}>{paper.title}</button>
                              <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                            </td>
                            <td data-label="Category">{paper.category || '—'}</td>
                            <td data-label="Submitted" className="nowrap">{formatDate(paper.submissionDate)}</td>
                            <td data-label="Payment">{paymentBadge(paper)}</td>
                            <td className="col-actions">
                              <div className="row-actions">
                                <button type="button" onClick={() => openAssignReviewer(paper)} className="button button-primary button-small">
                                  <Icon name="user" size={15} /> Assign reviewer
                                </button>
                                {manageButton(paper)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ---------------- Under review ---------------- */}
            {activeTab === 'review' && (
              <section aria-labelledby="sec-review">
                <div className="section-title">
                  <div>
                    <h2 id="sec-review">Under review</h2>
                    <p>Papers with reviewers, including those waiting for a revised manuscript.</p>
                  </div>
                </div>
                {underReviewPapersBase.length === 0 ? (
                  <EmptyState variant="review" title="No papers under review">
                    Papers currently under review will appear here. You can assign reviewers to pending papers.
                  </EmptyState>
                ) : (
                  <>
                    <FilterBar
                      search={adminSearchTerm}
                      onSearch={setAdminSearchTerm}
                      placeholder="Search by title, author, category…"
                      label="Search papers under review"
                      sort={adminSortBy}
                      onSort={setAdminSortBy}
                      sortOptions={SORT_OPTIONS}
                    />
                    {visibleUnderReviewPapers.length === 0 ? searchEmpty(null) : (
                      <div className="table-scroll">
                        <table className="data-table">
                          <caption className="sr-only">Papers under review</caption>
                          <thead>
                            <tr>
                              <th scope="col">Paper</th>
                              <th scope="col">Deadline</th>
                              <th scope="col">Reviewers</th>
                              <th scope="col">Reviews</th>
                              <th scope="col" className="col-actions"><span className="sr-only">Actions</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleUnderReviewPapers.map((paper) => {
                              const reviews = paperReviews[paper.id] || [];
                              const latestRecommendation = reviews[0]?.recommendation || '';
                              return (
                                <tr key={paper.id}>
                                  <td className="cell-primary">
                                    <button type="button" className="cell-title-btn" onClick={() => setManagePaper(paper)}>{paper.title}</button>
                                    <span className="cell-sub">{joinAuthors(paper.authors)}</span>
                                    {paperFlags(paper)}
                                  </td>
                                  <td data-label="Deadline" className="nowrap">{paper.reviewDeadline ? formatDate(paper.reviewDeadline) : '—'}</td>
                                  <td data-label="Reviewers">{Array.isArray(paper.assignedReviewers) ? paper.assignedReviewers.length : 0}</td>
                                  <td data-label="Reviews">
                                    {reviews.length > 0 ? (
                                      <button type="button" className="link-btn" onClick={() => openReviews(paper)}>
                                        {reviews.length} review{reviews.length === 1 ? '' : 's'}
                                        {latestRecommendation && <> · {recommendationLabel(latestRecommendation)}</>}
                                      </button>
                                    ) : <span className="cell-sub">None yet</span>}
                                  </td>
                                  <td className="col-actions">
                                    <div className="row-actions">
                                      <button type="button" onClick={() => requestPublish(paper)} className="button button-primary button-small">
                                        <Icon name="globe" size={15} /> Publish
                                      </button>
                                      {manageButton(paper)}
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
              </section>
            )}

            {/* ---------------- Journal issues ---------------- */}
            {activeTab === 'issues' && (
              <section aria-labelledby="sec-issues">
                <div className="section-title">
                  <div>
                    <h2 id="sec-issues">Journal issues</h2>
                    <p>Create issues, choose the current issue and see which papers belong to each.</p>
                  </div>
                </div>
                <div className="issues-layout">
                  <div>
                    {issues.length === 0 ? (
                      <EmptyState compact title="No issues yet">Add your first issue using the form.</EmptyState>
                    ) : (
                      <ul className="issue-list">
                        {issues.map((issue) => (
                          <li key={issue.id} className={`issue-row${issue.isCurrent ? ' is-current' : ''}`}>
                            <div className="issue-row-head">
                              <div>
                                <strong>Volume {issue.volume}, Issue {issue.issue}</strong>
                                <span className="issue-date">{issue.month} {issue.year}</span>
                              </div>
                              <div className="row-actions">
                                {issue.isCurrent && <Badge tone="accepted" icon="check">Current issue</Badge>}
                                <button
                                  type="button"
                                  onClick={() => handleIssueClick(issue)}
                                  className="icon-btn"
                                  aria-expanded={expandedIssueId === issue.id}
                                  aria-controls={`issue-papers-${issue.id}`}
                                >
                                  <Icon name="eye" size={15} /> {expandedIssueId === issue.id ? 'Hide papers' : 'View papers'}
                                </button>
                                {!issue.isCurrent && (
                                  <button type="button" onClick={() => handleSetCurrentIssue(issue.id)} className="icon-btn">
                                    Set as current
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIssueToDelete(issue)}
                                  className="icon-btn is-square icon-btn-danger"
                                  aria-label={`Delete Volume ${issue.volume}, Issue ${issue.issue}`}
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            </div>
                            {expandedIssueId === issue.id && (
                              <ul className="issue-papers" id={`issue-papers-${issue.id}`}>
                                {issuePapersLoadingId === issue.id ? (
                                  <li className="skeleton-stack"><Skeleton width="70%" /><Skeleton width="40%" /></li>
                                ) : (issuePapersByIssueId[issue.id] || []).length === 0 ? (
                                  <li className="cell-sub">No papers have been assigned to this issue yet.</li>
                                ) : (
                                  (issuePapersByIssueId[issue.id] || []).map((paper) => (
                                    <li key={paper.id}>
                                      {paper.pdfUrl
                                        ? <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">{paper.title}</a>
                                        : <strong>{paper.title}</strong>}
                                      <span>{joinAuthors(paper.authors)}</span>
                                    </li>
                                  ))
                                )}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <form onSubmit={handleAddIssue} className="dash-panel" aria-labelledby="add-issue-title">
                    <div className="dash-panel-head"><h2 id="add-issue-title">Add new issue</h2></div>
                    <div className="field-grid-2">
                      <div className="field">
                        <div className="field-label"><label htmlFor="volume">Volume</label></div>
                        <input type="number" name="volume" id="volume" value={issueForm.volume} onChange={handleIssueFormChange} required className="form-input" placeholder="e.g. 3" />
                      </div>
                      <div className="field">
                        <div className="field-label"><label htmlFor="issue">Issue</label></div>
                        <input type="number" name="issue" id="issue" value={issueForm.issue} onChange={handleIssueFormChange} required className="form-input" placeholder="e.g. 4" />
                      </div>
                      <div className="field">
                        <div className="field-label"><label htmlFor="month">Month</label></div>
                        <input type="text" name="month" id="month" value={issueForm.month} onChange={handleIssueFormChange} required className="form-input" placeholder="e.g. December" />
                      </div>
                      <div className="field">
                        <div className="field-label"><label htmlFor="year">Year</label></div>
                        <input type="number" name="year" id="year" value={issueForm.year} onChange={handleIssueFormChange} required className="form-input" placeholder="e.g. 2026" />
                      </div>
                    </div>
                    <button type="submit" className="button button-primary button-block">
                      <Icon name="plus" size={16} /> Add issue
                    </button>
                  </form>
                </div>
              </section>
            )}

            {/* ---------------- Important dates ---------------- */}
            {activeTab === 'important_dates' && (
              <section className="dash-panel" aria-labelledby="sec-dates">
                <div className="dash-panel-head">
                  <div>
                    <h2 id="sec-dates">Important dates</h2>
                    <p>Update the dates shown on the Call for Papers page.</p>
                  </div>
                  <button type="button" onClick={handleSaveImportantDates} disabled={importantDatesSaving || importantDatesLoading} className="button button-primary button-small">
                    {importantDatesSaving ? <><Spinner size="sm" /> Saving…</> : 'Save changes'}
                  </button>
                </div>
                {importantDatesLoading ? (
                  <div className="dates-grid" aria-busy="true">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="date-field skeleton-stack"><Skeleton width="50%" height={12} /><Skeleton height={44} /></div>)}
                  </div>
                ) : (
                  <div className="dates-grid">
                    {Object.entries(importantDates).map(([label, value], i) => (
                      <div key={label} className="date-field field">
                        <div className="field-label"><label htmlFor={`date-${i}`}>{label}</label></div>
                        <input id={`date-${i}`} type="text" value={value} onChange={(e) => handleImportantDateChange(label, e.target.value)} className="form-input" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ---------------- Editorial board ---------------- */}
            {activeTab === 'editorial_board' && (
              <section className="dash-panel" aria-labelledby="sec-board">
                <div className="dash-panel-head">
                  <div>
                    <h2 id="sec-board">Editorial board</h2>
                    <p>Drag or use the arrow buttons to reorder (saved automatically). Select a member to edit.</p>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={openAddEditorialModal} className="button button-ghost button-small">
                      <Icon name="plus" size={15} /> Add member
                    </button>
                    <button type="button" onClick={handleSaveEditorialBoard} disabled={editorialBoardSaving} className="button button-primary button-small">
                      {editorialBoardSaving ? <><Spinner size="sm" /> Saving…</> : 'Save'}
                    </button>
                  </div>
                </div>

                <FilterBar
                  search={editorialSearchTerm}
                  onSearch={setEditorialSearchTerm}
                  placeholder="Search by name, section, affiliation, email…"
                  label="Search editorial board"
                />

                {editorialBoardLoading ? (
                  <div className="skeleton-table" aria-busy="true">
                    {[0, 1, 2].map((i) => <div key={i} className="skeleton-row"><Skeleton width="45%" /><Skeleton width="25%" /></div>)}
                  </div>
                ) : (editorialBoard || []).length === 0 ? (
                  <EmptyState
                    compact
                    title="No members yet"
                    action={<button type="button" onClick={openAddEditorialModal} className="button button-primary button-small">Add the first member</button>}
                  >
                    Members you add here appear on the public Editorial Board page.
                  </EmptyState>
                ) : (
                  <ul className="board-list">
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
                        <li
                          key={m.id}
                          className={`board-item${isDragging ? ' is-dragging' : ''}${dragOverId === m.id && !isDragging ? ' is-drop-target' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            setDraggingEditorialId(m?.id || null);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(m?.id || ''));
                          }}
                          onDragEnd={() => { setDraggingEditorialId(null); setDragOverId(null); }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverId !== m.id) setDragOverId(m.id);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setDragOverId(null);
                            const draggedId = e.dataTransfer.getData('text/plain');
                            if (!draggedId) return;
                            const toIndex = all.findIndex((x) => String(x?.id || '') === String(m?.id || ''));
                            const resolvedFromIndex = all.findIndex((x) => String(x?.id || '') === String(draggedId));
                            if (resolvedFromIndex < 0 || toIndex < 0) return;
                            await reorderEditorialBoard(resolvedFromIndex, toIndex);
                          }}
                        >
                          <span className="board-grip" aria-hidden="true"><Icon name="grip" size={18} /></span>
                          <button type="button" id={`board-${m.id}`} className="board-main" onClick={() => openEditEditorialModal(m)}>
                            <strong>{m.name || '(No name)'}</strong>
                            <span>{m.section || 'Editorial Board'}{m.affiliation ? ` · ${m.affiliation}` : ''}</span>
                          </button>
                          <div className="row-actions">
                            <button type="button" className="icon-btn is-square" onClick={() => moveEditorialMember(fromIndex, fromIndex - 1)} disabled={fromIndex <= 0 || editorialBoardSaving} aria-label={`Move ${m.name || 'member'} up`}>
                              <Icon name="chevronDown" size={16} className="icon-flip" />
                            </button>
                            <button type="button" className="icon-btn is-square" onClick={() => moveEditorialMember(fromIndex, fromIndex + 1)} disabled={fromIndex >= all.length - 1 || editorialBoardSaving} aria-label={`Move ${m.name || 'member'} down`}>
                              <Icon name="chevronDown" size={16} />
                            </button>
                          </div>
                          <span className="board-order" aria-label={`Position ${fromIndex + 1}`}>{fromIndex >= 0 ? fromIndex + 1 : '—'}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ================= dialogs ================= */}

      {/* Manage paper */}
      <Modal
        open={Boolean(managePaper)}
        onClose={() => setManagePaper(null)}
        size="lg"
        title={managePaper?.title || ''}
        description={managePaper ? `Paper ID ${managePaper.id}` : undefined}
        footer={managePaper && (
          <>
            <button type="button" className="button button-danger-outline footer-start" onClick={() => { const p = managePaper; setManagePaper(null); openDeletePaperModal(p); }}>
              <Icon name="trash" size={16} /> Delete paper
            </button>
            <button type="button" className="button button-ghost" onClick={() => setManagePaper(null)}>Close</button>
            {managePaper.status !== 'published' && (
              <button type="button" className="button button-primary" onClick={() => requestPublish(managePaper)}>
                <Icon name="globe" size={16} /> Publish paper
              </button>
            )}
          </>
        )}
      >
        {managePaper && (
          <>
            <div className="row-actions">
              <StatusBadge status={managePaper.status} />
              {paymentBadge(managePaper)}
              {paperFlags(managePaper)}
            </div>
            <div className="detail-section">
              <dl className="meta-list">
                <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(managePaper.authors) || '—'}</dd></div>
                <div><dt>Category</dt><dd>{managePaper.category || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(managePaper.submissionDate)}</dd></div>
                <div><dt>Assigned reviewers</dt><dd>{Array.isArray(managePaper.assignedReviewers) ? managePaper.assignedReviewers.length : 0}</dd></div>
                {managePaper.doi && <div><dt>DOI</dt><dd>{managePaper.doi}</dd></div>}
                {managePaper.assignedIssue && (
                  <div><dt>Journal issue</dt><dd>Volume {managePaper.assignedIssue.volume}, Issue {managePaper.assignedIssue.issue}</dd></div>
                )}
              </dl>
            </div>
            <div className="detail-section">
              <h3>Actions</h3>
              <div className="row-actions">
                {managePaper.pdfUrl && (
                  <a href={managePaper.pdfUrl} target="_blank" rel="noopener noreferrer" className="icon-btn">
                    <Icon name="download" size={15} /> Download paper
                  </a>
                )}
                <button type="button" className="icon-btn" onClick={() => { const p = managePaper; setManagePaper(null); openReplaceFilesModal(p); }}>
                  <Icon name="upload" size={15} /> Upload / replace files
                </button>
                {(managePaper.status === 'submitted' || managePaper.status === 'under_review' || managePaper.status === 'revisions_requested') && (
                  <button type="button" className="icon-btn" onClick={() => openAssignReviewer(managePaper)}>
                    <Icon name="user" size={15} /> {managePaper.status === 'submitted' ? 'Assign reviewer' : 'Assign more reviewers'}
                  </button>
                )}
                {(paperReviews[managePaper.id] || []).length > 0 && (
                  <button type="button" className="icon-btn" onClick={() => openReviews(managePaper)}>
                    <Icon name="star" size={15} /> View reviews ({(paperReviews[managePaper.id] || []).length})
                  </button>
                )}
                {managePaper.status === 'under_review' && (
                  <button type="button" className="icon-btn" onClick={() => { const p = managePaper; setManagePaper(null); openRequestRevisionsModal(p); }}>
                    <Icon name="edit" size={15} /> Request revisions
                  </button>
                )}
                {managePaper.status === 'published' && issues.length > 0 && !managePaper.assignedIssue && (
                  <button type="button" className="icon-btn" onClick={() => { const p = managePaper; setManagePaper(null); openAssignPaperToIssueModal(p); }}>
                    <Icon name="book" size={15} /> Add to journal issue
                  </button>
                )}
              </div>
            </div>
            {managePaper.abstract && (
              <div className="detail-section">
                <h3>Abstract</h3>
                <p>{managePaper.abstract}</p>
              </div>
            )}
            {Array.isArray(managePaper.keywords) && managePaper.keywords.filter(Boolean).length > 0 && (
              <div className="detail-section">
                <h3>Keywords</h3>
                <div className="chip-list">{managePaper.keywords.filter(Boolean).map((k, i) => <span key={`${k}-${i}`} className="chip">{k}</span>)}</div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Admin submit */}
      <Modal
        open={showAdminSubmitModal}
        onClose={() => { if (!adminSubmittingPaper) setShowAdminSubmitModal(false); }}
        closeDisabled={adminSubmittingPaper}
        size="lg"
        title="Submit new paper"
        description="Submit a manuscript on behalf of an author."
        footer={(
          <>
            <button type="button" onClick={() => setShowAdminSubmitModal(false)} disabled={adminSubmittingPaper} className="button button-ghost">Cancel</button>
            <button type="submit" form="admin-submit-form" disabled={adminSubmittingPaper} className="button button-primary" aria-busy={adminSubmittingPaper || undefined}>
              {adminSubmittingPaper ? <><Spinner size="sm" /> Submitting…</> : <><Icon name="send" size={16} /> Submit paper</>}
            </button>
          </>
        )}
      >
        <form id="admin-submit-form" onSubmit={handleAdminSubmitNewPaper}>
          <div className="field-grid-2">
            <div className="field">
              <div className="field-label"><label htmlFor="as-fullName">Corresponding author name<span className="req" aria-hidden="true">*</span></label></div>
              <input id="as-fullName" type="text" name="fullName" value={adminSubmitForm.fullName} onChange={handleAdminSubmitFormChange} className="form-input" required />
            </div>
            <div className="field">
              <div className="field-label"><label htmlFor="as-email">Corresponding author email<span className="req" aria-hidden="true">*</span></label></div>
              <input id="as-email" type="email" name="email" value={adminSubmitForm.email} onChange={handleAdminSubmitFormChange} className="form-input" required />
            </div>
            <div className="field is-wide">
              <div className="field-label"><label htmlFor="as-affiliation">Affiliation<span className="req" aria-hidden="true">*</span></label></div>
              <input id="as-affiliation" type="text" name="affiliation" value={adminSubmitForm.affiliation} onChange={handleAdminSubmitFormChange} className="form-input" required />
            </div>
            <div className="field is-wide">
              <div className="field-label"><label htmlFor="as-title">Paper title<span className="req" aria-hidden="true">*</span></label></div>
              <input id="as-title" type="text" name="paperTitle" value={adminSubmitForm.paperTitle} onChange={handleAdminSubmitFormChange} className="form-input" required />
            </div>
            <div className="field is-wide">
              <div className="field-label"><label htmlFor="as-keywords">Keywords<span className="optional">(comma-separated)</span></label></div>
              <input id="as-keywords" type="text" name="keywords" value={adminSubmitForm.keywords} onChange={handleAdminSubmitFormChange} className="form-input" />
            </div>
            <div className="field is-wide">
              <div className="field-label"><label htmlFor="as-comments">Abstract / comments</label></div>
              <textarea id="as-comments" name="comments" value={adminSubmitForm.comments} onChange={handleAdminSubmitFormChange} className="form-textarea" rows={5} />
            </div>
          </div>

          <fieldset className="choice-fieldset">
            <legend>Co-authors<span className="optional">(optional)</span></legend>
            {(adminSubmitCoAuthors || []).map((co, idx) => (
              <div key={idx} className="coauthor-card">
                <div className="coauthor-head">
                  <strong><span className="coauthor-index" aria-hidden="true">{idx + 1}</span>Co-author {idx + 1}</strong>
                  <button type="button" onClick={() => removeAdminCoAuthor(idx)} className="icon-btn icon-btn-danger" aria-label={`Remove co-author ${idx + 1}`}>
                    <Icon name="trash" size={15} /> Remove
                  </button>
                </div>
                <div className="field-grid-3">
                  {[['fullName', 'Name', 'text'], ['affiliation', 'Affiliation', 'text'], ['email', 'Email', 'email']].map(([f, lbl, type]) => (
                    <div className="field" key={f}>
                      <div className="field-label"><label htmlFor={`as-co-${idx}-${f}`}>{lbl}</label></div>
                      <input id={`as-co-${idx}-${f}`} type={type} value={co[f]} onChange={(e) => updateAdminCoAuthor(idx, f, e.target.value)} className="form-input" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={addAdminCoAuthor} className="add-row">
              <Icon name="plus" size={18} /> Add {(adminSubmitCoAuthors || []).length ? 'another' : 'a'} co-author
            </button>
          </fieldset>

          <FilePicker
            id="as-manuscript"
            label="Manuscript (PDF)"
            extensions={['pdf']}
            file={adminSubmitForm.manuscriptFile}
            onChange={(f) => { setAdminSubmitForm((prev) => ({ ...prev, manuscriptFile: f })); setAdminFileError(''); }}
            disabled={adminSubmittingPaper}
          />
          {adminFileError && <p className="field-error" role="alert"><Icon name="alert" size={15} />{adminFileError}</p>}
        </form>
      </Modal>

      {/* Replace files */}
      <Modal
        open={showReplaceFilesModal && Boolean(replaceFilesPaper)}
        onClose={closeReplaceFilesModal}
        closeDisabled={replaceFilesSubmitting}
        title="Upload / replace paper files"
        description={replaceFilesPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeReplaceFilesModal} disabled={replaceFilesSubmitting} className="button button-ghost">Cancel</button>
            <button type="button" onClick={handleConfirmReplaceFiles} disabled={replaceFilesSubmitting || (!replaceManuscriptFile && !replaceCopyrightFile)} className="button button-primary" aria-busy={replaceFilesSubmitting || undefined}>
              {replaceFilesSubmitting ? <><Spinner size="sm" /> Uploading…</> : <><Icon name="upload" size={16} /> Upload</>}
            </button>
          </>
        )}
      >
        <FilePicker id="rf-manuscript" label="New manuscript" optional extensions={['pdf']} file={replaceManuscriptFile} onChange={setReplaceManuscriptFile} disabled={replaceFilesSubmitting} />
        <FilePicker id="rf-copyright" label="New copyright form" optional extensions={['pdf']} file={replaceCopyrightFile} onChange={setReplaceCopyrightFile} disabled={replaceFilesSubmitting} />
      </Modal>

      {/* PDF viewer */}
      <Modal
        open={showPdfViewerModal && Boolean(pdfViewerPaper)}
        onClose={closePdfViewer}
        size="xl"
        title={pdfViewerPaper?.title || ''}
        description={pdfViewerPaper ? `Paper ID ${pdfViewerPaper.id}` : undefined}
        footer={pdfViewerPaper?.pdfUrl && (
          <a href={pdfViewerPaper.pdfUrl} target="_blank" rel="noopener noreferrer" className="button button-primary">
            <Icon name="download" size={16} /> Download
          </a>
        )}
      >
        {pdfViewerPaper && (
          <div className="viewer-shell">
            {pdfNumPages && (
              <div className="viewer-toolbar" role="toolbar" aria-label="Document controls">
                <div className="tool-group">
                  <button type="button" onClick={handlePdfPrevPage} disabled={pdfPageNumber <= 1} className="icon-btn is-square" aria-label="Previous page"><Icon name="arrowLeft" size={16} /></button>
                  <span className="readout" aria-live="polite">Page {pdfPageNumber} of {pdfNumPages}</span>
                  <button type="button" onClick={handlePdfNextPage} disabled={pdfNumPages && pdfPageNumber >= pdfNumPages} className="icon-btn is-square" aria-label="Next page"><Icon name="arrowRight" size={16} /></button>
                </div>
                <div className="tool-group">
                  <button type="button" onClick={handlePdfZoomOut} disabled={pdfZoom <= 0.5} className="icon-btn is-square" aria-label="Zoom out"><Icon name="zoomOut" size={16} /></button>
                  <span className="readout">{Math.round(pdfZoom * 100)}%</span>
                  <button type="button" onClick={handlePdfZoomIn} disabled={pdfZoom >= 2} className="icon-btn is-square" aria-label="Zoom in"><Icon name="zoomIn" size={16} /></button>
                  <button type="button" onClick={handlePdfResetZoom} className="icon-btn">Reset</button>
                </div>
              </div>
            )}
            <div className="viewer-stage">
              {pdfViewerError ? (
                <div className="viewer-message"><div><h2>{pdfViewerError}</h2></div></div>
              ) : (
                <Document
                  file={pdfViewerPaper.pdfUrl}
                  onLoadSuccess={onPdfLoadSuccess}
                  loading={<div className="viewer-message"><div><Spinner size="sm" /><p>Loading PDF…</p></div></div>}
                  error={<div className="viewer-message"><div><h2>Failed to load PDF.</h2></div></div>}
                  onLoadError={() => setPdfViewerError('Failed to load PDF.')}
                >
                  <div className="viewer-page"><Page pageNumber={pdfPageNumber} height={700} scale={pdfZoom} /></div>
                </Document>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Editorial member */}
      <Modal
        open={showEditorialModal}
        onClose={closeEditorialModal}
        title={editingEditorialId ? 'Edit member' : 'Add member'}
        description="Changes are applied to the list; select Save on the board to publish them."
        footer={(
          <>
            {editingEditorialId && (
              <button type="button" onClick={() => setConfirmMemberDelete(true)} className="button button-danger-outline footer-start">
                <Icon name="trash" size={16} /> Delete
              </button>
            )}
            <button type="button" onClick={closeEditorialModal} className="button button-ghost">Cancel</button>
            <button type="button" onClick={handleSaveEditorialDraft} className="button button-primary">Done</button>
          </>
        )}
      >
        <div className="field-grid-2">
          {[
            ['section', 'Section', 'text', 'e.g. Editor-in-Chief', true],
            ['name', 'Name', 'text', 'Full name', true],
            ['title', 'Title / designation', 'text', 'e.g. Professor, Dept. of …'],
            ['affiliation', 'Affiliation', 'text', 'Institute / organisation'],
            ['email', 'Email', 'email', 'name@example.com', false, true],
            ['profileUrl', 'Institutional profile URL', 'url', 'https://…', false, true],
          ].map(([field, label, type, placeholder, required, wide]) => (
            <div key={field} className={`field${wide ? ' is-wide' : ''}`}>
              <div className="field-label">
                <label htmlFor={`ed-${field}`}>{label}{required && <span className="req" aria-hidden="true">*</span>}</label>
              </div>
              <input
                id={`ed-${field}`}
                type={type}
                value={editorialDraft[field]}
                onChange={(e) => handleEditorialDraftChange(field, e.target.value)}
                className="form-input"
                placeholder={placeholder}
                aria-required={required || undefined}
              />
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmMemberDelete}
        tone="danger"
        title="Remove this member?"
        message="The member will be removed from the list. Select Save on the board to publish the change."
        confirmLabel="Remove member"
        onCancel={() => setConfirmMemberDelete(false)}
        onConfirm={() => {
          handleRemoveEditorialMember(editingEditorialId);
          setConfirmMemberDelete(false);
          closeEditorialModal();
        }}
      >
        <div className="paper-ref"><strong>{editorialDraft.name || '(No name)'}</strong><span>{editorialDraft.section}</span></div>
      </ConfirmDialog>

      {/* Delete paper */}
      <ConfirmDialog
        open={showDeletePaperModal && Boolean(deleteModalPaper)}
        tone="danger"
        title="Delete paper?"
        message="This permanently deletes the paper and cannot be undone."
        confirmLabel="Yes, delete"
        busyLabel="Deleting…"
        busy={deleteSubmitting}
        onCancel={closeDeletePaper}
        onConfirm={handleConfirmDeletePaper}
      >
        {deleteModalPaper && <div className="paper-ref"><strong>{deleteModalPaper.title}</strong><span>ID: {deleteModalPaper.id}</span></div>}
      </ConfirmDialog>

      {/* Publish */}
      <ConfirmDialog
        open={showQuickPublishModal && Boolean(quickPublishPaper)}
        title="Publish this paper?"
        message="The paper will become publicly visible on the journal site."
        confirmLabel="Yes, publish"
        busyLabel="Publishing…"
        busy={publishing}
        onCancel={() => { if (!publishing) { setShowQuickPublishModal(false); setQuickPublishPaper(null); } }}
        onConfirm={confirmPublish}
      >
        {quickPublishPaper && <div className="paper-ref"><strong>{quickPublishPaper.title}</strong><span>ID: {quickPublishPaper.id}</span></div>}
      </ConfirmDialog>

      {/* Delete issue */}
      <ConfirmDialog
        open={Boolean(issueToDelete)}
        tone="danger"
        title="Delete this issue?"
        message="The issue will be removed. This cannot be undone."
        confirmLabel="Delete issue"
        busyLabel="Deleting…"
        busy={issueDeleting}
        onCancel={() => { if (!issueDeleting) setIssueToDelete(null); }}
        onConfirm={confirmDeleteIssue}
      >
        {issueToDelete && (
          <div className="paper-ref">
            <strong>Volume {issueToDelete.volume}, Issue {issueToDelete.issue}</strong>
            <span>{issueToDelete.month} {issueToDelete.year}{issueToDelete.isCurrent ? ' · current issue' : ''}</span>
          </div>
        )}
      </ConfirmDialog>

      {/* Assign reviewer */}
      <Modal
        open={showAssignModal && Boolean(selectedPaper)}
        onClose={closeAssignModal}
        closeDisabled={assigning}
        size="lg"
        title="Assign reviewer"
        description={selectedPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeAssignModal} disabled={assigning} className="button button-ghost">Cancel</button>
            <button type="button" onClick={handleAssignReviewer} disabled={assigning || !selectedReviewer} className="button button-primary" aria-busy={assigning || undefined}>
              {assigning ? <><Spinner size="sm" /> Assigning…</> : 'Assign reviewer'}
            </button>
          </>
        )}
      >
        {selectedPaper && (
          <>
            <div className="paper-ref">
              <dl className="meta-list">
                <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(selectedPaper.authors)}</dd></div>
                <div><dt>Category</dt><dd>{selectedPaper.category || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDate(selectedPaper.submissionDate)}</dd></div>
              </dl>
            </div>
            <div ref={dropdownRef}>
              <FilterBar
                search={searchTerm}
                onSearch={setSearchTerm}
                placeholder="Search by name, email or affiliation…"
                label="Search reviewers"
                sort={reviewerSortBy}
                onSort={setReviewerSortBy}
                sortOptions={[
                  { value: 'name_az', label: 'Name A–Z' },
                  { value: 'name_za', label: 'Name Z–A' },
                  { value: 'affiliation_az', label: 'Affiliation A–Z' },
                ]}
              />
              {filteredReviewers.length > 0 ? (
                <ul className="reviewer-picker" aria-label="Reviewers">
                  {filteredReviewers.map((reviewer) => (
                    <li key={reviewer.id}>
                      <button
                        type="button"
                        className="reviewer-option"
                        aria-pressed={selectedReviewer === String(reviewer.id)}
                        onClick={() => setSelectedReviewer(String(reviewer.id))}
                      >
                        <span className="reviewer-avatar" aria-hidden="true">{initials(reviewer.name || reviewer.email)}</span>
                        <span>
                          <strong>{reviewer.name || 'Unnamed reviewer'}</strong>
                          <span>{[reviewer.email, reviewer.affiliation].filter(Boolean).join(' · ')}</span>
                        </span>
                        {selectedReviewer === String(reviewer.id) && <Icon name="checkCircle" size={20} />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact variant="search" title="No reviewers found">Try a different search.</EmptyState>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Reviews */}
      <Modal
        open={showReviewsModal && Boolean(reviewsModalPaper)}
        onClose={() => setShowReviewsModal(false)}
        size="lg"
        title="Reviews for this paper"
        description={reviewsModalPaper?.title}
        footer={reviewsModalPaper && (
          <>
            <button type="button" onClick={() => setShowReviewsModal(false)} className="button button-ghost footer-start">Close</button>
            <button type="button" onClick={() => { setShowReviewsModal(false); openRequestRevisionsModal(reviewsModalPaper); }} className="button button-ghost">
              <Icon name="edit" size={16} /> Request revisions
            </button>
            <button type="button" onClick={() => { setShowReviewsModal(false); openRejectPaperModal(reviewsModalPaper); }} className="button button-danger-outline">
              <Icon name="xCircle" size={16} /> Reject paper
            </button>
          </>
        )}
      >
        {reviewsModalPaper && (
          <>
            <p className="results-note">Authors: {joinAuthors(reviewsModalPaper.authors)}</p>
            {reviewsModalReviews.length === 0 ? (
              <EmptyState compact variant="review" title="No reviews yet">No reviews have been submitted for this paper.</EmptyState>
            ) : (
              reviewsModalReviews.map((review) => (
                <article key={review.id} className="review-card">
                  <div className="review-card-head">
                    <div>
                      <strong>Reviewer: {review.reviewerName || `#${review.reviewerId}`}</strong>
                      <span>Submitted on {review.submittedDate ? formatDate(review.submittedDate) : 'N/A'}</span>
                    </div>
                    <Stars rating={review.rating} />
                  </div>
                  <Badge tone={RECOMMENDATIONS[review.recommendation]?.tone || 'neutral'}>{recommendationLabel(review.recommendation)}</Badge>
                  <p>{review.comments}</p>
                </article>
              ))
            )}
          </>
        )}
      </Modal>

      {/* Request revisions */}
      <Modal
        open={showRevisionModal && Boolean(revisionModalPaper)}
        onClose={closeRevisionModal}
        closeDisabled={revisionSubmitting}
        title="Request revisions"
        description={revisionModalPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeRevisionModal} disabled={revisionSubmitting} className="button button-ghost">Cancel</button>
            <button type="button" onClick={handleRequestRevisions} disabled={revisionSubmitting || !revisionNote.trim()} className="button button-primary" aria-busy={revisionSubmitting || undefined}>
              {revisionSubmitting ? <><Spinner size="sm" /> Sending…</> : <><Icon name="send" size={16} /> Send request</>}
            </button>
          </>
        )}
      >
        <div className="field">
          <div className="field-label"><label htmlFor="revision-note">Message to author<span className="req" aria-hidden="true">*</span></label></div>
          <textarea id="revision-note" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} rows={6} className="form-textarea" placeholder="Describe the requested revisions…" aria-describedby="revision-note-hint" />
          <p className="field-hint" id="revision-note-hint">This message is sent to the author. Clearly describe the changes you need.</p>
        </div>
      </Modal>

      {/* Reject */}
      <Modal
        open={showRejectModal && Boolean(rejectModalPaper)}
        onClose={closeRejectModal}
        closeDisabled={rejectSubmitting}
        tone="danger"
        title="Reject paper"
        description={rejectModalPaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeRejectModal} disabled={rejectSubmitting} className="button button-ghost" data-autofocus>Cancel</button>
            <button type="button" onClick={handleRejectPaper} disabled={rejectSubmitting} className="button button-danger" aria-busy={rejectSubmitting || undefined}>
              {rejectSubmitting ? <><Spinner size="sm" /> Rejecting…</> : 'Reject paper'}
            </button>
          </>
        )}
      >
        <div className="field">
          <div className="field-label"><label htmlFor="reject-note">Note to author<span className="optional">(optional)</span></label></div>
          <textarea id="reject-note" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={4} className="form-textarea" placeholder="Explain briefly why the paper is being rejected." aria-describedby="reject-note-hint" />
          <p className="field-hint" id="reject-note-hint">If provided, this note is shared with the author.</p>
        </div>
      </Modal>

      {/* Assign to issue */}
      <Modal
        open={showAssignIssueModal && Boolean(assignIssuePaper)}
        onClose={closeAssignIssueModal}
        closeDisabled={assignIssueSubmitting}
        title="Assign to journal issue"
        description={assignIssuePaper?.title}
        footer={(
          <>
            <button type="button" onClick={closeAssignIssueModal} disabled={assignIssueSubmitting} className="button button-ghost">Cancel</button>
            <button type="button" onClick={handleAssignPaperToIssue} disabled={assignIssueSubmitting || !selectedIssueId} className="button button-primary" aria-busy={assignIssueSubmitting || undefined}>
              {assignIssueSubmitting ? <><Spinner size="sm" /> Assigning…</> : 'Assign to issue'}
            </button>
          </>
        )}
      >
        <div className="field">
          <div className="field-label"><label htmlFor="issue-select">Issue</label></div>
          <select id="issue-select" value={selectedIssueId} onChange={(e) => setSelectedIssueId(e.target.value)} className="form-select">
            <option value="">Choose an issue…</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {`Volume ${issue.volume}, Issue ${issue.issue} (${issue.month} ${issue.year})`}
              </option>
            ))}
          </select>
          <p className="field-hint">Choose the issue this published paper belongs to.</p>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
