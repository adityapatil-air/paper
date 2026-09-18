import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';

const PaperViewer = () => {
  const { id } = useParams();

  if (!id) return <Navigate to="/" replace />;

  const pdfSrc = `/api/papers/${id}/download`;
  const downloadHref = `/api/papers/${id}/download?download=1`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/journal-issues" className="text-sm text-amber-700 hover:underline">
              Back to Journal Issues
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-sm text-slate-700">Paper #{id}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfSrc}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Open in new tab
            </a>
            <a
              href={downloadHref}
              className="px-3 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white rounded-lg"
            >
              Download
            </a>
          </div>
        </div>

        <div className="mt-4 flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <iframe title={`paper-${id}`} src={pdfSrc} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default PaperViewer;
