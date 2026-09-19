import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';

const PaperViewer = () => {
  const { id } = useParams();

  if (!id) return <Navigate to="/" replace />;

  const pdfSrc = `/api/papers/${id}/download`;
  const downloadHref = `/api/papers/${id}/download?download=1`;

  return (
    <div className="page-body">
      <div className="journal-container">
        <div className="page-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/journal-issues" style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 700 }}>
              Back to Journal Issues
            </Link>
            <span style={{ color: 'var(--muted)' }}>/</span>
            <span style={{ fontSize: 10, color: 'var(--ink)' }}>Paper #{id}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href={pdfSrc} target="_blank" rel="noreferrer" className="button button-small button-light">
              Open in new tab
            </a>
            <a href={downloadHref} className="button button-small button-dark">
              Download
            </a>
          </div>
        </div>

        <div className="page-card" style={{ padding: 0, overflow: 'hidden' }}>
          <iframe title={`paper-${id}`} src={pdfSrc} style={{ width: '100%', height: '75vh', border: 0, display: 'block' }} />
        </div>
      </div>
    </div>
  );
};

export default PaperViewer;
