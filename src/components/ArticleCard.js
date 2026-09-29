import React from 'react';
import { Link } from 'react-router-dom';

export const formatArticleDate = (value) => (value
  ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Publication date pending');

// Journal paper ID shown to readers, e.g. "IJEPA-2026-031". Back-catalogue papers carry it in
// their PDF file name; newer papers get IJEPA-<year>-<database id>.
export const paperCode = (paper) => {
  const fromFile = String(paper?.pdfUrl || '').match(/IJEPA-\d{4}-\d{3,}/i);
  if (fromFile) return fromFile[0].toUpperCase();
  const year = String(paper?.publicationDate || paper?.submissionDate || '').slice(0, 4) || new Date().getFullYear();
  return `IJEPA-${year}-${String(paper?.id ?? '').padStart(3, '0')}`;
};

// Horizontal-grid article card used on the home page and the Journal Issues page.
const ArticleCard = ({ paper }) => (
  <article className="article-card">
    <div className="article-meta-top">
      <span className="article-id">Paper ID: {paperCode(paper)}</span>
      <span className="article-tag">{paper.category || 'Research Article'}</span>
    </div>
    <h3>{paper.title}</h3>
    <p className="article-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p>
    <small>Published: {formatArticleDate(paper.publicationDate)}</small>
    <div className="article-actions">
      <Link to={`/p/${paper.id}`} className="button button-small button-light">Read Abstract</Link>
      {paper.pdfUrl && <a href={paper.pdfUrl} className="button button-small button-dark" target="_blank" rel="noreferrer">↓&nbsp; Download PDF</a>}
    </div>
  </article>
);

export default ArticleCard;
