import React from 'react';
import { Link } from 'react-router-dom';

export const formatArticleDate = (value) => (value
  ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Publication date pending');

// Journal paper ID, e.g. "IJEPA-2026-031". The API sends it (backend/src/paperCode.js); the fallback
// repeats that rule: back-catalogue papers carry it in their PDF file name, newer papers get
// IJEPA-<submission year>-<database id>.
export const paperCode = (paper) => {
  if (paper?.paperCode) return paper.paperCode;
  const fromFile = String(paper?.pdfUrl || '').match(/IJEPA-\d{4}-\d{3,}/i);
  if (fromFile) return fromFile[0].toUpperCase();
  const year = String(paper?.submissionDate || paper?.publicationDate || '').slice(0, 4) || new Date().getFullYear();
  return `IJEPA-${year}-${String(paper?.id ?? '').padStart(3, '0')}`;
};

// Public address of a published paper, e.g. /article/volume-1/issue-7/IJEPA-2026-034.
export const articleUrl = (paper) => paper?.articlePath || `/article/${paperCode(paper)}`;

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
      <Link to={articleUrl(paper)} className="button button-small button-light">Read Abstract</Link>
      {paper.pdfUrl && <a href={paper.pdfUrl} className="button button-small button-dark" target="_blank" rel="noreferrer">↓&nbsp; Download PDF</a>}
    </div>
  </article>
);

export default ArticleCard;
