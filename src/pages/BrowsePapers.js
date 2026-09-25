import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { mockAPI } from '../data/mockData';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../components/ui/DashHeader';

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

  const toggleIssueOpen = (key, isOpen) => {
    setOpenIssueKeys((prev) => ({
      ...prev,
      [key]: !isOpen,
    }));
  };

  // Groups start open while searching or filtering (so matches are visible), and the
  // newest group starts open otherwise; the user's own toggles win.
  const isFiltering = Boolean(normalizedSearch) || selectedCategory !== 'all';
  const isGroupOpen = (key, index) => openIssueKeys[key] ?? (isFiltering || index === 0);

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
      <div className="page-body">
        <div className="journal-container">
          <div className="loading-state" style={{ display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner size="lg" text="Loading published papers..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-papers-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="eyebrow">RESEARCH & PUBLICATION</p>
          <h1>Browse Papers</h1>
          <p>Tell us what you are looking for and browse matching published papers. Click a title to open the paper in a PDF viewer.</p>
        </div>
      </section>

      <div className="page-body">
        <div className="journal-container">
          <div className="papers-toolbar">
            <div className="form-group">
              <label htmlFor="browse-search">What are you looking for?</label>
              <input
                id="browse-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter keywords, topic, author name, or phrase..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="browse-category">Section (Category)</label>
              <select
                id="browse-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All sections' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="results-note" role="status">
            {filteredPapers.length} published paper{filteredPapers.length === 1 ? '' : 's'}{isFiltering ? (filteredPapers.length === 1 ? ' matches your search' : ' match your search') : ''}
          </p>

          {filteredPapers.length === 0 ? (
            <div className="empty-state">No published papers found matching your search.</div>
          ) : (
            groupedByIssue().map((group, index) => {
              const isOpen = isGroupOpen(group.key, index);
              const panelId = `issue-group-${index}`;

              return (
                <div key={group.key} className="issue-group">
                  <button type="button" onClick={() => toggleIssueOpen(group.key, isOpen)} className="issue-toggle" aria-expanded={isOpen} aria-controls={panelId}>
                    <h2>{group.label} <span className="sr-only">({group.papers.length} paper{group.papers.length === 1 ? '' : 's'})</span></h2>
                    <span className={`chevron${isOpen ? ' open' : ''}`} aria-hidden="true">▾</span>
                  </button>

                  {isOpen && (
                    <div className="article-grid" id={panelId} style={{ marginTop: 14 }}>
                      {group.papers.map((paper) => (
                        <article className="article-card" key={paper.id}>
                          {paper.category && <span className="article-tag">{paper.category}</span>}
                          <h3><Link to={`/p/${paper.id}`}>{paper.title}</Link></h3>
                          <p className="article-authors">
                            Authors: {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'N/A'}
                          </p>
                          {paper.publicationDate && (
                            <small>Published: {formatDate(paper.publicationDate)}</small>
                          )}
                          <div className="article-actions">
                            <button type="button" className="button button-small button-light" onClick={() => handleOpenPaper(paper)}>
                              Read Paper
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedPaper && (
        <div className="paper-modal-overlay">
          <div className="paper-modal">
            <div className="paper-modal-header">
              <div>
                <h2>{selectedPaper.title}</h2>
                <p>
                  Authors: {Array.isArray(selectedPaper.authors) ? selectedPaper.authors.join(', ') : selectedPaper.authors || 'N/A'}
                </p>
                <p>{getIssueLabel(selectedPaper.assignedIssue)}</p>
              </div>
              <button type="button" onClick={handleClosePaper} className="paper-modal-close" aria-label="Close">
                &times;
              </button>
            </div>

            <div className="paper-modal-body">
              {selectedPaper.pdfUrl && selectedPaper.pdfUrl.toLowerCase().endsWith('.pdf') ? (
                <>
                  <Document
                    file={selectedPaper.pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => setPdfError('Failed to load PDF.')}
                    loading={<LoadingSpinner size="sm" text="Loading PDF..." />}
                    error={<div style={{ color: '#ffd9d9', fontSize: 13 }}>Failed to load PDF.</div>}
                  >
                    <Page pageNumber={pageNumber} height={650} scale={zoom} />
                  </Document>

                  {pdfError && (
                    <div style={{ color: '#ffd9d9', fontSize: 13, marginTop: 10 }}>{pdfError}</div>
                  )}

                  {numPages && (
                    <div className="viewer-controls" style={{ color: '#dbeefb' }}>
                      <button type="button" onClick={handleZoomOut} className="button button-small button-outline" disabled={zoom <= 0.5}>-</button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button type="button" onClick={handleZoomIn} className="button button-small button-outline" disabled={zoom >= 2}>+</button>
                      <button type="button" onClick={handleResetZoom} className="button button-small button-outline">Reset</button>
                      <button type="button" onClick={handlePrevPage} disabled={pageNumber <= 1} className="button button-small button-outline">Previous</button>
                      <span>Page {pageNumber} of {numPages}</span>
                      <button type="button" onClick={handleNextPage} disabled={numPages && pageNumber >= numPages} className="button button-small button-outline">Next</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="pdf-unavailable">
                  <h2>PDF not available</h2>
                  <p>This paper does not have a PDF file available for inline viewing.</p>
                </div>
              )}
            </div>

            <div className="paper-modal-footer">
              <button type="button" onClick={handleClosePaper} className="button button-small button-dark">
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
