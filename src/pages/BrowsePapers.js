import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { mockAPI } from '../data/mockData';
import LoadingSpinner from '../components/LoadingSpinner';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BrowsePapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pdfError, setPdfError] = useState('');
  const [openIssueKeys, setOpenIssueKeys] = useState({});

  useEffect(() => {
    const loadPublishedPapers = async () => {
      try {
        setLoading(true);
        const [publishedPapers, assignments] = await Promise.all([
          mockAPI.getPublishedPapers(),
          mockAPI.getIssueAssignments(),
        ]);

        const assignmentsByPaperId = {};
        (assignments || []).forEach((assignment) => {
          if (assignment && assignment.paperId && assignment.issue) {
            assignmentsByPaperId[assignment.paperId] = assignment.issue;
          }
        });

        const withIssues = (publishedPapers || []).map((paper) => ({
          ...paper,
          assignedIssue: paper.assignedIssue || assignmentsByPaperId[paper.id] || null,
        }));

        setPapers(withIssues);
      } catch (error) {
        console.error('Error loading published papers for browse page', error);
        setPapers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPublishedPapers();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPapers = (papers || []).filter((paper) => {
    if (!paper) return false;

    if (selectedCategory !== 'all' && paper.category !== selectedCategory) {
      return false;
    }

    if (!normalizedSearch) return true;

    const title = (paper.title || '').toLowerCase();
    const abstract = (paper.abstract || '').toLowerCase();
    const keywordsText = Array.isArray(paper.keywords)
      ? paper.keywords.join(' ').toLowerCase()
      : String(paper.keywords || '').toLowerCase();
    const authorsText = Array.isArray(paper.authors)
      ? paper.authors.join(' ').toLowerCase()
      : String(paper.authors || '').toLowerCase();

    return (
      title.includes(normalizedSearch) ||
      abstract.includes(normalizedSearch) ||
      keywordsText.includes(normalizedSearch) ||
      authorsText.includes(normalizedSearch)
    );
  });

  const categories = ['all', ...new Set((papers || []).map((paper) => paper.category).filter(Boolean))];

  // Group filtered papers by issue so users can browse issue-wise
  const groupedByIssue = () => {
    const groupsMap = new Map();

    (filteredPapers || []).forEach((paper) => {
      const issue = paper.assignedIssue || null;

      // Build a stable key and label for the issue section
      const volume = issue?.volume ?? '';
      const issueNo = issue?.issue ?? '';
      const year = issue?.year ?? '';
      const month = issue?.month ?? '';

      const keyParts = [
        volume !== '' ? `v${volume}` : 'v_',
        issueNo !== '' ? `i${issueNo}` : 'i_',
        year !== '' ? `y${year}` : 'y_',
        month || '_',
      ];
      const key = keyParts.join('|');

      const label = getIssueLabel(issue);

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
          issue,
          papers: [],
        });
      }

      groupsMap.get(key).papers.push(paper);
    });

    // Convert to array and sort: assigned issues first (by year desc, volume desc, issue desc), then unassigned
    const groups = Array.from(groupsMap.values());

    groups.sort((a, b) => {
      const ia = a.issue;
      const ib = b.issue;

      // Unassigned issues go last
      if (!ia && !ib) return 0;
      if (!ia) return 1;
      if (!ib) return -1;

      const yearA = ia.year || 0;
      const yearB = ib.year || 0;
      if (yearA !== yearB) return yearB - yearA;

      const volA = ia.volume || 0;
      const volB = ib.volume || 0;
      if (volA !== volB) return volB - volA;

      const issueA = ia.issue || 0;
      const issueB = ib.issue || 0;
      return issueB - issueA;
    });

    return groups;
  };

  const toggleIssueOpen = (key) => {
    setOpenIssueKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenPaper = (paper) => {
    setSelectedPaper(paper);
    setPageNumber(1);
    setZoom(1);
    setNumPages(null);
    setPdfError('');
  };

  const handleClosePaper = () => {
    setSelectedPaper(null);
    setNumPages(null);
    setPageNumber(1);
    setZoom(1);
    setPdfError('');
  };

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

  const getIssueLabel = (issue) => {
    if (!issue) return 'Issue: Not assigned';

    const parts = [];
    if (issue.volume) {
      parts.push(`Vol. ${issue.volume}`);
    }
    if (issue.issue) {
      parts.push(`Issue ${issue.issue}`);
    }
    if (issue.month || issue.year) {
      const monthYear = `${issue.month ? `${issue.month} ` : ''}${issue.year || ''}`.trim();
      if (monthYear) {
        parts.push(`(${monthYear})`);
      }
    }

    if (parts.length === 0) {
      return 'Issue: Not assigned';
    }

    return parts.join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading published papers..." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Research Library</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Tell us what you are looking for and browse matching published papers. Click a title to open the paper in a PDF viewer.
          </p>
        </header>

        <section className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">What are you looking for?</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter keywords, topic, author name, or phrase..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="w-full md:w-60">
              <label className="block text-sm font-medium text-slate-700 mb-1">Section (Category)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All sections' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
          {filteredPapers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No published papers found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {groupedByIssue().map((group) => {
                const isOpen = openIssueKeys[group.key] === true;

                return (
                  <div key={group.key} className="px-4 sm:px-6 py-4">
                    <button
                      type="button"
                      onClick={() => toggleIssueOpen(group.key)}
                      className="w-full flex items-center justify-between gap-2 mb-2 text-left"
                    >
                      <h2 className="text-sm font-semibold text-slate-800">
                        {group.label}
                      </h2>
                      <span className="text-slate-400">
                        <svg
                          className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="space-y-2 mt-1">
                        {group.papers.map((paper) => (
                          <li
                            key={paper.id}
                            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg hover:bg-slate-50 px-2 py-2"
                          >
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenPaper(paper)}
                                className="text-left text-indigo-700 hover:text-indigo-900 font-semibold leading-snug hover:underline"
                              >
                                {paper.title}
                              </button>
                              <div className="mt-1 text-xs text-slate-600">
                                Authors: {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'N/A'}
                              </div>
                            </div>

                            <div className="text-xs text-slate-500 space-y-1 text-left sm:text-right">
                              {paper.category && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  {paper.category}
                                </div>
                              )}
                              {paper.publicationDate && (
                                <div className="text-[11px]">
                                  Published:{' '}
                                  {new Date(paper.publicationDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedPaper && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug line-clamp-2">
                  {selectedPaper.title}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Authors: {Array.isArray(selectedPaper.authors) ? selectedPaper.authors.join(', ') : selectedPaper.authors || 'N/A'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getIssueLabel(selectedPaper.assignedIssue)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePaper}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 bg-slate-900/95" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {selectedPaper.pdfUrl && selectedPaper.pdfUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center justify-start py-6">
                  <Document
                    file={selectedPaper.pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => setPdfError('Failed to load PDF.')}
                    loading={
                      <div className="flex items-center justify-center text-slate-100 text-sm">
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

                  {pdfError && (
                    <div className="mt-3 text-xs text-red-200">{pdfError}</div>
                  )}

                  {numPages && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-100 justify-center">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="px-2 py-1 rounded bg-slate-800 disabled:opacity-50"
                          disabled={zoom <= 0.5}
                        >
                          -
                        </button>
                        <span>{Math.round(zoom * 100)}%</span>
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="px-2 py-1 rounded bg-slate-800 disabled:opacity-50"
                          disabled={zoom >= 2}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="px-3 py-1 rounded bg-slate-800/70 hover:bg-slate-800"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handlePrevPage}
                          disabled={pageNumber <= 1}
                          className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
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
                          className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[60vh] px-6 py-10">
                  <div className="max-w-md text-center">
                    <h2 className="text-lg font-semibold text-white mb-3">PDF not available</h2>
                    <p className="text-sm text-slate-200">
                      This paper does not have a PDF file available for inline viewing.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={handleClosePaper}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePapers;
