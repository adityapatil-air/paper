import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockAPI } from '../data/mockData';
import CurrentIssue from '../components/CurrentIssue';

const JournalIcon = ({ children }) => <span className="fact-icon" aria-hidden="true">{children}</span>;

const Landing = () => {
  const [papers, setPapers] = useState([]);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [issueCount, setIssueCount] = useState(0);
  const [issuePapers, setIssuePapers] = useState([]);
  const [issueLoading, setIssueLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [published, editorial] = await Promise.all([mockAPI.getPublishedPapers(), mockAPI.getEditorialBoard()]);
      setPapers(Array.isArray(published) ? published : []);
      setBoard(editorial?.success && Array.isArray(editorial.board) ? editorial.board : []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadIssue = async () => {
      try {
        const issues = await mockAPI.getIssues();
        const current = (issues || []).find((i) => i.isCurrent) || null;
        setIssueCount((issues || []).length);
        setCurrentIssue(current);
        if (current) setIssuePapers((await mockAPI.getIssuePapers(current.id)) || []);
      } catch (error) {
        console.error('Error loading current issue', error);
      } finally {
        setIssueLoading(false);
      }
    };
    loadIssue();
  }, []);

  const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Publication date pending';

  return (
    <div className="landing-page">
      <section className="journal-hero">
        <div className="journal-container hero-grid">
          <div className="hero-copy">
            <span className="hero-badge"><span className="dot-live" /> Trusted by 500+ Researchers Worldwide</span>
            <p className="eyebrow">INTERNATIONAL JOURNAL OF</p>
            <h1>Engineering Practices<br />and Applications</h1>
            <p className="hero-description">A peer-reviewed, open-access journal advancing research, innovation, and real-world applications across engineering disciplines.</p>
            <div className="hero-actions"><Link to="/submitform" className="button button-primary">Submit Manuscript <span>→</span></Link><Link to="/journal-issues" className="button button-outline">View Current Issue</Link></div>
          </div>
          <div className="hero-visual" aria-hidden="true"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-globe">◌</div><div className="visual-grid" /><span className="node node-one" /><span className="node node-two" /><span className="node node-three" /><span className="node node-four" /></div>
        </div>
      </section>

      <section className="journal-facts"><div className="journal-container facts-grid">
        <div className="fact"><JournalIcon>⚙</JournalIcon><div><strong>Peer Reviewed</strong><small>Quality research, expert evaluation</small></div></div>
        <div className="fact"><JournalIcon>♙</JournalIcon><div><strong>Open Access</strong><small>Free access to global knowledge</small></div></div>
        <div className="fact"><JournalIcon>▣</JournalIcon><div><strong>Quarterly</strong><small>Four issues published each year</small></div></div>
        <div className="fact"><JournalIcon>▤</JournalIcon><div><strong>ISSN</strong><small>ISSN: 3139-5961 (Online)</small></div></div>
        <div className="fact"><JournalIcon>↗</JournalIcon><div><strong>DOI</strong><small>Digital Object Identifier</small></div></div>
      </div></section>

      <main className="journal-container">
        <section className="content-section articles-section">
          <div className="section-heading"><div><p className="eyebrow blue">RESEARCH & PUBLICATION</p><h2>Latest Articles</h2></div><Link to="/papers" className="section-link">View All Articles →</Link></div>
          {loading ? <div className="loading-state">Loading published papers...</div> : papers.length === 0 ? <div className="empty-state">No published papers are available at this time.</div> : <div className="article-grid">{papers.slice(0, 3).map((paper) => <article className="article-card" key={paper.id}><span className="article-tag">{paper.category || 'Research Article'}</span><h3>{paper.title}</h3><p className="article-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p><small>Published: {formatDate(paper.publicationDate)}</small>{paper.doi && <small>DOI: {paper.doi}</small>}<div className="article-actions"><Link to={`/paper/${paper.id}`} className="button button-small button-light">Read Abstract</Link>{paper.pdfUrl && <a href={paper.pdfUrl} className="button button-small button-dark" target="_blank" rel="noreferrer">↓&nbsp; Download PDF</a>}</div></article>)}</div>}
        </section>

        <section className="content-section current-issue-section" aria-labelledby="home-current-issue">
          <div className="section-heading"><div><p className="eyebrow blue">LATEST RELEASE</p><h2 id="home-current-issue">Current Issue</h2></div><Link to="/journal-issues" className="section-link">View All Issues →</Link></div>
          {issueLoading ? <div className="loading-state">Loading current issue...</div> : <CurrentIssue issue={currentIssue} papers={issuePapers} maxPapers={3} showIssuesLink hasIssues={issueCount > 0} />}
        </section>

        <section className="content-section about-scope"><div className="about-copy"><p className="eyebrow blue">ABOUT THE JOURNAL</p><h2>About IJEPA</h2><p>The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is an international, peer-reviewed, open-access journal dedicated to publishing high-quality research, innovative methodologies, and practical applications in engineering, computing, information technology, and interdisciplinary technology domains.</p><Link to="/about-us" className="button button-primary button-small">Learn More&nbsp; →</Link></div><div className="scope-panel"><p className="eyebrow blue">OUR FOCUS</p><h2>Aims &amp; Scope</h2><ul><li>Civil, Mechanical, Electrical, and Electronics Engineering</li><li>Computer Science, Information Technology, and Artificial Intelligence</li><li>Industrial, Manufacturing, and Materials Engineering</li><li>Communication, Control, and Instrumentation Systems</li><li>Sustainable, Green, and Emerging Engineering Practices</li></ul><Link to="/about-us" className="button button-dark button-small">View Full Scope&nbsp; →</Link></div></section>

        {board.length > 0 && <section className="content-section board-section"><div className="section-heading"><div><p className="eyebrow blue">SCHOLARLY LEADERSHIP</p><h2>Editorial Board</h2><p>Meet the academics and professionals guiding IJEPA.</p></div><Link to="/editorial-board" className="section-link">View All Members →</Link></div><div className="board-grid">{board.slice(0, 5).map((member) => <article className="board-card" key={member.id || member.email}>{member.photo ? <img className="member-avatar member-photo" src={member.photo} alt={member.name} /> : <div className="member-avatar">{member.name?.replace(/^Dr\.\s*/i, '').split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}<strong>{member.name}</strong><span>{member.section || member.title || 'Editorial Board Member'}</span><small>{member.affiliation}</small>{member.profileUrl && <a href={member.profileUrl} target="_blank" rel="noreferrer">Profile ↗</a>}</article>)}</div></section>}
      </main>

      <section className="callout"><div className="journal-container callout-inner"><div className="callout-icon">▤</div><div><h2>Call for Papers</h2><p>We invite researchers, academics, and industry professionals to contribute to our upcoming issues.</p></div><Link to="/callforpapers" className="button button-outline">View Call for Papers&nbsp; →</Link></div></section>
      <section className="indexing-strip journal-container"><div><h2>Abstracting &amp; Indexing</h2><p>IJEPA is committed to expanding the visibility and accessibility of published research.</p></div><Link to="/indexing" className="indexing-note">View indexing information →</Link></section>
    </div>
  );
};

export default Landing;
