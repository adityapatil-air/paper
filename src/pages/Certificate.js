import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import logo from '../assets/logo.png';

const longDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const issueText = (issue) => {
  if (!issue) return '';
  const when = [issue.month, issue.year].filter(Boolean).join(' ');
  return `Volume ${issue.volume}, Issue ${issue.issue}${when ? ` (${when})` : ''}`;
};

const dashboardFor = (role) => (role === 'reviewer' ? '/reviewer-dashboard' : role === 'admin' ? '/admin-dashboard' : '/author-dashboard');

// Printable certificate (A4 landscape). "Download PDF" uses the browser's Save as PDF.
const Certificate = () => {
  const { type, paperId } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', cert: null });

  useEffect(() => {
    let active = true;
    mockAPI.getCertificate(type, paperId).then((result) => {
      if (!active) return;
      setState(result.success ? { loading: false, error: '', cert: result.certificate } : { loading: false, error: result.error, cert: null });
    });
    return () => { active = false; };
  }, [type, paperId]);

  const { loading, error, cert } = state;
  const backTo = dashboardFor(user?.role);

  if (loading) {
    return <div className="cert-page"><div className="cert-status"><Spinner size="sm" label="Preparing your certificate" /></div></div>;
  }

  if (error || !cert) {
    return (
      <div className="cert-page">
        <div className="cert-status">
          <Icon name="alert" size={28} />
          <h1>Certificate not available</h1>
          <p>{error || 'This certificate could not be found.'}</p>
          <Link to={backTo} className="button button-primary button-small">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const isReview = cert.type === 'review';
  const where = issueText(cert.issue);
  const issuedOn = longDate(isReview ? (cert.publicationDate || cert.reviewDate) : cert.publicationDate);

  return (
    <div className="cert-page">
      <div className="cert-toolbar no-print">
        <Link to={backTo} className="back-link"><Icon name="arrowLeft" size={16} /> Back to dashboard</Link>
        <button type="button" className="button button-primary button-small" onClick={() => window.print()}>
          <Icon name="download" size={16} /> Download PDF
        </button>
      </div>
      <p className="cert-print-tip no-print">In the print window, choose <strong>Save as PDF</strong>, set the layout to <strong>Landscape</strong> and turn on <strong>Background graphics</strong>.</p>

      <article className="certificate" aria-label={isReview ? 'Certificate of reviewing' : 'Certificate of publication'}>
        <div className="cert-frame">
          <span className="cert-corner is-tl" aria-hidden="true" />
          <span className="cert-corner is-tr" aria-hidden="true" />
          <span className="cert-corner is-bl" aria-hidden="true" />
          <span className="cert-corner is-br" aria-hidden="true" />

          <header className="cert-head">
            <img src={logo} alt="" className="cert-logo" />
            <p className="cert-journal">International Journal of Engineering Practices and Applications</p>
            <p className="cert-issn">IJEPA · ISSN 3139-5961 (Online) · Peer-reviewed · Open access</p>
          </header>

          <div className="cert-title">
            <span className="cert-rule" aria-hidden="true" />
            <h1>{isReview ? 'Certificate of Reviewing' : 'Certificate of Publication'}</h1>
            <span className="cert-rule" aria-hidden="true" />
          </div>

          <p className="cert-lead">This is to certify that</p>
          <p className="cert-name">{cert.recipientName}</p>
          {cert.recipientAffiliation && <p className="cert-affiliation">{cert.recipientAffiliation}</p>}

          <p className="cert-body">
            {isReview
              ? 'has served as a peer reviewer for the manuscript entitled'
              : 'has authored the research paper entitled'}
          </p>
          <p className="cert-paper">“{cert.paperTitle}”</p>
          {!isReview && Array.isArray(cert.authors) && cert.authors.length > 1 && (
            <p className="cert-authors">Authors: {cert.authors.join(', ')}</p>
          )}
          <p className="cert-body">
            {isReview
              ? <>published in IJEPA{where ? `, ${where}` : ''}. We gratefully acknowledge this valuable contribution to the quality and integrity of the peer-review process.</>
              : <>published in IJEPA{where ? `, ${where}` : ''}{cert.publicationDate ? ` on ${longDate(cert.publicationDate)}` : ''}, after double-blind peer review.</>}
          </p>
          {!isReview && cert.doi && <p className="cert-doi">DOI: {cert.doi}</p>}

          <footer className="cert-foot">
            <div className="cert-meta">
              <span>Date of issue</span>
              <strong>{issuedOn}</strong>
            </div>
            <svg className="cert-seal" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <path id="seal-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
              </defs>
              <circle cx="60" cy="60" r="57" className="seal-outer" />
              <circle cx="60" cy="60" r="33" className="seal-inner" />
              <text className="seal-ring-text"><textPath href="#seal-circle" startOffset="0">PEER REVIEWED · OPEN ACCESS · IJEPA ·</textPath></text>
              <text x="60" y="58" textAnchor="middle" className="seal-core">IJEPA</text>
              <text x="60" y="74" textAnchor="middle" className="seal-year">{String(cert.publicationDate || '').slice(0, 4)}</text>
            </svg>
            <div className="cert-sign">
              <span className="cert-sign-line" aria-hidden="true" />
              <strong>Editor-in-Chief</strong>
              <span>IJEPA</span>
            </div>
          </footer>
          <p className="cert-number">Certificate No. {cert.number}</p>
        </div>
      </article>
    </div>
  );
};

export default Certificate;
