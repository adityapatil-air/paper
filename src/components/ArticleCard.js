import React from 'react';
import { Link } from 'react-router-dom';

export const formatArticleDate = (value) => (value
  ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Publication date pending');

// Horizontal-grid article card used on the home page and the Journal Issues page.
const ArticleCard = ({ paper }) => (
  <article className="article-card">
    <span className="article-tag">{paper.category || 'Research Article'}</span>
    <h3>{paper.title}</h3>
    <p className="article-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p>
    <small>Published: {formatArticleDate(paper.publicationDate)}</small>
    {paper.doi && <small>DOI: {paper.doi}</small>}
    <div className="article-actions">
      <Link to={`/p/${paper.id}`} className="button button-small button-light">Read Abstract</Link>
      {paper.pdfUrl && <a href={paper.pdfUrl} className="button button-small button-dark" target="_blank" rel="noreferrer">↓&nbsp; Download PDF</a>}
    </div>
  </article>
);

export default ArticleCard;
