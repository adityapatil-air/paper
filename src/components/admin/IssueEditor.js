import React, { useEffect, useState } from 'react';
import { mockAPI } from '../../data/mockData';
import Alert from '../Alert';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import FilePicker from '../ui/FilePicker';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const emptyForm = () => ({
  volume: '',
  issue: '',
  month: '',
  year: String(new Date().getFullYear()),
  title: '',
  description: '',
  publishedAt: '',
  isCurrent: false,
});

const fromIssue = (issue) => ({
  volume: issue?.volume != null ? String(issue.volume) : '',
  issue: issue?.issue != null ? String(issue.issue) : '',
  month: issue?.month || '',
  year: issue?.year != null ? String(issue.year) : '',
  title: issue?.title || '',
  description: issue?.description || '',
  publishedAt: issue?.publishedAt ? String(issue.publishedAt).slice(0, 10) : '',
  isCurrent: Boolean(issue?.isCurrent),
});

const validate = (form) => {
  const errors = {};
  const positiveInt = (v) => /^\d+$/.test(String(v).trim()) && parseInt(v, 10) > 0;
  if (!positiveInt(form.volume)) errors.volume = 'Enter the volume number.';
  if (!positiveInt(form.issue)) errors.issue = 'Enter the issue number.';
  if (!/^\d{4}$/.test(String(form.year).trim())) errors.year = 'Enter a four-digit year.';
  return errors;
};

