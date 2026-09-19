import React, { useState, useEffect } from 'react';
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

  const archiveVolumeKeys = Object.keys(archivesByVolume).sort((a, b) => {
    const aNum = parseInt(String(a).replace(/[^0-9]/g, ''), 10);
    const bNum = parseInt(String(b).replace(/[^0-9]/g, ''), 10);
    const aVal = Number.isNaN(aNum) ? 0 : aNum;
    const bVal = Number.isNaN(bNum) ? 0 : bNum;
    return bVal - aVal;
  });

  const activeArchiveVolumeKey = archiveVolumeKeys[0] || null;

  useEffect(() => {
    if (expandedVolumeKey) return;
    if (activeArchiveVolumeKey) setExpandedVolumeKey(activeArchiveVolumeKey);
  }, [activeArchiveVolumeKey, expandedVolumeKey]);

  const slugify = (value) => {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const formatPaperId = (paperId, year) => {
    const normalizedYear = year || 2026;
    const raw = String(paperId ?? '').trim();
    const parsed = parseInt(raw, 10);
    const normalizedSerial = Number.isNaN(parsed) ? raw : String(parsed);
    const paddedSerial = String(normalizedSerial || '').padStart(2, '0');
    return `IJEPA-${normalizedYear}-${paddedSerial}`;
  };

  const mapBackendPaperToIssueCard = (paper, issueYear) => ({
    id: paper.id,
    title: paper.title,
    authors: paper.authors || [],
    doi: paper.doi || 'N/A',
    abstract: paper.abstract || '',
    pdfUrl: paper.pdfUrl || null,
    issueYear,
  });

  const getAuthorsText = (authors) => {
    if (Array.isArray(authors)) {
      const normalized = authors
        .map((a) => {
          if (typeof a === 'string') return a.trim();
          if (a && typeof a === 'object') return String(a.fullName || a.name || '').trim();
          return '';
        })
        .filter(Boolean);

      if (normalized.length === 1) {
        const maybeCsv = normalized[0];
        const parts = maybeCsv
          .split(/[,;\n]/g)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length > 1) return parts.join(', ');
      }

      return normalized.length ? normalized.join(', ') : 'N/A';
    }

    const raw = String(authors || '').trim();
    if (!raw) return 'N/A';

    const parts = raw
      .split(/[,;\n]/g)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : 'N/A';
  };

  const PaperCard = ({ paper, serial }) => (
    <div className="paper-mini">
      <p style={{ margin: '0 0 4px' }}>Paper ID: {formatPaperId(serial, paper.issueYear)}</p>
      <p style={{ margin: '0 0 4px' }}>
        <strong>Title:</strong>{' '}
        {paper.pdfUrl ? (
          <a href={`/paper/${slugify(paper.title)}`}>{paper.title}</a>
        ) : (
          <span>{paper.title}</span>
        )}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Authors:</strong> {getAuthorsText(paper.authors)}
      </p>
    </div>
  );

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

  return (
    <div className="journal-issues-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Journal Issues</p>
          <p className="eyebrow">RESEARCH & PUBLICATION</p>
          <h1>Journal Issues</h1>
          <p>Explore current and archived issues of IJEPA featuring peer-reviewed research across engineering disciplines.</p>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> publishes regular issues featuring high-quality research articles, reviews, and case studies across diverse engineering domains. Our issues provide a global platform for disseminating knowledge and fostering innovation in engineering practices and applications.
        </p>

        <h2>Current Issue</h2>

        {loading ? (
          <p>Loading current issue...</p>
        ) : currentIssue ? (
          <>
            <button
              type="button"
              onClick={() => setIsCurrentIssueExpanded((prev) => !prev)}
              className="issue-chip"
            >
              <span>Volume {currentIssue.volume}</span>
              <span>&bull;</span>
              <span>Issue {currentIssue.issue}</span>
              <span>&bull;</span>
              <span>{currentIssue.month}, {currentIssue.year}</span>
              <svg
                className={`chevron ${isCurrentIssueExpanded ? 'open' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isCurrentIssueExpanded && (
              papersLoading ? (
                <p>Loading papers for this issue...</p>
              ) : currentIssuePapers.length > 0 ? (
                <div className="article-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 14 }}>
                  {currentIssuePapers.map((paper, idx) => (
                    <PaperCard
                      key={paper.id}
                      serial={idx + 1}
                      paper={mapBackendPaperToIssueCard(paper, currentIssue?.year)}
                    />
                  ))}
                </div>
              ) : (
                <p>No papers have been assigned to this issue yet.</p>
              )
            )}
          </>
        ) : (
          <p>No current issue is available at the moment.</p>
        )}

        <h2>Archives</h2>

        <p>
          Explore previously published volumes and issues of IJEPA. All articles are available in full text under our open-access policy.
        </p>

        {loading ? (
          <p>Loading archives...</p>
        ) : (
          <div>
            {archiveVolumeKeys.map((volume) => {
              const issuesInVolume = archivesByVolume[volume] || [];
              const isActiveVolume = volume === activeArchiveVolumeKey;
              const isVolumeExpanded = isActiveVolume || expandedVolumeKey === volume;

              return (
                <div key={volume} style={{ marginBottom: 20 }}>
                  {isActiveVolume ? (
                    <div className="volume-toggle is-active">
                      <span>{volume}</span>
                      <span>Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandedVolumeKey((prev) => (prev === volume ? null : volume))}
                      className="volume-toggle"
                    >
                      <span>{volume}</span>
                      <svg
                        className={`chevron ${isVolumeExpanded ? 'open' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {isVolumeExpanded && (
                    <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                      {issuesInVolume.map((issue) => (
                        <div
                          key={issue.id}
                          className="issue-card"
                          onClick={() => handleArchiveIssueClick(issue)}
                        >
                          <div className="issue-card-head">
                            <span><strong>Issue {issue.issue}, {issue.year}</strong></span>
                            <span>
                              {expandedIssueId === issue.id ? 'Hide' : 'View'}
                              <svg className="chevron" style={{ marginLeft: 4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </div>

                          {expandedIssueId === issue.id && (
                            <div className="issue-card-body">
                              {archivePapersLoadingId === issue.id ? (
                                <p style={{ margin: 0 }}>Loading papers...</p>
                              ) : (archiveIssuePapers[issue.id] || []).length === 0 ? (
                                <p style={{ margin: 0 }}>No papers available.</p>
                              ) : (
                                (archiveIssuePapers[issue.id] || []).map((paper, idx) => (
                                  <PaperCard
                                    key={paper.id}
                                    serial={idx + 1}
                                    paper={mapBackendPaperToIssueCard(paper, issue?.year)}
                                  />
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

        <div style={{ textAlign: 'center', marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <p>To publish in upcoming issues, please visit our Call for Papers page.</p>
          <a href="/callforpapers" className="button button-primary button-small">Call for Papers</a>
        </div>
      </div>
    </div>
  );
};

export default JournalIssues;
