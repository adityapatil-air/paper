import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { mockAPI } from '../data/mockData';

const JournalIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIssuePapers, setCurrentIssuePapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [isCurrentIssueExpanded, setIsCurrentIssueExpanded] = useState(true);
  const [expandedIssueId, setExpandedIssueId] = useState(null);
  const [archiveIssuePapers, setArchiveIssuePapers] = useState({});
  const [archivePapersLoadingId, setArchivePapersLoadingId] = useState(null);
  const [expandedVolumeKey, setExpandedVolumeKey] = useState(null);

  useEffect(() => {
    const loadIssues = async () => {
      try {
        const data = await mockAPI.getIssues();
        const sorted = (data || []).slice().sort((a, b) => b.year - a.year || b.issue - a.issue);
        setIssues(sorted);
      } catch (error) {
        console.error('Error loading issues:', error);
      } finally {
        setLoading(false);
      }
    };

  const formatPaperId = (paperId, year) => {
    const normalizedYear = year || 2026;
    const raw = String(paperId ?? '').trim();
    const parsed = parseInt(raw, 10);
    const normalizedSerial = Number.isNaN(parsed) ? raw : String(parsed);
    const paddedSerial = String(normalizedSerial || '').padStart(2, '0');
    return `IJEPA-${normalizedYear}-${paddedSerial}`;
  };

    loadIssues();
  }, []);

  const currentIssue = issues.find(issue => issue.isCurrent);
  const archives = issues.filter(issue => !issue.isCurrent);

  useEffect(() => {
    const loadCurrentIssuePapers = async () => {
      const issue = issues.find((i) => i.isCurrent);
      if (!issue) {
        setCurrentIssuePapers([]);
        return;
      }

      try {
        setPapersLoading(true);
        const papers = await mockAPI.getIssuePapers(issue.id);
        setCurrentIssuePapers(papers || []);
      } catch (error) {
        console.error('Error loading current issue papers:', error);
        setCurrentIssuePapers([]);
      } finally {
        setPapersLoading(false);
      }
    };

    if (issues && issues.length > 0) {
      loadCurrentIssuePapers();
    }
  }, [issues]);

  const archivesByVolume = archives.reduce((acc, issue) => {
    const volumeKey = `Volume ${issue.volume}`;
    if (!acc[volumeKey]) acc[volumeKey] = [];
    acc[volumeKey].push(issue);
    return acc;
  }, {});

  useEffect(() => {
    if (expandedVolumeKey) return;
    const firstKey = Object.keys(archivesByVolume)[0];
    if (firstKey) setExpandedVolumeKey(firstKey);
  }, [archivesByVolume, expandedVolumeKey]);

  const mapBackendPaperToIssueCard = (paper) => ({
    id: paper.id,
    title: paper.title,
    authors: paper.authors || [],
    doi: paper.doi || 'N/A',
    abstract: paper.abstract || '',
    pdfUrl: paper.pdfUrl || null,
  });

  const handleArchiveIssueClick = async (issue) => {
    if (!issue) return;
    if (expandedIssueId === issue.id) {
      setExpandedIssueId(null);
      return;
    }

    setExpandedIssueId(issue.id);
    if (archiveIssuePapers[issue.id]) return;

    try {
      setArchivePapersLoadingId(issue.id);
      const papers = await mockAPI.getIssuePapers(issue.id);
      setArchiveIssuePapers(prev => ({ ...prev, [issue.id]: papers || [] }));
    } catch (error) {
      console.error('Error loading archive papers:', error);
      setArchiveIssuePapers(prev => ({ ...prev, [issue.id]: [] }));
    } finally {
      setArchivePapersLoadingId(null);
    }
  };

  const getAuthorsText = (authors) => {
    if (Array.isArray(authors)) {
      const names = authors
        .map((a) => {
          if (typeof a === 'string') return a.trim();
          if (a && typeof a === 'object') return String(a.fullName || a.name || '').trim();
          return '';
        })
        .filter(Boolean);
      return names.length ? names.join(', ') : 'N/A';
    }

    const raw = String(authors || '').trim();
    if (!raw) return 'N/A';

    const parts = raw
      .split(/[,;\n]/g)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : 'N/A';
  };

  const PaperCard = ({ paper }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-700 mb-1">
        <span className="font-semibold text-slate-900">Paper ID:</span> {formatPaperId(paper.id)}
      </p>
      <p className="text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Title:</span>{' '}
        {paper.pdfUrl ? (
          <a
            href={paper.pdfUrl}
            download
            className="text-amber-700 hover:underline"
          >
            {paper.title}
          </a>
        ) : (
          <span className="text-slate-900">{paper.title}</span>
        )}
      </p>
      <p className="text-sm text-slate-700 mt-1">
        <span className="font-semibold text-slate-900">Authors:</span> {getAuthorsText(paper.authors)}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content Box — identical to AuthorGuidelines */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">

          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b border-slate-200">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Journal <span className="text-amber-700">Issues</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Explore current and archived issues of IJEPA featuring peer-reviewed research across engineering disciplines.
            </p>
          </div>

          {/* Intro */}
          <p className="text-slate-700 mb-8 leading-relaxed text-justify">
            The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> publishes regular issues featuring high-quality research articles, reviews, and case studies across diverse engineering domains. Our issues provide a global platform for disseminating knowledge and fostering innovation in engineering practices and applications.
          </p>

          {/* Current Issue */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Current Issue
            </h2>

            {loading ? (
              <p className="text-slate-600 text-justify">Loading current issue...</p>
            ) : currentIssue ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsCurrentIssueExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-slate-800 mb-4"
                >
                  <span className="font-semibold">Volume {currentIssue.volume}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-medium">Issue {currentIssue.issue}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-700">{currentIssue.month}, {currentIssue.year}</span>
                  <svg
                    className={`w-4 h-4 text-amber-700 transition-transform ${isCurrentIssueExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCurrentIssueExpanded && (
                  papersLoading ? (
                    <p className="text-slate-600 text-justify">Loading papers for this issue...</p>
                  ) : currentIssuePapers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentIssuePapers.map((paper) => (
                        <PaperCard key={paper.id} paper={mapBackendPaperToIssueCard(paper)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-justify">No papers have been assigned to this issue yet.</p>
                  )
                )}
              </>
            ) : (
              <p className="text-slate-600 text-justify">No current issue is available at the moment.</p>
            )}
          </section>

          {/* Archives */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Archives
            </h2>

            <p className="text-slate-700 mb-6 text-justify">
              Explore previously published volumes and issues of IJEPA. All articles are available in full text under our open-access policy.
            </p>

            {loading ? (
              <p className="text-slate-600 text-justify">Loading archives...</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(archivesByVolume).map(([volume, issuesInVolume]) => {
                  const isVolumeExpanded = expandedVolumeKey === volume;

                  return (
                    <div key={volume}>
                      <button
                        type="button"
                        onClick={() => setExpandedVolumeKey((prev) => (prev === volume ? null : volume))}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-slate-800"
                      >
                        <span className="text-lg font-bold">{volume}</span>
                        <svg
                          className={`w-5 h-5 text-amber-700 transition-transform ${isVolumeExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isVolumeExpanded && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {issuesInVolume.map((issue) => (
                            <div
                              key={issue.id}
                              className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition cursor-pointer"
                              onClick={() => handleArchiveIssueClick(issue)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-slate-900">
                                  Issue {issue.issue}, {issue.year}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                                  {expandedIssueId === issue.id ? 'Hide' : 'View'}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </span>
                              </div>

                              {expandedIssueId === issue.id && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  {archivePapersLoadingId === issue.id ? (
                                    <p className="text-sm text-slate-600">Loading papers...</p>
                                  ) : (archiveIssuePapers[issue.id] || []).length === 0 ? (
                                    <p className="text-sm text-slate-600">No papers available.</p>
                                  ) : (
                                    (archiveIssuePapers[issue.id] || []).map((paper) => (
                                      <div key={paper.id} className="border-l-4 border-amber-500 pl-3 py-1 mb-2 last:mb-0">
                                        <a
                                          href={paper.pdfUrl || '#'}
                                          download
                                          className="text-sm font-medium text-amber-800 hover:underline"
                                        >
                                          {paper.title}
                                        </a>
                                        <p className="text-xs text-slate-600 mt-1">
                                          {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                                        </p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Publication Info */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Publication Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Publication Frequency</h3>
                <p className="text-slate-700 text-justify">
                  IJEPA publishes <strong>Monthly</strong>. Special issues on emerging topics may also be announced.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Access Policy</h3>
                <p className="text-slate-700 text-justify">
                  All issues are published online and made <strong>freely accessible</strong> under our open-access policy.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <div className="text-center pt-6 border-t border-slate-200">
            <p className="text-slate-700 mb-4">
              To publish in upcoming issues, please visit our Call for Papers page.
            </p>
            <a
              href="/call-for-papers"
              className="inline-flex items-center px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Call for Papers
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};

export default JournalIssues;