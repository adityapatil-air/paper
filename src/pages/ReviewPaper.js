import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import LoadingSpinner from '../components/LoadingSpinner';

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

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev + 1));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading manuscript..." />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="page-card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ color: 'var(--navy)', fontSize: 16, margin: '0 0 10px' }}>Unable to open manuscript</h1>
          <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 18px' }}>{error || 'Paper not found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="button button-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const viewerSupported = paper.pdfUrl && paper.pdfUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="dash-page">
      <div className="journal-container" style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => navigate('/reviewer-dashboard')}
            className="icon-btn"
          >
            &larr; Back to Reviewer Dashboard
          </button>
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>Paper ID: {paper.id}</span>
        </div>

        <div className="dash-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <h1 style={{ color: 'var(--navy)', fontSize: 16, margin: '0 0 8px' }}>{paper.title}</h1>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 4px' }}>
                <strong style={{ color: 'var(--ink)' }}>Authors:</strong> {paper.authors?.join(', ') || 'N/A'}
              </p>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 4px' }}>
                <strong style={{ color: 'var(--ink)' }}>Category:</strong> {paper.category || 'N/A'}
              </p>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>
                <strong style={{ color: 'var(--ink)' }}>Submitted:</strong>{' '}
                {paper.submissionDate ? new Date(paper.submissionDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--muted)' }}>
              <p style={{ margin: '0 0 4px' }}>Confidential review copy</p>
              {user && (
                <p style={{ margin: 0 }}>Reviewer: {user.name} ({user.email})</p>
              )}
            </div>
          </div>

          {!viewerSupported && (
            <div className="badge badge-warning" style={{ display: 'block', padding: '10px 22px', fontSize: 10, borderRadius: 0 }}>
              This manuscript is not a PDF file, so inline viewing may be limited. You may need to request a PDF version from the editor.
            </div>
          )}

          <div
            style={{ position: 'relative', background: 'var(--navy)', maxHeight: '80vh', overflowY: 'auto' }}
          >
            {viewerSupported ? (
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 0' }}>
                <Document
                  file={paper.pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eaf5fd', fontSize: 11 }}>
                      <LoadingSpinner size="sm" text="Loading PDF..." />
                    </div>
                  }
                  error={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fde8e8', fontSize: 11 }}>
                      Failed to load PDF.
                    </div>
                  }
                >
                  <Page pageNumber={pageNumber} height={650} scale={zoom} />
                </Document>
                {numPages && (
                  <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: 9, color: '#eaf5fd', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        className="icon-btn button-small"
                        disabled={zoom <= 0.5}
                      >
                        -
                      </button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        className="icon-btn button-small"
                        disabled={zoom >= 2}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="icon-btn button-small"
                      >
                        Reset
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={handlePrevPage}
                        disabled={pageNumber <= 1}
                        className="icon-btn button-small"
                      >
                        Previous
                      </button>
                      <span>
                        Page {pageNumber} of {numPages}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={numPages && pageNumber >= numPages}
                        className="icon-btn button-small"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 24px' }}>
                <div style={{ maxWidth: 420, textAlign: 'center' }}>
                  <h2 style={{ color: '#fff', fontSize: 14, margin: '0 0 10px' }}>Inline view not available</h2>
                  <p style={{ fontSize: 10, color: '#eaf5fd', margin: 0 }}>
                    This manuscript is stored in a format the browser cannot preview directly. Please contact the editor to obtain a PDF version for easier inline review.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', background: '#f4f9fc', fontSize: 9, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0 }}>
              Screenshots and copying cannot be fully prevented by a web application. To discourage leaks, this view includes a visible watermark with your reviewer identity.
            </p>
            <p style={{ margin: 0, fontStyle: 'italic' }}>
              All access is logged. Do not share this content outside the review process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPaper;
