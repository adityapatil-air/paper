import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { mockAPI } from '../data/mockData';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const pdfSrc = paperId ? `/api/papers/${paperId}/download` : null;
  const downloadHref = paperId ? `/api/papers/${paperId}/download?download=1` : null;

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/journal-issues" className="text-sm text-amber-700 hover:underline">
                Back to Journal Issues
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-sm text-slate-700">
                {loading ? 'Loading paper…' : `Paper #${paperId}`}
              </span>
            </div>

            {downloadHref && (
              <a
                href={downloadHref}
                className="px-3 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white rounded-lg"
              >
                Download
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={loading || pageNumber <= 1}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={loading || (numPages ? pageNumber >= numPages : false)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
              <span className="text-sm text-slate-600">
                {numPages ? `Page ${pageNumber} of ${numPages}` : loading ? 'Loading…' : 'Page'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6">
              <p className="text-slate-800 font-medium">Loading paper...</p>
              <p className="text-slate-600 text-sm mt-1">Please wait.</p>
            </div>
          ) : !file ? (
            <div className="p-6">
              <p className="text-slate-800 font-medium">Paper not found.</p>
              <p className="text-slate-600 text-sm mt-1">The paper file link may be missing.</p>
            </div>
          ) : (
            <div className="w-full h-full overflow-auto flex justify-center bg-slate-100">
              <div className="py-6">
                {viewerError ? (
                  <div className="p-6 bg-white border border-slate-200 rounded-xl">
                    <p className="text-slate-800 font-medium">Unable to render PDF</p>
                    <p className="text-slate-600 text-sm mt-1">{viewerError}</p>
                  </div>
                ) : (
                  <Document
                    file={file}
                    loading={
                      <div className="p-6 bg-white border border-slate-200 rounded-xl">
                        <p className="text-slate-800 font-medium">Loading PDF…</p>
                      </div>
                    }
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
