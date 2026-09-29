import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockAPI } from '../data/mockData';
import Icon from '../components/ui/Icon';
import Spinner from '../components/ui/Spinner';
import logo from '../assets/logo.png';
import signature from '../assets/eic-signature.png';

// The certificate is laid out at the exact A4-landscape size (297 x 210 mm = 1123 x 794 CSS px)
// and scaled down to fit the screen, so the saved PDF is one page and matches what is shown.
const SHEET_W = 1123;
const SHEET_H = 794;

const EDITOR_IN_CHIEF = { name: 'Dr. Navnath D. Kale', role: 'Editor-in-Chief, IJEPA' };

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

const Certificate = () => {
  const { type, paperId } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', cert: null });
  const [scale, setScale] = useState(1);
  const frameRef = useRef(null);

  useEffect(() => {
    let active = true;
    mockAPI.getCertificate(type, paperId).then((result) => {
      if (!active) return;
      setState(result.success ? { loading: false, error: '', cert: result.certificate } : { loading: false, error: result.error, cert: null });
    });
    return () => { active = false; };
  }, [type, paperId]);

  // Fit the fixed-size sheet to the available width.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, el.clientWidth / SHEET_W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.cert]);

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
  const issuedOn = longDate(cert.publicationDate || cert.reviewDate);
  const kind = isReview ? 'Reviewing' : 'Publication';

  return (
    <div className="cert-page">
      <div className="cert-toolbar no-print">
        <Link to={backTo} className="back-link"><Icon name="arrowLeft" size={16} /> Back to dashboard</Link>
        <button type="button" className="button button-primary button-small" onClick={() => window.print()}>
          <Icon name="download" size={16} /> Download PDF
        </button>
      </div>
      <p className="cert-print-tip no-print">In the print window choose <strong>Save as PDF</strong>. The certificate is set to one A4 landscape page; if colours look faded, turn on <strong>Background graphics</strong>.</p>

      <div className="cert-frame-outer" ref={frameRef}>
        <div className="cert-scale" style={{ height: SHEET_H * scale }}>
          <article
            className="cert-sheet"
            style={{ width: SHEET_W, height: SHEET_H, transform: `scale(${scale})` }}
            aria-label={`Certificate of ${kind.toLowerCase()}`}
          >
            <aside className="cert-side">
              <div className="cert-side-brand">
                <img src={logo} alt="" className="cert-side-logo" />
                <strong>IJEPA</strong>
                <span>International Journal of Engineering Practices and Applications</span>
              </div>
              <dl className="cert-side-ids">
                <div><dt>Certificate ID</dt><dd>{cert.number}</dd></div>
                <div><dt>Paper ID</dt><dd>{cert.paperCode}</dd></div>
                <div><dt>ISSN</dt><dd>3139-5961 (Online)</dd></div>
              </dl>
            </aside>

            <div className="cert-main">
              <p className="cert-kicker">Peer-reviewed · Open access</p>
              <h1 className="cert-heading">Certificate<span>of {kind}</span></h1>

              <p className="cert-lead">This certificate is presented to</p>
              <p className="cert-name">{cert.recipientName}</p>
              {cert.recipientAffiliation && <p className="cert-affiliation">{cert.recipientAffiliation}</p>}

              <span className="cert-divider" aria-hidden="true" />

              <p className="cert-body">
                {isReview ? 'in recognition of serving as a peer reviewer for the manuscript' : 'for the publication of the research paper'}
              </p>
              <p className="cert-paper">{cert.paperTitle}</p>
              {!isReview && Array.isArray(cert.authors) && cert.authors.length > 1 && (
                <p className="cert-authors">Authors: {cert.authors.join(', ')}</p>
              )}
              <p className="cert-body">
                {isReview
                  ? <>published in IJEPA{where ? `, ${where}` : ''}. We sincerely thank you for your contribution to the quality and integrity of our peer-review process.</>
                  : <>published in IJEPA{where ? `, ${where}` : ''}{cert.publicationDate ? ` on ${longDate(cert.publicationDate)}` : ''}, following double-blind peer review.</>}
              </p>

              <footer className="cert-foot">
                <div className="cert-date">
                  <span>Date of issue</span>
                  <strong>{issuedOn}</strong>
                </div>
                <div className="cert-sign">
                  <img src={signature} alt={`Signature of ${EDITOR_IN_CHIEF.name}`} className="cert-signature" />
                  <span className="cert-sign-line" aria-hidden="true" />
                  <strong>{EDITOR_IN_CHIEF.name}</strong>
                  <span>{EDITOR_IN_CHIEF.role}</span>
                </div>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
