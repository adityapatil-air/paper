import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './ui/Icon';

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const authorsText = (authors) => (Array.isArray(authors)
  ? authors.map((a) => (typeof a === 'string' ? a : a?.fullName || a?.name || '')).filter(Boolean).join(', ')
  : String(authors || ''));

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

export const issueLabel = (issue) => `Volume ${issue.volume}, Issue ${issue.issue}`;

// Feature card for the current issue: cover, title, description, file download and its papers.
const CurrentIssue = ({ issue, papers = [], papersLoading = false, maxPapers, showIssuesLink = false, headingLevel = 'h3', hasIssues = false }) => {
  if (!issue) {
    return (
      <div className="ci-empty">
        <Icon name="book" size={30} />
        {hasIssues ? (
          <>
            <h3>No current issue is featured right now</h3>
            <p>Browse the archive for previously released issues, or see the Call for Papers to contribute to the next one.</p>
          </>
        ) : (
          <>
            <h3>No issue has been published yet</h3>
            <p>The first issue of IJEPA will appear here as soon as it is released. Authors can submit manuscripts for upcoming issues now.</p>
          </>
        )}
        <div className="ci-actions is-center">
          {hasIssues && showIssuesLink && <Link to="/journal-issues" className="button button-light button-small">Browse all issues</Link>}
          <Link to="/callforpapers" className="button button-primary button-small">View Call for Papers</Link>
        </div>
      </div>
    );
  }

  const Heading = headingLevel;
  const visiblePapers = typeof maxPapers === 'number' ? papers.slice(0, maxPapers) : papers;
  const published = formatDate(issue.publishedAt);

  return (
    <article className="current-issue" aria-label={`Current issue: ${issue.title || issueLabel(issue)}`}>
      {issue.coverImageUrl ? (
        <img src={issue.coverImageUrl} alt={`Cover of ${issue.title || issueLabel(issue)}`} className="ci-cover" />
      ) : (
        <div className="ci-cover is-placeholder" aria-hidden="true">
          <strong>IJEPA</strong>
          <span>Volume {issue.volume}<br />Issue {issue.issue}{issue.year ? <><br />{[issue.month, issue.year].filter(Boolean).join(' ')}</> : null}</span>
        </div>
      )}

      <div className="ci-body">
        <p className="eyebrow blue">CURRENT ISSUE</p>
        <Heading>{issue.title || issueLabel(issue)}</Heading>
        <p className="ci-meta">
          <span>{issueLabel(issue)}</span>
          {(issue.month || issue.year) && <span>{[issue.month, issue.year].filter(Boolean).join(' ')}</span>}
          {published && <span>Published {published}</span>}
        </p>
        {issue.description && <p className="ci-desc">{issue.description}</p>}

        <div className="ci-actions">
          {issue.fileUrl && (
            <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="button button-primary button-small">
              <Icon name="download" size={16} /> Download / View PDF
            </a>
          )}
          {showIssuesLink && (
            <Link to="/journal-issues" className="button button-light button-small">All issues &amp; archives →</Link>
          )}
        </div>

        <div className="ci-papers">
          <h4>In this issue{papers.length ? ` (${papers.length})` : ''}</h4>
          {papersLoading ? (
            <p className="ci-meta">Loading papers…</p>
          ) : visiblePapers.length === 0 ? (
            <p className="ci-meta">No papers have been assigned to this issue yet.</p>
          ) : (
            <ul className="ci-paper-list">
              {visiblePapers.map((paper) => (
                <li key={paper.id}>
                  {paper.pdfUrl ? <Link to={`/paper/${slugify(paper.title)}`}>{paper.title}</Link> : <strong>{paper.title}</strong>}
                  <span>{authorsText(paper.authors) || '—'}</span>
                </li>
              ))}
            </ul>
          )}
          {typeof maxPapers === 'number' && papers.length > maxPapers && (
            <Link to="/journal-issues" className="section-link">View all {papers.length} papers →</Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default CurrentIssue;
