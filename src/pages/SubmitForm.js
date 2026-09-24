import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authHeaders } from '../data/mockData';
import Alert from '../components/Alert';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import paperTemplate from '../assets/Paper Template.docx';

// Same base URL the rest of the app uses (mockData.js); empty means same-origin /api.
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const COVER_LETTER_MAX = 500;
const ABSTRACT_MIN_WORDS = 150;
const ABSTRACT_MAX_WORDS = 300;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DRAFT_KEY_PREFIX = 'ijepa.submissionDraft.v1';

const EMPTY_FORM = { fullName: '', email: '', affiliation: '', paperTitle: '', abstract: '', comments: '' };
const COAUTHOR_FIELDS = ['fullName', 'affiliation', 'email'];

const SECTIONS = [
  { id: 'author', title: 'Author', icon: 'user' },
  { id: 'coauthors', title: 'Co-authors', icon: 'users' },
  { id: 'details', title: 'Paper details', icon: 'fileText' },
  { id: 'manuscript', title: 'Manuscript', icon: 'upload' },
  { id: 'cover', title: 'Cover letter', icon: 'mail' },
  { id: 'review', title: 'Review & submit', icon: 'checkCircle' },
];

const GUIDELINES = [
  'Prepare your manuscript with the IJEPA paper template.',
  'Times New Roman 12 pt, single column, 1.5 line spacing.',
  'Use the IEEE reference style throughout.',
  'The work must be original and not under review elsewhere.',
  'All submissions go through double-blind peer review.',
];

const countWords = (text) => {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
};

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileExtension = (name) => {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const newCoAuthor = () => ({ id: `ca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, fullName: '', affiliation: '', email: '' });
const coAuthorHasContent = (c) => COAUTHOR_FIELDS.some((f) => String(c?.[f] || '').trim());
const coKey = (id, field) => `coAuthors.${id}.${field}`;

// Maps a validation key to the DOM id of the control that should receive focus.
const domIdFor = (key) => {
  if (key.startsWith('coAuthors.')) {
    const [, id, field] = key.split('.');
    return `coauthor-${id}-${field}`;
  }
  if (key === 'manuscript') return 'manuscript-browse';
  return key;
};

// --- validation -----------------------------------------------------------------------------

const validateField = (name, rawValue) => {
  const value = String(rawValue || '').trim();
  switch (name) {
    case 'fullName':
      return value ? '' : 'Enter your full name.';
    case 'email':
      if (!value) return 'Enter your email address.';
      return EMAIL_RE.test(value) ? '' : 'Enter a valid email address, like name@university.edu.';
    case 'affiliation':
      return value ? '' : 'Enter your affiliation or institution.';
    case 'paperTitle':
      return value ? '' : 'Enter the title of your paper.';
    case 'abstract': {
      const words = countWords(value);
      if (!words) return 'Add an abstract for your paper.';
      if (words < ABSTRACT_MIN_WORDS) return `Your abstract has ${words} word${words === 1 ? '' : 's'} — it needs at least ${ABSTRACT_MIN_WORDS}.`;
      if (words > ABSTRACT_MAX_WORDS) return `Your abstract has ${words} words — shorten it to ${ABSTRACT_MAX_WORDS} or fewer.`;
      return '';
    }
    case 'comments':
      return value.length > COVER_LETTER_MAX ? `Keep the cover letter to ${COVER_LETTER_MAX} characters.` : '';
    default:
      return '';
  }
};

const validateCoAuthorField = (field, rawValue) => {
  const value = String(rawValue || '').trim();
  if (field === 'fullName') return value ? '' : "Enter the co-author's name.";
  if (field === 'affiliation') return value ? '' : "Enter the co-author's affiliation.";
  if (!value) return "Enter the co-author's email.";
  return EMAIL_RE.test(value) ? '' : 'Enter a valid email address.';
};

const validateFile = (file) => {
  if (!file) return '';
  if (!ACCEPTED_EXTENSIONS.includes(fileExtension(file.name))) {
    return `“${file.name}” isn't a supported format. Upload a PDF, DOC or DOCX file.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. The maximum file size is 20 MB.`;
  }
  if (file.size === 0) {
    return `“${file.name}” appears to be empty. Choose another file.`;
  }
  return '';
};

// --- draft persistence (never includes the file) -------------------------------------------

const draftKey = (userId) => `${DRAFT_KEY_PREFIX}.${userId || 'anon'}`;

const readDraft = (userId) => {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.form ? parsed : null;
  } catch (e) {
    return null;
  }
};

const writeDraft = (userId, draft) => {
  try {
    window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
    return true;
  } catch (e) {
    return false;
  }
};

const clearDraft = (userId) => {
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch (e) {
    // storage unavailable — nothing to clear
  }
};

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
};

// --- small presentational pieces ------------------------------------------------------------

