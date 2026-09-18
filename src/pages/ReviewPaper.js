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
      <div className="min-h-full flex items-center justify-center bg-academic-50">
        <LoadingSpinner size="lg" text="Loading manuscript..." />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-full bg-academic-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-academic-900 mb-3">Unable to open manuscript</h1>
          <p className="text-academic-600 mb-6">{error || 'Paper not found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const viewerSupported = paper.pdfUrl && paper.pdfUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-full bg-academic-50 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/reviewer-dashboard')}
            className="inline-flex items-center text-sm text-academic-600 hover:text-academic-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reviewer Dashboard
          </button>
          <span className="text-xs text-academic-500">Paper ID: {paper.id}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-academic-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-academic-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-academic-900 mb-2 leading-snug">{paper.title}</h1>
              <p className="text-sm text-academic-600 mb-1">
                <span className="font-medium">Authors:</span> {paper.authors?.join(', ') || 'N/A'}
              </p>
              <p className="text-sm text-academic-600 mb-1">
                <span className="font-medium">Category:</span> {paper.category || 'N/A'}
              </p>
              <p className="text-sm text-academic-600">
                <span className="font-medium">Submitted:</span>{' '}
                {paper.submissionDate ? new Date(paper.submissionDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="text-right text-xs text-academic-500">
              <p className="mb-1">Confidential review copy</p>
              {user && (
                <p>Reviewer: {user.name} ({user.email})</p>
              )}
            </div>
          </div>

          {!viewerSupported && (
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
              This manuscript is not a PDF file, so inline viewing may be limited. You may need to request a PDF version from the editor.
            </div>
          )}

          <div
            className="relative bg-academic-900/95"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
          >
            {viewerSupported ? (
              <div className="relative z-10 flex flex-col items-center justify-start py-6">
                <Document
                  file={paper.pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center text-academic-100 text-sm">
                      <LoadingSpinner size="sm" text="Loading PDF..." />
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center text-red-200 text-sm">
                      Failed to load PDF.
                    </div>
                  }
                >
                  <Page pageNumber={pageNumber} height={650} scale={zoom} />
                </Document>
                {numPages && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-academic-100 justify-center">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        className="px-2 py-1 rounded bg-academic-800 disabled:opacity-50"
                        disabled={zoom <= 0.5}
                      >
                        -
                      </button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        className="px-2 py-1 rounded bg-academic-800 disabled:opacity-50"
                        disabled={zoom >= 2}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="px-3 py-1 rounded bg-academic-800/70 hover:bg-academic-800"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePrevPage}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 rounded bg-academic-800 disabled:opacity-50"
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
                        className="px-3 py-1 rounded bg-academic-800 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[70vh] px-6 py-10">
                <div className="max-w-md text-center">
                  <h2 className="text-lg font-semibold text-white mb-3">Inline view not available</h2>
                  <p className="text-sm text-academic-200 mb-4">
                    This manuscript is stored in a format the browser cannot preview directly. Please contact the editor to obtain a PDF version for easier inline review.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-academic-200 bg-academic-50 text-[11px] text-academic-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p>
              Screenshots and copying cannot be fully prevented by a web application. To discourage leaks, this view includes a visible watermark with your reviewer identity.
            </p>
            <p className="italic">
              All access is logged. Do not share this content outside the review process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPaper;
