import React, { useState, useEffect } from 'react';
import { mockAPI } from '../data/mockData';
import CurrentIssue from '../components/CurrentIssue';

const JournalIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIssuePapers, setCurrentIssuePapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
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

  const formatPaperId = (paper, serial, year) => {
    if (paper && paper.doi && paper.doi.includes('IJEPA-')) {
      const match = paper.doi.match(/IJEPA-\d+-\d+/);
      if (match) return match[0];
    }
    const normalizedYear = year || 2026;
    const raw = String(serial ?? '').trim();
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
      <p className="paper-mini-line">Paper ID: {formatPaperId(paper, serial, paper.issueYear)}</p>
      <p className="paper-mini-line">
        <strong>Title:</strong>{' '}
        {paper.pdfUrl ? (
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">{paper.title}</a>
        ) : (
          <span>{paper.title}</span>
        )}
      </p>
      <p className="flush">
        <strong>Authors:</strong> {getAuthorsText(paper.authors)}
      </p>
      {paper.pdfUrl && (
        <p className="flush" style={{ marginTop: 4 }}>
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="archive-file-link">
            ↓ Download PDF
          </a>
        </p>
      )}
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
          <div className="loading-state">Loading current issue…</div>
        ) : (
          <CurrentIssue issue={currentIssue} papers={currentIssuePapers} papersLoading={papersLoading} hasIssues={issues.length > 0} />
        )}

        <h2>Archives</h2>

        <p>
          Explore previously published volumes and issues of IJEPA. All articles are available in full text under our open-access policy.
        </p>

        {loading ? (
          <div className="loading-state">Loading archives…</div>
        ) : archiveVolumeKeys.length === 0 ? (
          <div className="empty-state">No archived issues yet. Earlier issues will be listed here once a newer issue becomes current.</div>
        ) : (
          <div>
            {archiveVolumeKeys.map((volume) => {
              const issuesInVolume = archivesByVolume[volume] || [];
              const isActiveVolume = volume === activeArchiveVolumeKey;
              const isVolumeExpanded = isActiveVolume || expandedVolumeKey === volume;

              return (
                <div key={volume} className="volume-block">
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
                    <div className="archive-issue-grid">
                      {issuesInVolume.map((issue) => (
                        <div key={issue.id} className="issue-card">
                          <button
                            type="button"
                            className="issue-card-head issue-card-toggle"
                            onClick={() => handleArchiveIssueClick(issue)}
                            aria-expanded={expandedIssueId === issue.id}
                          >
                            <span>
                              <strong>Issue {issue.issue}, {[issue.month, issue.year].filter(Boolean).join(' ')}</strong>
                              {issue.title && <span className="archive-issue-title">{issue.title}</span>}
                            </span>
                            <span>
                              {expandedIssueId === issue.id ? 'Hide' : 'View'}
                              <svg className="chevron chevron-inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </button>

                          {expandedIssueId === issue.id && (
                            <div className="issue-card-body">
                              {issue.description && <p className="ci-desc">{issue.description}</p>}
                              {issue.fileUrl && (
                                <a href={issue.fileUrl} target="_blank" rel="noopener noreferrer" className="archive-file-link" onClick={(e) => e.stopPropagation()}>
                                  ↓ Download / View issue PDF
                                </a>
                              )}
                              {archivePapersLoadingId === issue.id ? (
                                <p className="flush">Loading papers…</p>
                              ) : (archiveIssuePapers[issue.id] || []).length === 0 ? (
                                <p className="flush">No papers available.</p>
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

        <div className="issues-cta">
          <p>To publish in upcoming issues, please visit our Call for Papers page.</p>
          <a href="/callforpapers" className="button button-primary button-small">Call for Papers</a>
        </div>
      </div>
    </div>
  );
};

export default JournalIssues;