// Create / edit a journal issue: text fields, optional issue file (PDF/DOC/DOCX) and cover image.
const IssueEditor = ({ open, issue, onClose, onSaved }) => {
  const isEdit = Boolean(issue);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(issue ? fromIssue(issue) : emptyForm());
    setErrors({});
    setFile(null);
    setCover(null);
    setRemoveExistingFile(false);
    setRemoveExistingCover(false);
    setServerError('');
  }, [open, issue]);

  useEffect(() => {
    if (!cover) {
      setCoverPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const first = ['volume', 'issue', 'year'].find((k) => nextErrors[k]);
    if (first) {
      setTimeout(() => document.getElementById(`issue-${first}`)?.focus(), 0);
      return;
    }

    const data = new FormData();
    data.append('volume', form.volume.trim());
    data.append('issue', form.issue.trim());
    data.append('month', form.month);
    data.append('year', form.year.trim());
    data.append('title', form.title.trim());
    data.append('description', form.description.trim());
    data.append('publishedAt', form.publishedAt);
    data.append('isCurrent', form.isCurrent ? 'true' : 'false');
    if (file) data.append('file', file);
    else if (isEdit && removeExistingFile) data.append('removeFile', 'true');
    if (cover) data.append('coverImage', cover);
    else if (isEdit && removeExistingCover) data.append('removeCover', 'true');

    setSaving(true);
    setServerError('');
    const result = isEdit ? await mockAPI.updateIssue(issue.id, data) : await mockAPI.createIssue(data);
    setSaving(false);

    if (!result.success) {
      setServerError(result.code === 'AUTH_REQUIRED' || result.code === 'AUTH_EXPIRED'
        ? `${result.error} Sign out and sign back in with your admin account, then try again.`
        : result.error);
      return;
    }
    onSaved(result.issue, isEdit);
  };

  const existingFile = isEdit && issue?.fileUrl && !removeExistingFile && !file;
  const existingCover = isEdit && issue?.coverImageUrl && !removeExistingCover && !cover;

  const numberField = (name, label, placeholder) => (
    <div className="field">
      <div className="field-label"><label htmlFor={`issue-${name}`}>{label}<span className="req" aria-hidden="true">*</span></label></div>
      <input
        id={`issue-${name}`}
        type="text"
        inputMode="numeric"
        value={form[name]}
        onChange={(e) => setField(name, e.target.value.replace(/[^\d]/g, ''))}
        className={`form-input${errors[name] ? ' is-invalid' : ''}`}
        placeholder={placeholder}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `issue-${name}-error` : undefined}
        required
      />
      {errors[name] && <p className="field-error" id={`issue-${name}-error`}><Icon name="alert" size={15} />{errors[name]}</p>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      closeDisabled={saving}
      size="lg"
      title={isEdit ? `Edit Volume ${issue.volume}, Issue ${issue.issue}` : 'Add journal issue'}
      description="The current issue is featured on the home page and the Journal Issues page."
      footer={(
        <>
          <button type="button" className="button button-ghost" onClick={close} disabled={saving}>Cancel</button>
          <button type="submit" form="issue-editor-form" className="button button-primary" disabled={saving} aria-busy={saving || undefined}>
            {saving ? <><Spinner size="sm" /> Saving…</> : <><Icon name="check" size={16} /> {isEdit ? 'Save changes' : 'Create issue'}</>}
          </button>
        </>
      )}
    >
      <form id="issue-editor-form" onSubmit={handleSubmit} noValidate>
        {serverError && <Alert type="error" title="The issue wasn’t saved" message={serverError} onClose={() => setServerError('')} />}

        <div className="issue-editor-grid">
          {numberField('volume', 'Volume', 'e.g. 2')}
          {numberField('issue', 'Issue number', 'e.g. 3')}
          <div className="field">
            <div className="field-label"><label htmlFor="issue-month">Month</label></div>
            <select id="issue-month" value={form.month} onChange={(e) => setField('month', e.target.value)} className="form-select">
              <option value="">Select month…</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              {form.month && !MONTHS.includes(form.month) && <option value={form.month}>{form.month}</option>}
            </select>
          </div>
          {numberField('year', 'Year', 'e.g. 2026')}
        </div>

        <div className="field">
          <div className="field-label"><label htmlFor="issue-title">Title<span className="optional">(optional)</span></label></div>
          <input id="issue-title" type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} className="form-input" placeholder="e.g. Special issue on sustainable infrastructure" maxLength={200} />
        </div>

        <div className="field">
          <div className="field-meta field-label">
            <label htmlFor="issue-description">Description<span className="optional">(optional)</span></label>
            <span className="counter" id="issue-description-count">{form.description.length} / 2000</span>
          </div>
          <textarea id="issue-description" value={form.description} onChange={(e) => setField('description', e.target.value)} className="form-textarea" rows={5} maxLength={2000} aria-describedby="issue-description-count" placeholder="What this issue covers, editorial notes, highlights…" />
        </div>

        <div className="field issue-date-field">
          <div className="field-label"><label htmlFor="issue-published">Publication date<span className="optional">(optional)</span></label></div>
          <input id="issue-published" type="date" value={form.publishedAt} onChange={(e) => setField('publishedAt', e.target.value)} className="form-input" />
        </div>

        {existingFile ? (
          <div className="field">
            <div className="field-label"><span className="label-text">Issue file</span></div>
            <div className="file-card">
              <span className={`file-type${/\.pdf$/i.test(issue.fileName || issue.fileUrl) ? ' is-pdf' : ''}`} aria-hidden="true">
                {(String(issue.fileName || issue.fileUrl).split('.').pop() || 'FILE').toUpperCase().slice(0, 4)}
              </span>
              <div className="file-info">
                <strong title={issue.fileName || ''}>{issue.fileName || 'Issue file'}</strong>
                <span>Currently attached</span>
              </div>
              <div className="file-actions">
                <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="icon-btn"><Icon name="eye" size={15} /> View</a>
                <button type="button" className="icon-btn" onClick={() => setRemoveExistingFile(true)}><Icon name="refresh" size={15} /> Replace</button>
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => setRemoveExistingFile(true)} aria-label="Remove the attached issue file"><Icon name="trash" size={15} /> Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <FilePicker
              id="issue-file"
              label="Issue file (full issue PDF)"
              optional
              extensions={['pdf', 'doc', 'docx']}
              file={file}
              onChange={setFile}
              disabled={saving}
            />
            {isEdit && issue?.fileUrl && removeExistingFile && !file && (
              <p className="field-hint">The current file will be removed when you save. <button type="button" className="link-btn" onClick={() => setRemoveExistingFile(false)}>Keep current file</button></p>
            )}
          </>
        )}

        {existingCover ? (
          <div className="field">
            <div className="field-label"><span className="label-text">Cover image</span></div>
            <div className="cover-row">
              <img src={issue.coverImageUrl} alt="" className="cover-thumb" />
              <div className="file-actions">
                <button type="button" className="icon-btn" onClick={() => setRemoveExistingCover(true)}><Icon name="refresh" size={15} /> Replace</button>
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => setRemoveExistingCover(true)} aria-label="Remove the cover image"><Icon name="trash" size={15} /> Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <FilePicker
              id="issue-cover"
              label="Cover image"
              optional
              extensions={['jpg', 'jpeg', 'png', 'webp']}
              file={cover}
              onChange={setCover}
              disabled={saving}
            />
            {coverPreview && <img src={coverPreview} alt="Selected cover preview" className="cover-thumb cover-preview" />}
            {isEdit && issue?.coverImageUrl && removeExistingCover && !cover && (
              <p className="field-hint">The current cover will be removed when you save. <button type="button" className="link-btn" onClick={() => setRemoveExistingCover(false)}>Keep current cover</button></p>
            )}
          </>
        )}

        <label className="switch-row" htmlFor="issue-current">
          <span className="switch">
            <input id="issue-current" type="checkbox" role="switch" checked={form.isCurrent} onChange={(e) => setField('isCurrent', e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
          </span>
          <span>
            <strong>Set as current issue</strong>
            <small>Replaces the issue currently featured on the site.</small>
          </span>
        </label>
      </form>
    </Modal>
  );
};

export default IssueEditor;
