import React, { useCallback, useEffect, useState } from 'react';
import { mockAPI } from '../../data/mockData';
import { useToast } from '../ui/Toast';
import Alert from '../Alert';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import FilePicker from '../ui/FilePicker';
import Spinner from '../ui/Spinner';
import { Badge } from '../ui/StatusBadge';
import { joinAuthors } from '../ui/DashHeader';
import IssueEditor from './IssueEditor';
import { sortSpecialIssues } from '../../config/specialIssues';

const emptyPaper = { title: '', authors: '', category: '', abstract: '', keywords: '' };

const issueWhen = (issue) => [issue.month, issue.year].filter(Boolean).join(' ');

// Special issues: the admin creates the issue and publishes its papers directly. No author
// account, review, payment or emails are involved.
const SpecialIssues = () => {
  const toast = useToast();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [papersById, setPapersById] = useState({});
  const [editor, setEditor] = useState(null);
  const [issueToDelete, setIssueToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [paperIssue, setPaperIssue] = useState(null);
  const [paperForm, setPaperForm] = useState(emptyPaper);
  const [paperFile, setPaperFile] = useState(null);
  const [paperErrors, setPaperErrors] = useState({});
  const [paperSaving, setPaperSaving] = useState(false);
  const [paperServerError, setPaperServerError] = useState('');
  const [paperToRemove, setPaperToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadPapers = useCallback(async (issueId) => {
    const papers = await mockAPI.getIssuePapers(issueId);
    setPapersById((prev) => ({ ...prev, [issueId]: papers || [] }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const list = sortSpecialIssues(await mockAPI.getIssues());
    setIssues(list);
    setLoading(false);
    list.forEach((i) => loadPapers(i.id));
  }, [loadPapers]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved, wasEdit) => {
    setEditor(null);
    toast.success(wasEdit ? 'Special issue updated.' : 'Special issue created. Now add its papers.');
    load();
  };

  const handleDelete = async () => {
    if (!issueToDelete) return;
    setDeleting(true);
    const result = await mockAPI.deleteIssue(issueToDelete.id);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Special issue deleted.');
    setIssueToDelete(null);
    load();
  };

  const openAddPaper = (issue) => {
    setPaperIssue(issue);
    setPaperForm(emptyPaper);
    setPaperFile(null);
    setPaperErrors({});
    setPaperServerError('');
  };

  const setPaperField = (name, value) => {
    setPaperForm((prev) => ({ ...prev, [name]: value }));
    if (paperErrors[name]) setPaperErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAddPaper = async (e) => {
    e.preventDefault();
    if (paperSaving || !paperIssue) return;
    const errors = {};
    if (!paperForm.title.trim()) errors.title = 'Enter the paper title.';
    if (!paperForm.authors.trim()) errors.authors = 'Enter at least one author name.';
    if (!paperFile) errors.file = 'Attach the paper as a PDF.';
    setPaperErrors(errors);
    if (Object.keys(errors).length) return;

    const data = new FormData();
    Object.entries(paperForm).forEach(([k, v]) => data.append(k, v.trim()));
    data.append('manuscript', paperFile);
    setPaperSaving(true);
    setPaperServerError('');
    const result = await mockAPI.addSpecialIssuePaper(paperIssue.id, data);
    setPaperSaving(false);
    if (!result.success) {
      setPaperServerError(result.error);
      return;
    }
    toast.success('Paper published in the special issue.');
    const issueId = paperIssue.id;
    setPaperIssue(null);
    loadPapers(issueId);
  };

  const handleRemovePaper = async () => {
    if (!paperToRemove) return;
    setRemoving(true);
    const result = await mockAPI.deleteSpecialIssuePaper(paperToRemove.issue.id, paperToRemove.paper.id);
    setRemoving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Paper removed.');
    const issueId = paperToRemove.issue.id;
    setPaperToRemove(null);
    loadPapers(issueId);
  };

  const textField = (name, label, { required = false, placeholder = '', hint = '' } = {}) => (
    <div className="field">
      <div className="field-label">
        <label htmlFor={`sp-${name}`}>{label}{required ? <span className="req" aria-hidden="true">*</span> : <span className="optional">(optional)</span>}</label>
      </div>
      <input
        id={`sp-${name}`}
        type="text"
        value={paperForm[name]}
        onChange={(e) => setPaperField(name, e.target.value)}
        className={`form-input${paperErrors[name] ? ' is-invalid' : ''}`}
        placeholder={placeholder}
        maxLength={name === 'title' ? 300 : 500}
        aria-invalid={paperErrors[name] ? true : undefined}
        disabled={paperSaving}
      />
      {hint && !paperErrors[name] && <p className="field-hint">{hint}</p>}
      {paperErrors[name] && <p className="field-error"><Icon name="alert" size={15} />{paperErrors[name]}</p>}
    </div>
  );

  return (
    <section aria-labelledby="sec-special">
      <div className="section-title">
        <div>
          <h2 id="sec-special">Special issues</h2>
          <p>Publish papers straight to the site. No author account, review or payment is needed. The newest special issue is shown first on the home page.</p>
        </div>
        <button type="button" className="button button-primary button-small" onClick={() => setEditor({ issue: null })}>
          <Icon name="plus" size={16} /> New special issue
        </button>
      </div>

      {loading ? (
        <div className="loading-state"><Spinner size="sm" label="Loading special issues" /></div>
      ) : issues.length === 0 ? (
        <EmptyState
          title="No special issues yet"
          action={(
            <button type="button" className="button button-primary" onClick={() => setEditor({ issue: null })}>
              <Icon name="plus" size={16} /> Create a special issue
            </button>
          )}
        >
          Create the special issue with its title, description and cover, then add each paper with its PDF. Papers go live immediately.
        </EmptyState>
      ) : (
        <ul className="issue-list">
          {issues.map((issue, index) => {
            const papers = papersById[issue.id];
            return (
              <li key={issue.id} className={`issue-row special-row${index === 0 ? ' is-current' : ''}`}>
                <div className="issue-row-main">
                  {issue.coverImageUrl
                    ? <img src={issue.coverImageUrl} alt="" className="issue-cover-thumb" />
                    : <span className="issue-cover-thumb is-placeholder" aria-hidden="true">SPECIAL</span>}
                  <div className="issue-row-copy">
                    <div className="issue-row-titles">
                      <strong>{issue.title}</strong>
                      {index === 0 && <Badge tone="accepted" icon="globe">On home page</Badge>}
                    </div>
                    <span className="issue-date">
                      Special issue{issueWhen(issue) ? ` · ${issueWhen(issue)}` : ''}
                      {issue.fileName && <> · <Icon name="fileText" size={13} /> {issue.fileName}</>}
                    </span>
                    {issue.description && <p className="issue-desc">{issue.description}</p>}
                  </div>
                </div>
                <div className="row-actions issue-row-actions">
                  <button type="button" className="button button-primary button-small" onClick={() => openAddPaper(issue)}>
                    <Icon name="plus" size={15} /> Add paper
                  </button>
                  {issue.fileUrl && (
                    <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="icon-btn"><Icon name="eye" size={15} /> View file</a>
                  )}
                  <button type="button" className="icon-btn" onClick={() => setEditor({ issue })}><Icon name="edit" size={15} /> Edit</button>
                  <button type="button" className="icon-btn is-square icon-btn-danger" onClick={() => setIssueToDelete(issue)} aria-label={`Delete ${issue.title}`} title="Delete special issue">
                    <Icon name="trash" size={15} />
                  </button>
                </div>

                <div className="special-papers">
                  <h4>Papers {papers ? `(${papers.length})` : ''}</h4>
                  {!papers ? (
                    <p className="cell-sub">Loading papers…</p>
                  ) : papers.length === 0 ? (
                    <p className="cell-sub">No papers yet. Use <strong>Add paper</strong> to publish the first one.</p>
                  ) : (
                    <ul className="special-paper-list">
                      {papers.map((paper) => (
                        <li key={paper.id}>
                          <div>
                            <strong>{paper.title}</strong>
                            <span>{joinAuthors(paper.authors)}</span>
                          </div>
                          <div className="row-actions">
                            {paper.pdfUrl && (
                              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="view-link">View PDF</a>
                            )}
                            <button type="button" className="icon-btn is-square icon-btn-danger" onClick={() => setPaperToRemove({ issue, paper })} aria-label={`Remove ${paper.title}`} title="Remove paper">
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <IssueEditor
        special
        open={Boolean(editor)}
        issue={editor?.issue || null}
        onClose={() => setEditor(null)}
        onSaved={handleSaved}
      />

      <Modal
        open={Boolean(paperIssue)}
        onClose={() => { if (!paperSaving) setPaperIssue(null); }}
        closeDisabled={paperSaving}
        size="lg"
        title="Add paper to special issue"
        description={paperIssue ? `${paperIssue.title}. The paper is published as soon as you add it.` : undefined}
        footer={(
          <>
            <button type="button" className="button button-ghost" onClick={() => setPaperIssue(null)} disabled={paperSaving}>Cancel</button>
            <button type="submit" form="special-paper-form" className="button button-primary" disabled={paperSaving} aria-busy={paperSaving || undefined}>
              {paperSaving ? <><Spinner size="sm" /> Publishing…</> : <><Icon name="globe" size={16} /> Publish paper</>}
            </button>
          </>
        )}
      >
        <form id="special-paper-form" onSubmit={handleAddPaper} noValidate>
          {paperServerError && <Alert type="error" title="The paper wasn’t added" message={paperServerError} onClose={() => setPaperServerError('')} />}
          {textField('title', 'Paper title', { required: true })}
          {textField('authors', 'Authors', { required: true, placeholder: 'e.g. A. Sharma, R. Patil', hint: 'Separate names with commas. They are shown on the site as written.' })}
          {textField('category', 'Category', { placeholder: 'e.g. Civil Engineering' })}
          <div className="field">
            <div className="field-label"><label htmlFor="sp-abstract">Abstract<span className="optional">(optional)</span></label></div>
            <textarea id="sp-abstract" value={paperForm.abstract} onChange={(e) => setPaperField('abstract', e.target.value)} className="form-textarea" rows={5} maxLength={5000} disabled={paperSaving} />
          </div>
          {textField('keywords', 'Keywords', { placeholder: 'e.g. concrete, durability, recycling', hint: 'Separate keywords with commas.' })}
          <FilePicker
            id="sp-file"
            label="Paper PDF"
            extensions={['pdf']}
            file={paperFile}
            onChange={(f) => { setPaperFile(f); if (paperErrors.file) setPaperErrors((prev) => ({ ...prev, file: '' })); }}
            disabled={paperSaving}
          />
          {paperErrors.file && <p className="field-error"><Icon name="alert" size={15} />{paperErrors.file}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(issueToDelete)}
        tone="danger"
        title="Delete this special issue?"
        message="The special issue and all of its papers are removed from the site. This can’t be undone."
        confirmLabel="Delete special issue"
        busy={deleting}
        busyLabel="Deleting…"
        onCancel={() => setIssueToDelete(null)}
        onConfirm={handleDelete}
      >
        {issueToDelete && <div className="paper-ref"><strong>{issueToDelete.title}</strong><span>{(papersById[issueToDelete.id] || []).length} paper(s)</span></div>}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(paperToRemove)}
        tone="danger"
        title="Remove this paper?"
        message="The paper and its PDF are removed from the site. This can’t be undone."
        confirmLabel="Remove paper"
        busy={removing}
        busyLabel="Removing…"
        onCancel={() => setPaperToRemove(null)}
        onConfirm={handleRemovePaper}
      >
        {paperToRemove && <div className="paper-ref"><strong>{paperToRemove.paper.title}</strong><span>{joinAuthors(paperToRemove.paper.authors)}</span></div>}
      </ConfirmDialog>
    </section>
  );
};

export default SpecialIssues;
