import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Shown for unknown URLs (and papers that do not exist) instead of silently redirecting.
const NotFound = ({ title = 'Page not found', message = 'The page you were looking for does not exist or has moved.' }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | IJEPA`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div className="page-body">
      <div className="journal-container">
        <div className="page-card" role="alert">
          <p className="eyebrow blue">Error 404</p>
          <h1 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>{title}</h1>
          <p>{message}</p>
          <div className="row-actions">
            <Link to="/" className="button button-primary button-small">Go to the home page</Link>
            <Link to="/papers" className="button button-small button-light">Browse papers</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