const Field = ({ id, label, required, optional, hint, error, meta, action, className = '', children }) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const metaId = meta ? `${id}-meta` : undefined;
  const describedBy = [errorId, hintId, metaId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${className}`}>
      <div className="field-label">
        <label htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
          {optional && <span className="optional">(optional)</span>}
        </label>
        {action}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {(error || hint || meta) && (
        <div className="field-meta">
          <div>
            {error && <p className="field-error" id={errorId}><Icon name="alert" size={15} />{error}</p>}
            {hint && <p className="field-hint" id={hintId}>{hint}</p>}
          </div>
          {meta && <span id={metaId}>{meta}</span>}
        </div>
      )}
    </div>
  );
};

const SectionCard = ({ section, index, complete, description, headingRef, children }) => (
  <section id={`section-${section.id}`} className={`form-section${complete ? ' is-complete' : ''}`} aria-labelledby={`section-${section.id}-title`}>
    <div className="form-section-head">
      <span className="section-num" aria-hidden="true">
        <Icon name={complete ? 'check' : section.icon} size={20} strokeWidth={complete ? 2.6 : 1.8} />
        <b>{index + 1}</b>
      </span>
      <div>
        <h2 id={`section-${section.id}-title`} tabIndex={-1} ref={headingRef}>
          <span className="sr-only">Step {index + 1}: </span>{section.title}
        </h2>
        {description && <p>{description}</p>}
      </div>
    </div>
    <div className="form-section-body">{children}</div>
  </section>
);

const SuccessArt = () => (
  <svg className="success-art" viewBox="0 0 128 128" aria-hidden="true" focusable="false">
    <circle cx="64" cy="64" r="62" className="sa-halo" />
    <circle cx="64" cy="64" r="52" className="sa-ring" />
    <circle cx="64" cy="64" r="40" className="sa-disc" />
    <path d="M46 65l12 12 24-26" className="sa-check" />
    <circle cx="18" cy="30" r="4" className="sa-spark" />
    <circle cx="110" cy="24" r="3" className="sa-spark" />
    <circle cx="112" cy="98" r="4" className="sa-spark" />
  </svg>
);

const SuccessView = ({ submission, onDashboard, onAnother }) => {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <div className="dash-page">
      <div className="journal-container">
        <div className="success-shell">
          <SuccessArt />
          <h1 ref={headingRef} tabIndex={-1}>Submission received</h1>
          <p className="success-title">“{submission.title}”</p>
          {submission.id && (
            <span className="success-ref">Submission ID <strong>#{submission.id}</strong></span>
          )}

          <h2 className="next-title">What happens next</h2>
          <ol className="next-steps">
            <li>
              <span className="ns-num" aria-hidden="true">1</span>
              <strong>Editorial check</strong>
              <p>The editorial team checks your manuscript for scope, formatting and originality.</p>
            </li>
            <li>
              <span className="ns-num" aria-hidden="true">2</span>
              <strong>Peer review</strong>
              <p>Suitable manuscripts go to double-blind peer review. Reviewers may ask for revisions.</p>
            </li>
            <li>
              <span className="ns-num" aria-hidden="true">3</span>
              <strong>Decision</strong>
              <p>The editor makes the final decision, which you’ll see on your dashboard.</p>
            </li>
          </ol>

          <div className="success-actions">
            <button type="button" className="button button-primary" onClick={onDashboard}>
              Go to dashboard <Icon name="arrowRight" size={16} />
            </button>
            <button type="button" className="button button-ghost" onClick={onAnother}>
              <Icon name="plus" size={16} /> Submit another
            </button>
          </div>
          <p className="success-foot">You can track the status of this submission at any time from your author dashboard.</p>
        </div>
      </div>
    </div>
  );
};

// --- page -----------------------------------------------------------------------------------

const SubmitForm = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [coAuthors, setCoAuthors] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keywordAnnouncement, setKeywordAnnouncement] = useState('');
  const [manuscript, setManuscript] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [touched, setTouched] = useState({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [locked, setLocked] = useState({ fullName: false, email: false });

  const [initialized, setInitialized] = useState(false);
  const [draftNotice, setDraftNotice] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const submittingRef = useRef(false);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);
  const topAlertRef = useRef(null);
  const headingRefs = useRef({});

  const profile = useMemo(() => ({
    fullName: user?.name && !String(user.name).includes('@') ? String(user.name) : '',
    email: user?.email ? String(user.email) : '',
  }), [user]);

  // Redirect guests to login; the route itself is public.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/submitform' } });
  }, [user, authLoading, navigate]);

  // Pre-fill identity from the account and restore any saved draft (once).
  useEffect(() => {
    if (!user || initialized) return;
    const base = { ...EMPTY_FORM, fullName: profile.fullName, email: profile.email };
    const draft = readDraft(user.id);
    let next = base;
    if (draft) {
      next = { ...base, ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, String(draft.form?.[k] ?? base[k] ?? '')])) };
      setCoAuthors(Array.isArray(draft.coAuthors) ? draft.coAuthors.map((c) => ({ ...newCoAuthor(), ...c })) : []);
      setKeywords(Array.isArray(draft.keywords) ? draft.keywords.filter((k) => typeof k === 'string') : []);
      setDraftNotice({ savedAt: draft.savedAt });
      setLastSaved(draft.savedAt || null);
    }
    setForm(next);
    setLocked({
      fullName: Boolean(profile.fullName) && next.fullName === profile.fullName,
      email: Boolean(profile.email) && next.email === profile.email && !validateField('email', profile.email),
    });
    setInitialized(true);
  }, [user, initialized, profile]);

  const hasDraftContent = useMemo(() => (
    Boolean(form.affiliation.trim() || form.paperTitle.trim() || form.abstract.trim() || form.comments.trim())
    || form.fullName !== profile.fullName || form.email !== profile.email
    || coAuthors.some(coAuthorHasContent) || keywords.length > 0
  ), [form, coAuthors, keywords, profile]);

  // Debounced autosave of everything except the manuscript file.
  useEffect(() => {
    if (!initialized || !user || submission) return undefined;
    const t = setTimeout(() => {
      if (!hasDraftContent) {
        clearDraft(user.id);
        setLastSaved(null);
        return;
      }
      const savedAt = Date.now();
      if (writeDraft(user.id, { savedAt, form, coAuthors, keywords })) setLastSaved(savedAt);
    }, 600);
    return () => clearTimeout(t);
  }, [form, coAuthors, keywords, initialized, user, submission, hasDraftContent]);

  // Stop the browser from opening a file dropped outside the upload zone.
  useEffect(() => {
    const prevent = (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // Highlight the step for the section currently in view.
  useEffect(() => {
    if (!initialized || submission || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length) setActiveSection(visible[0].target.id.replace('section-', ''));
    }, { rootMargin: '-35% 0px -60% 0px' });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [initialized, submission]);

  // --- derived validation state ------------------------------------------------------------

  const errors = useMemo(() => {
    const next = {};
    ['fullName', 'email', 'affiliation', 'paperTitle', 'abstract', 'comments'].forEach((name) => {
      const msg = validateField(name, form[name]);
      if (msg) next[name] = msg;
    });
    coAuthors.forEach((c) => {
      if (!coAuthorHasContent(c)) return;
      COAUTHOR_FIELDS.forEach((f) => {
        const msg = validateCoAuthorField(f, c[f]);
        if (msg) next[coKey(c.id, f)] = msg;
      });
    });
    if (fileError) next.manuscript = fileError;
    else if (!manuscript) next.manuscript = 'Upload your manuscript file.';
    return next;
  }, [form, coAuthors, manuscript, fileError]);

  const visibleError = (key) => {
    if (key === 'manuscript' && fileError) return fileError;
    return (showAllErrors || touched[key]) ? errors[key] : undefined;
  };

  const fieldOrder = useMemo(() => [
    'fullName', 'email', 'affiliation',
    ...coAuthors.flatMap((c) => COAUTHOR_FIELDS.map((f) => coKey(c.id, f))),
    'paperTitle', 'abstract', 'manuscript', 'comments',
  ], [coAuthors]);

  const sectionErrors = (keys) => keys.some((k) => visibleError(k));
  const coAuthorKeys = coAuthors.flatMap((c) => COAUTHOR_FIELDS.map((f) => coKey(c.id, f)));
  const authorDone = !errors.fullName && !errors.email && !errors.affiliation;
  const coAuthorsDone = coAuthorKeys.every((k) => !errors[k]);
  const detailsDone = !errors.paperTitle && !errors.abstract;
  const manuscriptDone = Boolean(manuscript) && !fileError;
  const readyToReview = authorDone && coAuthorsDone && detailsDone && manuscriptDone && !errors.comments;

  const sectionState = {
    author: { done: authorDone, error: sectionErrors(['fullName', 'email', 'affiliation']) },
    coauthors: { done: coAuthorsDone && coAuthors.some(coAuthorHasContent), error: sectionErrors(coAuthorKeys) },
    details: { done: detailsDone, error: sectionErrors(['paperTitle', 'abstract']) },
    manuscript: { done: manuscriptDone, error: Boolean(visibleError('manuscript')) },
    cover: { done: Boolean(form.comments.trim()) && !errors.comments, error: sectionErrors(['comments']) },
    review: { done: false, error: false },
  };
  const requiredDone = [authorDone && coAuthorsDone, detailsDone, manuscriptDone].filter(Boolean).length;

  const errorSummary = showAllErrors
    ? fieldOrder.filter((k) => errors[k]).map((k) => ({ key: k, message: errors[k] }))
    : [];

  // --- handlers ----------------------------------------------------------------------------

  const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'comments' ? value.slice(0, COVER_LETTER_MAX) : value }));
  };

  const handleBlur = (e) => markTouched(e.target.name);

  const unlockField = (name) => {
    setLocked((prev) => ({ ...prev, [name]: false }));
    setTimeout(() => {
      const el = document.getElementById(name);
      if (el) { el.focus(); el.select?.(); }
    }, 0);
  };

  const relockField = (name) => {
    setForm((prev) => ({ ...prev, [name]: profile[name] }));
    setLocked((prev) => ({ ...prev, [name]: true }));
  };

  const focusField = useCallback((key) => {
    if ((key === 'fullName' || key === 'email') && locked[key]) {
      setLocked((prev) => ({ ...prev, [key]: false }));
    }
    setTimeout(() => {
      const el = document.getElementById(domIdFor(key));
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }, 0);
  }, [locked]);

  const focusSection = (id) => {
    setReviewOpen(false);
    setTimeout(() => {
      const section = document.getElementById(`section-${id}`);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      headingRefs.current[id]?.focus({ preventScroll: true });
    }, 0);
  };

  // co-authors
  const addCoAuthor = () => {
    const row = newCoAuthor();
    setCoAuthors((prev) => [...prev, row]);
    setTimeout(() => document.getElementById(`coauthor-${row.id}-fullName`)?.focus(), 0);
  };

  const removeCoAuthor = (id) => {
    setCoAuthors((prev) => prev.filter((c) => c.id !== id));
    setTouched((prev) => {
      const next = { ...prev };
      COAUTHOR_FIELDS.forEach((f) => { delete next[coKey(id, f)]; });
      return next;
    });
    setTimeout(() => document.getElementById('add-coauthor')?.focus(), 0);
  };

  const updateCoAuthor = (id, field, value) => {
    setCoAuthors((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // keywords
  const commitKeywords = (raw) => {
    const parts = String(raw || '').split(',').map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords((prev) => {
      const seen = new Set(prev.map((k) => k.toLowerCase()));
      const added = [];
      parts.forEach((p) => {
        const k = p.slice(0, 60);
        if (!seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); added.push(k); }
      });
      if (added.length) setKeywordAnnouncement(`Added keyword ${added.join(', ')}.`);
      return added.length ? [...prev, ...added] : prev;
    });
  };

  const removeKeyword = (keyword) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
    setKeywordAnnouncement(`Removed keyword ${keyword}.`);
    setTimeout(() => document.getElementById('keywords-input')?.focus(), 0);
  };

  const handleKeywordChange = (e) => {
    const { value } = e.target;
    if (value.includes(',')) {
      const segments = value.split(',');
      const rest = segments.pop();
      commitKeywords(segments.join(','));
      setKeywordDraft(rest.trimStart());
    } else {
      setKeywordDraft(value);
    }
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitKeywords(keywordDraft);
      setKeywordDraft('');
    } else if (e.key === 'Backspace' && !keywordDraft && keywords.length) {
      e.preventDefault();
      removeKeyword(keywords[keywords.length - 1]);
    }
  };

  const handleKeywordBlur = () => {
    if (keywordDraft.trim()) {
      commitKeywords(keywordDraft);
      setKeywordDraft('');
    }
  };

  // manuscript
  const acceptFile = (file) => {
    markTouched('manuscript');
    const msg = validateFile(file);
    if (msg) {
      setFileError(msg);
      return;
    }
    setFileError('');
    setManuscript(file);
  };

  const handleFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) acceptFile(file);
    e.target.value = '';
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const removeFile = () => {
    setManuscript(null);
    setFileError('');
    markTouched('manuscript');
    setTimeout(() => document.getElementById('manuscript-browse')?.focus(), 0);
  };

  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragOver = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    if (files.length > 1) {
      markTouched('manuscript');
      setFileError('Drop a single file — only one manuscript can be attached.');
      return;
    }
    acceptFile(files[0]);
  };

  // draft
  const discardDraft = () => {
    if (user) clearDraft(user.id);
    setForm({ ...EMPTY_FORM, fullName: profile.fullName, email: profile.email });
    setLocked({ fullName: Boolean(profile.fullName), email: Boolean(profile.email) && !validateField('email', profile.email) });
    setCoAuthors([]);
    setKeywords([]);
    setKeywordDraft('');
    setTouched({});
    setShowAllErrors(false);
    setDraftNotice(null);
    setLastSaved(null);
  };

  // submit
  const handleReviewRequest = (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (keywordDraft.trim()) {
      commitKeywords(keywordDraft);
      setKeywordDraft('');
    }
    setServerError('');
    setShowAllErrors(true);
    const firstInvalid = fieldOrder.find((k) => errors[k]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setReviewOpen(true);
  };

  const buildFormData = () => {
    const data = new FormData();
    data.append('fullName', form.fullName.trim());
    data.append('email', form.email.trim());
    data.append('affiliation', form.affiliation.trim());
    data.append('paperTitle', form.paperTitle.trim());
    data.append('abstract', form.abstract.trim());
    data.append('keywords', keywords.join(', '));
    data.append('comments', form.comments.trim());
    const cleanCoAuthors = coAuthors
      .filter(coAuthorHasContent)
      .map((c) => ({ fullName: c.fullName.trim(), affiliation: c.affiliation.trim(), email: c.email.trim() }));
    data.append('coAuthors', JSON.stringify(cleanCoAuthors));
    if (user?.id) data.append('userId', String(user.id));
    if (manuscript) data.append('manuscript', manuscript);
    return data;
  };

  const handleConfirmSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setServerError('');

    let failure = '';
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, { method: 'POST', headers: authHeaders(), body: buildFormData() });
      let data = null;
      try { data = await response.json(); } catch (e) { data = null; }

      if (response.ok && data?.success) {
        if (user) clearDraft(user.id);
        setSubmission({ title: form.paperTitle.trim(), id: data?.paper?.id || null });
        setReviewOpen(false);
        window.scrollTo({ top: 0 });
        return;
      }
      if (response.status === 413) failure = 'The server rejected the file because it is too large. Try a smaller file.';
      else failure = data?.error || 'We couldn’t submit your paper. Please try again.';
    } catch (error) {
      console.error('Submission failed', error);
      failure = 'We couldn’t reach the server. Check your connection and try again — your draft is saved.';
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }

    setServerError(failure);
    setReviewOpen(false);
    setTimeout(() => {
      topAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      topAlertRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const resetForAnother = () => {
    setSubmission(null);
    setForm({ ...EMPTY_FORM, fullName: profile.fullName, email: profile.email });
    setLocked({ fullName: Boolean(profile.fullName), email: Boolean(profile.email) && !validateField('email', profile.email) });
    setCoAuthors([]);
    setKeywords([]);
    setKeywordDraft('');
    setManuscript(null);
    setFileError('');
    setTouched({});
    setShowAllErrors(false);
    setDraftNotice(null);
    setLastSaved(null);
    setServerError('');
    setActiveSection(SECTIONS[0].id);
    window.scrollTo({ top: 0 });
  };

  // --- render ------------------------------------------------------------------------------

  if (authLoading || !user || !initialized) {
    return (
      <div className="dash-page" aria-busy="true">
        <div className="journal-container">
          <span className="sr-only" role="status">Loading submission form…</span>
          <div className="submit-head skeleton-stack" aria-hidden="true">
            <Skeleton width={120} height={14} />
            <Skeleton width="min(420px, 80%)" height={32} />
          </div>
          <div className="submit-layout" aria-hidden="true">
            <div>
              {[0, 1].map((i) => (
                <div className="form-section" key={i}>
                  <div className="form-section-body skeleton-stack"><Skeleton width="40%" height={20} /><Skeleton height={44} /><Skeleton height={44} /></div>
                </div>
              ))}
            </div>
            <div className="aside-card skeleton-stack"><Skeleton width="60%" height={18} /><Skeleton height={120} /></div>
          </div>
        </div>
      </div>
    );
  }

  if (submission) {
    return (
      <SuccessView
        submission={submission}
        onDashboard={() => navigate('/author-dashboard')}
        onAnother={resetForAnother}
      />
    );
  }

  const abstractWords = countWords(form.abstract);
  const abstractCounterClass = !abstractWords
    ? ''
    : abstractWords > ABSTRACT_MAX_WORDS ? 'is-over'
      : abstractWords >= ABSTRACT_MIN_WORDS ? 'is-ok' : 'is-warn';
  const coverLength = form.comments.length;
  const coverCounterClass = coverLength >= COVER_LETTER_MAX ? 'is-over' : coverLength >= COVER_LETTER_MAX - 50 ? 'is-warn' : '';
  const manuscriptError = visibleError('manuscript');
  const filledCoAuthors = coAuthors.filter(coAuthorHasContent);

  const identityField = (name, label, type, autoComplete, placeholder) => {
    const isLocked = locked[name];
    const canRelock = !isLocked && Boolean(profile[name]) && (name !== 'email' || !validateField('email', profile.email));
    return (
      <Field
        id={name}
        label={label}
        required
        error={visibleError(name)}
        hint={isLocked ? 'From your account. Select Edit to change it for this submission.' : undefined}
        action={isLocked ? (
          <button type="button" className="edit-toggle" onClick={() => unlockField(name)} aria-label={`Edit ${label.toLowerCase()}`}>
            <Icon name="edit" size={14} /> Edit
          </button>
        ) : canRelock ? (
          <button type="button" className="edit-toggle" onClick={() => relockField(name)}>
            Use account {name === 'email' ? 'email' : 'name'}
          </button>
        ) : null}
      >
        {(a11y) => (
          <input
            {...a11y}
            type={type}
            name={name}
            value={form[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            readOnly={isLocked}
            required
            autoComplete={autoComplete}
            placeholder={placeholder}
            className={`form-input${visibleError(name) ? ' is-invalid' : ''}`}
          />
        )}
      </Field>
    );
  };

  return (
    <div className="dash-page">
      <div className="journal-container">
        <div className="submit-head">
          <Link to="/author-dashboard" className="back-link"><Icon name="arrowLeft" size={16} /> Back to dashboard</Link>
          <p className="dash-role"><span className="dash-role-dot" aria-hidden="true" />New submission</p>
          <h1>Submit your manuscript</h1>
          <p>
            Complete the six steps below. Fields marked <span className="req" aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.
            Your progress is saved on this device as you type.
          </p>
          <div className="submit-head-links">
            <Link to="/author-guidelines"><Icon name="book" size={16} /> Author guidelines</Link>
            <a href={paperTemplate} download="IJEPA Paper Template.docx"><Icon name="download" size={16} /> Download paper template (.docx)</a>
          </div>
        </div>

        <nav aria-label="Submission steps">
          <ol className="form-stepper">
            {SECTIONS.map((s, i) => {
              const st = sectionState[s.id];
              const cls = [st.done && 'is-done', st.error && 'is-error', activeSection === s.id && 'is-active'].filter(Boolean).join(' ');
              return (
                <li key={s.id} className={cls}>
                  <button type="button" onClick={() => focusSection(s.id)} aria-current={activeSection === s.id ? 'step' : undefined}>
                    <span className="fs-num" aria-hidden="true">
                      {st.error ? '!' : st.done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    {s.title}
                    <span className="sr-only">{st.error ? ' — needs attention' : st.done ? ' — complete' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="submit-layout">
          <form className="submit-main" onSubmit={handleReviewRequest} noValidate>
            <div className="submit-alerts" ref={topAlertRef} tabIndex={-1}>
              {serverError && (
                <Alert type="error" title="Your paper wasn’t submitted" message={serverError} onClose={() => setServerError('')} />
              )}
              {!serverError && errorSummary.length > 0 && (
                <Alert type="error" title={`Please fix ${errorSummary.length} ${errorSummary.length === 1 ? 'issue' : 'issues'} before continuing`}>
                  <ul>
                    {errorSummary.map((item) => (
                      <li key={item.key}>
                        <button type="button" className="link-btn" onClick={() => focusField(item.key)}>{item.message}</button>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
              {draftNotice && (
                <Alert type="info" title="Draft restored" onClose={() => setDraftNotice(null)}>
                  <p>
                    We restored the details you entered{draftNotice.savedAt ? ` on ${formatTime(draftNotice.savedAt)}` : ''}.
                    Files aren’t saved in drafts, so please attach your manuscript again.
                  </p>
                  <div className="alert-actions">
                    <button type="button" className="link-btn" onClick={discardDraft}>Discard draft and start over</button>
                  </div>
                </Alert>
              )}
            </div>

            {/* 1. Author */}
            <SectionCard
              section={SECTIONS[0]}
              index={0}
              complete={sectionState.author.done}
              description="You’ll be the corresponding author for this submission."
              headingRef={(el) => { headingRefs.current.author = el; }}
            >
              <div className="field-grid-2">
                {identityField('fullName', 'Full name', 'text', 'name', 'e.g. Priya Sharma')}
                {identityField('email', 'Email address', 'email', 'email', 'name@university.edu')}
                <Field id="affiliation" label="Affiliation / institution" required error={visibleError('affiliation')} className="is-wide">
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      name="affiliation"
                      value={form.affiliation}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      autoComplete="organization"
                      placeholder="University, company or organisation"
                      className={`form-input${visibleError('affiliation') ? ' is-invalid' : ''}`}
                    />
                  )}
                </Field>
              </div>
            </SectionCard>

            {/* 2. Co-authors */}
            <SectionCard
              section={SECTIONS[1]}
              index={1}
              complete={sectionState.coauthors.done}
              description="Optional. Add everyone who contributed, in order of contribution."
              headingRef={(el) => { headingRefs.current.coauthors = el; }}
            >
              {coAuthors.length === 0 && <p className="muted-note">No co-authors added. Skip this step if you are the sole author.</p>}
              {coAuthors.map((c, index) => (
                <fieldset key={c.id} className="coauthor-card">
                  <legend className="sr-only">Co-author {index + 1}</legend>
                  <div className="coauthor-head">
                    <strong><span className="coauthor-index" aria-hidden="true">{index + 1}</span>Co-author {index + 1}</strong>
                    <button type="button" className="icon-btn icon-btn-danger" onClick={() => removeCoAuthor(c.id)} aria-label={`Remove co-author ${index + 1}${c.fullName ? ` (${c.fullName})` : ''}`}>
                      <Icon name="trash" size={15} /> Remove
                    </button>
                  </div>
                  <div className="field-grid-3">
                    {COAUTHOR_FIELDS.map((f) => {
                      const key = coKey(c.id, f);
                      const err = visibleError(key);
                      const labels = { fullName: 'Full name', affiliation: 'Affiliation', email: 'Email' };
                      const placeholders = { fullName: 'Co-author name', affiliation: 'Institution', email: 'name@email.com' };
                      return (
                        <Field key={f} id={`coauthor-${c.id}-${f}`} label={labels[f]} required error={err}>
                          {(a11y) => (
                            <input
                              {...a11y}
                              type={f === 'email' ? 'email' : 'text'}
                              value={c[f]}
                              onChange={(e) => updateCoAuthor(c.id, f, e.target.value)}
                              onBlur={() => markTouched(key)}
                              placeholder={placeholders[f]}
                              autoComplete="off"
                              className={`form-input${err ? ' is-invalid' : ''}`}
                            />
                          )}
                        </Field>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <button type="button" id="add-coauthor" className="add-row" onClick={addCoAuthor}>
                <Icon name="plus" size={18} /> Add {coAuthors.length ? 'another' : 'a'} co-author
              </button>
            </SectionCard>

            {/* 3. Paper details */}
            <SectionCard
              section={SECTIONS[2]}
              index={2}
              complete={sectionState.details.done}
              description="This is what editors and reviewers see first."
              headingRef={(el) => { headingRefs.current.details = el; }}
            >
              <Field id="paperTitle" label="Paper title" required error={visibleError('paperTitle')}>
                {(a11y) => (
                  <input
                    {...a11y}
                    type="text"
                    name="paperTitle"
                    value={form.paperTitle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    placeholder="Enter the full title of your research paper"
                    className={`form-input${visibleError('paperTitle') ? ' is-invalid' : ''}`}
                  />
                )}
              </Field>

              <Field
                id="abstract"
                label="Abstract"
                required
                error={visibleError('abstract')}
                hint={`Between ${ABSTRACT_MIN_WORDS} and ${ABSTRACT_MAX_WORDS} words.`}
                meta={(
                  <span className={`counter ${abstractCounterClass}`}>
                    {abstractWords} <span className="sr-only">words entered, </span>
                    <span aria-hidden="true">/ {ABSTRACT_MIN_WORDS}–{ABSTRACT_MAX_WORDS} words</span>
                  </span>
                )}
              >
                {(a11y) => (
                  <textarea
                    {...a11y}
                    name="abstract"
                    value={form.abstract}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    rows={8}
                    placeholder="Summarise the problem, method, key results and conclusion."
                    className={`form-textarea${visibleError('abstract') ? ' is-invalid' : ''}`}
                  />
                )}
              </Field>

              <div className="field">
                <div className="field-label">
                  <label htmlFor="keywords-input">Keywords<span className="optional">(optional)</span></label>
                </div>
                <div className="tag-input" onClick={() => document.getElementById('keywords-input')?.focus()} role="presentation">
                  {keywords.length > 0 && (
                    <ul className="chip-list" aria-label="Added keywords">
                      {keywords.map((k) => (
                        <li key={k} className="tag">
                          {k}
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeKeyword(k); }} aria-label={`Remove keyword ${k}`}>
                            <Icon name="x" size={13} strokeWidth={2.4} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    id="keywords-input"
                    type="text"
                    value={keywordDraft}
                    onChange={handleKeywordChange}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={handleKeywordBlur}
                    placeholder={keywords.length ? 'Add another…' : 'e.g. Renewable energy'}
                    aria-describedby="keywords-hint"
                    autoComplete="off"
                  />
                </div>
                <p className="field-hint" id="keywords-hint">Press Enter or type a comma after each keyword. 3–6 keywords are recommended.</p>
                <span className="sr-only" aria-live="polite">{keywordAnnouncement}</span>
              </div>
            </SectionCard>

            {/* 4. Manuscript */}
            <SectionCard
              section={SECTIONS[3]}
              index={3}
              complete={sectionState.manuscript.done}
              description="Upload the full manuscript prepared with the IJEPA template."
              headingRef={(el) => { headingRefs.current.manuscript = el; }}
            >
              <div className="field">
                <div className="field-label">
                  <span className="label-text" id="manuscript-label">Manuscript file<span className="req" aria-hidden="true">*</span></span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFilePick}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                  {manuscript ? (
                    <div className={`file-card${isDragging ? ' is-dragging' : ''}`}>
                      <span className={`file-type${fileExtension(manuscript.name) === 'pdf' ? ' is-pdf' : ''}`} aria-hidden="true">
                        {fileExtension(manuscript.name).toUpperCase()}
                      </span>
                      <div className="file-info">
                        <strong title={manuscript.name}>{manuscript.name}</strong>
                        <span>{formatBytes(manuscript.size)} · <span className="ok"><Icon name="checkCircle" size={14} /> Ready to upload</span></span>
                      </div>
                      <div className="file-actions">
                        <button type="button" id="manuscript-replace" className="icon-btn" onClick={openFilePicker}>
                          <Icon name="refresh" size={15} /> Replace
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" onClick={removeFile} aria-label={`Remove ${manuscript.name}`}>
                          <Icon name="trash" size={15} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`dropzone${isDragging ? ' is-dragging' : ''}${manuscriptError ? ' is-invalid' : ''}`}
                      onClick={(e) => { if (!e.target.closest('button')) openFilePicker(); }}
                      role="presentation"
                    >
                      <span className="dropzone-icon" aria-hidden="true"><Icon name="upload" size={24} /></span>
                      <p className="dropzone-title">
                        {isDragging ? 'Drop your file to upload' : <>Drag &amp; drop your manuscript, or{' '}
                          <button
                            type="button"
                            id="manuscript-browse"
                            className="link-btn"
                            onClick={openFilePicker}
                            aria-describedby={['manuscript-label', 'manuscript-hint', manuscriptError ? 'manuscript-error' : null].filter(Boolean).join(' ')}
                          >
                            browse files
                          </button></>}
                      </p>
                      <p className="dropzone-hint" id="manuscript-hint">PDF, DOC or DOCX · up to 20 MB · one file</p>
                    </div>
                  )}
                </div>
                {manuscriptError && (
                  <p className="field-error" id="manuscript-error" role={fileError ? 'alert' : undefined}>
                    <Icon name="alert" size={15} />{manuscriptError}
                  </p>
                )}
                {draftNotice && !manuscript && !manuscriptError && (
                  <p className="field-hint">Your draft was restored — re-attach the manuscript file to continue.</p>
                )}
              </div>
            </SectionCard>

            {/* 5. Cover letter */}
            <SectionCard
              section={SECTIONS[4]}
              index={4}
              complete={sectionState.cover.done}
              description="Optional. Briefly highlight the contribution of your paper or add notes for the editor."
              headingRef={(el) => { headingRefs.current.cover = el; }}
            >
              <Field
                id="comments"
                label="Cover letter / comments"
                optional
                error={visibleError('comments')}
                meta={(
                  <span className={`counter ${coverCounterClass}`}>
                    {coverLength}<span aria-hidden="true"> / {COVER_LETTER_MAX}</span>
                    <span className="sr-only"> of {COVER_LETTER_MAX} characters used</span>
                  </span>
                )}
              >
                {(a11y) => (
                  <textarea
                    {...a11y}
                    name="comments"
                    value={form.comments}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={COVER_LETTER_MAX}
                    rows={5}
                    placeholder="Share any context, special requests or cover letter details…"
                    className={`form-textarea${visibleError('comments') ? ' is-invalid' : ''}`}
                  />
                )}
              </Field>
            </SectionCard>

            {/* 6. Review & submit */}
            <SectionCard
              section={SECTIONS[5]}
              index={5}
              complete={false}
              description="Check everything once more before you send it to the editorial office."
              headingRef={(el) => { headingRefs.current.review = el; }}
            >
              <div className="review-grid">
                {[
                  { label: 'Author information', ok: authorDone && coAuthorsDone, value: authorDone ? `${form.fullName} · ${form.email}${filledCoAuthors.length ? ` · ${filledCoAuthors.length} co-author${filledCoAuthors.length === 1 ? '' : 's'}` : ''}` : 'Name, email and affiliation are required', section: 'author' },
                  { label: 'Paper details', ok: detailsDone, value: detailsDone ? `${form.paperTitle} · ${abstractWords}-word abstract${keywords.length ? ` · ${keywords.length} keyword${keywords.length === 1 ? '' : 's'}` : ''}` : 'Title and a 150–300 word abstract are required', section: 'details' },
                  { label: 'Manuscript', ok: manuscriptDone, value: manuscript ? `${manuscript.name} (${formatBytes(manuscript.size)})` : 'No file attached yet', section: 'manuscript' },
                  { label: 'Cover letter', ok: Boolean(form.comments.trim()), optional: true, value: form.comments.trim() ? `${coverLength} characters` : 'Not added (optional)', section: 'cover' },
                ].map((row) => (
                  <div key={row.label} className={`review-row${row.ok ? '' : row.optional ? ' is-optional' : ' is-missing'}`}>
                    <span className="review-status" aria-hidden="true"><Icon name={row.ok ? 'check' : row.optional ? 'info' : 'x'} size={14} strokeWidth={2.6} /></span>
                    <div className="review-row-copy">
                      <strong>{row.label}<span className="sr-only">{row.ok ? ': complete' : row.optional ? ': optional' : ': incomplete'}</span></strong>
                      <span>{row.value}</span>
                    </div>
                    <button type="button" className="link-btn" onClick={() => focusSection(row.section)}>Edit</button>
                  </div>
                ))}
              </div>

              <p className="consent-note">
                By submitting, you confirm the work is original and not under consideration elsewhere, and you agree to the{' '}
                <Link to="/author-guidelines">Author Guidelines</Link> and{' '}
                <Link to="/author-guidelines#publication-ethics">Publication Ethics</Link> policy.
              </p>

              <div className="submit-actions">
                <span className="save-state">
                  {lastSaved ? <><Icon name="checkCircle" size={15} /> Draft saved {formatTime(lastSaved)}</> : 'Drafts save automatically on this device'}
                </span>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  Review submission <Icon name="arrowRight" size={16} />
                </button>
              </div>
            </SectionCard>
          </form>

          <aside className="submit-aside" aria-label="Submission help">
            <div className="aside-card aside-checklist">
              <h2><Icon name="checkCircle" size={18} /> Your checklist</h2>
              <div className="aside-progress">
                <span className="aside-progress-bar" aria-hidden="true"><span style={{ width: `${(requiredDone / 3) * 100}%` }} /></span>
                <span>{requiredDone} of 3 required</span>
              </div>
              <ul className="check-steps">
                {[
                  { label: 'Author info', done: authorDone && coAuthorsDone, section: 'author' },
                  { label: 'Paper details', done: detailsDone, section: 'details' },
                  { label: 'Manuscript', done: manuscriptDone, section: 'manuscript' },
                ].map((item) => (
                  <li key={item.label} className={item.done ? 'is-done' : ''}>
                    <span className="check-mark" aria-hidden="true"><Icon name="check" size={13} strokeWidth={3} /></span>
                    {item.label}
                    <span className="sr-only">{item.done ? ' — complete' : ' — to do'}</span>
                  </li>
                ))}
                <li className={readyToReview ? 'is-ready' : ''}>
                  <span className="check-mark" aria-hidden="true" />
                  Review
                  <small>{readyToReview ? 'Ready' : 'After the steps above'}</small>
                </li>
              </ul>
            </div>

            <div className="aside-card">
              <h2><Icon name="book" size={18} /> Submission guidelines</h2>
              <ul className="guide-list">
                {GUIDELINES.map((g) => <li key={g}>{g}</li>)}
              </ul>
              <Link to="/author-guidelines" className="aside-link">Read the full author guidelines <Icon name="arrowRight" size={15} /></Link>
            </div>

            <div className="aside-card">
              <h2><Icon name="file" size={18} /> Accepted formats</h2>
              <div className="format-list">
                <span className="format-pill">PDF</span>
                <span className="format-pill">DOC</span>
                <span className="format-pill">DOCX</span>
              </div>
              <p className="aside-note">One file per submission, up to 20 MB.</p>
            </div>

            <div className="aside-card template-card">
              <h2><Icon name="download" size={18} /> Paper template</h2>
              <p>Format your manuscript with the official IJEPA template (Word document, 137 KB).</p>
              <a href={paperTemplate} download="IJEPA Paper Template.docx" className="button button-light">
                <Icon name="download" size={16} /> Download template
              </a>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        closeDisabled={isSubmitting}
        size="lg"
        title="Review your submission"
        description="Make sure everything is correct — you can’t edit a submission after sending it."
        footer={(
          <>
            <button type="button" className="button button-ghost footer-start" onClick={() => setReviewOpen(false)} disabled={isSubmitting}>
              <Icon name="arrowLeft" size={16} /> Back to editing
            </button>
            <button type="button" className="button button-primary" onClick={handleConfirmSubmit} disabled={isSubmitting} aria-busy={isSubmitting || undefined} data-autofocus>
              {isSubmitting ? <><Spinner size="sm" /> Submitting…</> : <>Confirm &amp; submit <Icon name="send" size={16} /></>}
            </button>
          </>
        )}
      >
        <div className="summary-block">
          <h3>Corresponding author <button type="button" className="link-btn" onClick={() => focusSection('author')} disabled={isSubmitting}>Edit</button></h3>
          <div className="summary-value">{form.fullName}{'\n'}{form.email}{'\n'}{form.affiliation}</div>
        </div>
        <div className="summary-block">
          <h3>Co-authors <button type="button" className="link-btn" onClick={() => focusSection('coauthors')} disabled={isSubmitting}>Edit</button></h3>
          <div className="summary-value">
            {filledCoAuthors.length
              ? filledCoAuthors.map((c) => `${c.fullName} — ${c.affiliation} (${c.email})`).join('\n')
              : 'None'}
          </div>
        </div>
        <div className="summary-block">
          <h3>Title <button type="button" className="link-btn" onClick={() => focusSection('details')} disabled={isSubmitting}>Edit</button></h3>
          <div className="summary-value">{form.paperTitle}</div>
        </div>
        <div className="summary-block">
          <h3>Abstract · {abstractWords} words</h3>
          <div className="summary-value is-long" tabIndex={0} aria-label="Abstract">{form.abstract}</div>
        </div>
        <div className="summary-block">
          <h3>Keywords</h3>
          {keywords.length
            ? <div className="chip-list">{keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
            : <div className="summary-value">None</div>}
        </div>
        <div className="summary-block">
          <h3>Manuscript <button type="button" className="link-btn" onClick={() => focusSection('manuscript')} disabled={isSubmitting}>Change</button></h3>
          <div className="summary-value">{manuscript ? `${manuscript.name} · ${formatBytes(manuscript.size)}` : '—'}</div>
        </div>
        <div className="summary-block">
          <h3>Cover letter <button type="button" className="link-btn" onClick={() => focusSection('cover')} disabled={isSubmitting}>Edit</button></h3>
          <div className="summary-value">{form.comments.trim() || 'None'}</div>
        </div>
      </Modal>
    </div>
  );
};

export default SubmitForm;
