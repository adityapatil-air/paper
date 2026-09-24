import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { mockAPI } from '../data/mockData';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Same base URL the rest of the app uses (mockData.js); empty means same-origin /api.
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const PaperRedirect = () => {
  const { id, slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [paperId, setPaperId] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewerError, setViewerError] = useState('');

  const slugify = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        let paper = null;

        if (slug) {
          const published = await mockAPI.getPublishedPapers();
          paper = (published || []).find((p) => slugify(p?.title) === slug);
        } else {
          paper = await mockAPI.getPaperById(id);
        }

        const resolvedPaperId = paper?.id;

        if (!isMounted) return;

        setPaperId(resolvedPaperId || null);
        setNumPages(null);
        setPageNumber(1);
        setZoom(1);
        setViewerError('');
      } catch (_e) {
        if (!isMounted) return;
        setPaperId(null);
        setViewerError('Unable to load this paper.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id, slug]);

  const hasParam = Boolean(id || slug);
  const pdfSrc = paperId ? `${API_BASE_URL}/api/papers/${paperId}/download` : null;
  const downloadHref = paperId ? `${API_BASE_URL}/api/papers/${paperId}/download?download=1` : null;

  const file = useMemo(() => {
    if (!pdfSrc) return null;
    return { url: pdfSrc };
  }, [pdfSrc]);

  if (!hasParam) return <Navigate to="/" replace />;
  if (!loading && !paperId) return <Navigate to="/journal-issues" replace />;

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setPageNumber((prev) => {
      if (!prev) return 1;
      return prev > nextNumPages ? nextNumPages : prev;
    });
  };

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev + 1));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  return (
    <div className="page-body">
      <div className="journal-container">
        <div className="page-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link to="/journal-issues" style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 700 }}>
                Back to Journal Issues
              </Link>
              <span style={{ color: 'var(--muted)' }}>/</span>
              <span style={{ fontSize: 10, color: 'var(--ink)' }}>
                {loading ? 'Loading paper…' : `Paper #${paperId}`}
              </span>
            </div>

            {downloadHref && (
              <a href={downloadHref} className="button button-small button-dark">
                Download
              </a>
            )}
          </div>

          <div className="viewer-controls" style={{ color: 'var(--muted)', justifyContent: 'space-between', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={handlePrevPage} disabled={loading || pageNumber <= 1} className="button button-small button-light">
                Prev
              </button>
              <button type="button" onClick={handleNextPage} disabled={loading || (numPages ? pageNumber >= numPages : false)} className="button button-small button-light">
                Next
              </button>
              <span>{numPages ? `Page ${pageNumber} of ${numPages}` : loading ? 'Loading…' : 'Page'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={handleZoomOut} disabled={zoom <= 0.5} className="button button-small button-light">
                -
              </button>
              <button type="button" onClick={handleResetZoom} className="button button-small button-light">
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" onClick={handleZoomIn} disabled={zoom >= 2.5} className="button button-small button-light">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="page-card" style={{ padding: 0, marginTop: 16, overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-state">Loading paper... Please wait.</div>
          ) : !file ? (
            <div className="empty-state">Paper not found. The paper file link may be missing.</div>
          ) : (
            <div style={{ width: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', background: 'var(--sky)' }}>
              <div style={{ padding: '24px 0' }}>
                {viewerError ? (
                  <div className="empty-state" style={{ background: '#fff' }}>{viewerError}</div>
                ) : (
                  <Document
                    file={file}
                    loading={<div className="loading-state" style={{ background: '#fff' }}>Loading PDF…</div>}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => setViewerError(err?.message || 'Failed to load PDF.')}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={zoom}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperRedirect;
