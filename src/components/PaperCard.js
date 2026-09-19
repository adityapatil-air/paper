import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PaperCard = ({ paper, showActions = false, onAction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const getStatusText = (status) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'under_review':
        return 'Under Review';
      case 'submitted':
        return 'Submitted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <article
      className="article-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span className="article-tag">{getStatusText(paper.status)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
          style={{
            border: 0,
            background: 'none',
            cursor: 'pointer',
            padding: 2,
            color: isLiked ? '#d64550' : 'var(--muted)',
            transform: isHovered ? 'scale(1.08)' : 'none',
            transition: 'all .2s ease',
          }}
        >
          {isLiked ? (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      <h3>{paper.title}</h3>

      <p className="article-authors">Authors: {paper.authors.join(', ')}</p>
      <small>Category: {paper.category}</small>
      {paper.doi && <small>DOI: {paper.doi}</small>}

      <p style={{ color: 'var(--muted)', fontSize: 9, lineHeight: 1.7, margin: '8px 0' }}>
        {paper.abstract}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {paper.keywords.map((keyword, index) => (
          <span key={index} className="article-tag" title={`Click to search for "${keyword}"`}>
            {keyword}
          </span>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6, color: 'var(--muted)', fontSize: 8 }}>
        <span>Submitted: <time dateTime={paper.submissionDate}>{new Date(paper.submissionDate).toLocaleDateString()}</time></span>
        {paper.publicationDate && (
          <span>Published: <time dateTime={paper.publicationDate}>{new Date(paper.publicationDate).toLocaleDateString()}</time></span>
        )}
        {paper.citationCount !== undefined && <span>Citations: {paper.citationCount}</span>}
      </div>

      {(showActions || paper.status === 'published') && (
        <div className="article-actions">
          {showActions && (
            <>
              <button type="button" onClick={() => onAction('view', paper)} className="button button-small button-light">
                View Details
              </button>
              {paper.status === 'submitted' && (
                <button type="button" onClick={() => onAction('review', paper)} className="button button-small button-primary">
                  Start Review
                </button>
              )}
            </>
          )}
          {paper.status === 'published' && (
            <Link to={`/paper/${paper.id}`} className="button button-small button-dark">
              View Full Paper
            </Link>
          )}
        </div>
      )}
    </article>
  );
};

export default PaperCard;
