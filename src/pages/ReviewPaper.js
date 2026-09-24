import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { Skeleton, SkeletonText } from '../components/ui/Skeleton';
import { formatDate, joinAuthors } from '../components/ui/DashHeader';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ReviewPaper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);

  const backPath = user?.role === 'admin' ? '/admin-dashboard' : '/reviewer-dashboard';

  useEffect(() => {
    const loadPaper = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await mockAPI.getPaperById(id);
        if (!data) {
          setError('Paper not found.');
        } else {
          setPaper(data);
        }
      } catch (e) {
        console.error('Failed to load paper', e);
        setError('Failed to load paper. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPaper();
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev + 1));
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  if (loading) {
    return (
      <div className="dash-page" aria-busy="true">
        <div className="journal-container">
          <span className="sr-only" role="status">Loading manuscript…</span>
          <div className="viewer-shell" aria-hidden="true">
            <div className="viewer-head">
              <div className="skeleton-stack flex-1">
                <Skeleton width="70%" height={26} />
                <SkeletonText lines={2} />
              </div>
            </div>
            <div className="viewer-stage"><Skeleton width="min(620px, 90%)" height={560} radius={4} /></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="dash-page">
        <div className="journal-container">
          <EmptyState
            variant="search"
            title="Unable to open manuscript"
            action={(
              <>
                <button type="button" onClick={() => navigate(-1)} className="button button-ghost">
                  <Icon name="arrowLeft" size={16} /> Go back
                </button>
                <Link to={backPath} className="button button-primary">Go to dashboard</Link>
              </>
            )}
          >
            {error || 'Paper not found.'}
          </EmptyState>
        </div>
      </div>
    );
  }

  const viewerSupported = paper.pdfUrl && paper.pdfUrl.toLowerCase().endsWith('.pdf');
  const watermark = user ? `${user.name} · ${user.email}` : 'Confidential review copy';

  return (
    <div className="dash-page">
      <div className="journal-container">
        <Link to={backPath} className="back-link">
          <Icon name="arrowLeft" size={16} /> Back to {user?.role === 'admin' ? 'admin' : 'reviewer'} dashboard
        </Link>

        <article className="viewer-shell" aria-labelledby="manuscript-title">
          <header className="viewer-head">
            <div>
              <p className="dash-role"><span className="dash-role-dot" aria-hidden="true" />Manuscript · Paper ID {paper.id}</p>
              <h1 id="manuscript-title">{paper.title}</h1>
              <dl className="meta-list">
                <div className="is-wide"><dt>Authors</dt><dd>{joinAuthors(paper.authors) || 'N/A'}</dd></div>
                <div><dt>Category</dt><dd>{paper.category || 'N/A'}</dd></div>
                <div><dt>Submitted</dt><dd>{paper.submissionDate ? formatDate(paper.submissionDate) : 'N/A'}</dd></div>
              </dl>
            </div>
            <div className="viewer-confidential">
              <Icon name="shield" size={18} />
              <div>
                <strong>Confidential review copy</strong>
                {user && <span>Reviewer: {user.name} ({user.email})</span>}
              </div>
            </div>
          </header>

          {!viewerSupported && (
            <div className="alert alert-warning viewer-alert" role="status">
              <span className="alert-icon" aria-hidden="true"><Icon name="alert" size={20} /></span>
              <div className="alert-copy">
                <p>This manuscript is not a PDF file, so inline viewing may be limited. You may need to request a PDF version from the editor.</p>
              </div>
            </div>
          )}

          {viewerSupported && numPages && (
            <div className="viewer-toolbar" role="toolbar" aria-label="Document controls">
              <div className="tool-group">
                <button type="button" onClick={handlePrevPage} disabled={pageNumber <= 1} className="icon-btn is-square" aria-label="Previous page">
                  <Icon name="arrowLeft" size={16} />
                </button>
                <span className="readout" aria-live="polite">Page {pageNumber} of {numPages}</span>
                <button type="button" onClick={handleNextPage} disabled={numPages && pageNumber >= numPages} className="icon-btn is-square" aria-label="Next page">
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>
              <div className="tool-group">
                <button type="button" onClick={handleZoomOut} className="icon-btn is-square" disabled={zoom <= 0.5} aria-label="Zoom out">
                  <Icon name="zoomOut" size={16} />
                </button>
                <span className="readout" aria-live="polite">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={handleZoomIn} className="icon-btn is-square" disabled={zoom >= 2} aria-label="Zoom in">
                  <Icon name="zoomIn" size={16} />
                </button>
                <button type="button" onClick={handleResetZoom} className="icon-btn" disabled={zoom === 1}>Reset</button>
              </div>
            </div>
          )}

          <div className="viewer-stage">
            {viewerSupported ? (
              <Document
                file={paper.pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="viewer-message"><div><Spinner size="sm" /><p>Loading PDF…</p></div></div>}
                error={(
                  <div className="viewer-message">
                    <div>
                      <h2>Failed to load PDF</h2>
                      <p>The file could not be displayed. Try again later or contact the editor.</p>
                    </div>
                  </div>
                )}
              >
                <div className="viewer-page">
                  <Page pageNumber={pageNumber} height={650} scale={zoom} />
                  <div className="viewer-watermark" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, i) => <span key={i}>{watermark}</span>)}
                  </div>
                </div>
              </Document>
            ) : (
              <div className="viewer-message">
                <div>
                  <h2>Inline view not available</h2>
                  <p>This manuscript is stored in a format the browser cannot preview directly. Please contact the editor to obtain a PDF version for easier inline review.</p>
                </div>
              </div>
            )}
          </div>

          <footer className="viewer-foot">
            <p>Screenshots and copying cannot be fully prevented by a web application. To discourage leaks, this view includes a visible watermark with your reviewer identity.</p>
            <p>Do not share this content outside the review process.</p>
          </footer>
        </article>
      </div>
    </div>
  );
};

export default ReviewPaper;
