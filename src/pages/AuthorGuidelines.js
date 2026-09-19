import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import paperTemplateDocx from '../assets/Paper Template.docx';
import copyrightPdf from '../assets/Copyright.pdf';

const AuthorGuidelines = () => {
  const componentRef = useRef();
  // eslint-disable-next-line no-unused-vars
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'IJEPA_Author_Guidelines',
    pageStyle: `
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
      }
      @screen {
        .print-only { display: none !important; }
      }
    `,
  });

  return (
    <div className="author-guidelines-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Author Guidelines</p>
          <p className="eyebrow">FOR CONTRIBUTORS</p>
          <h1>Author Guidelines</h1>
          <p>Explore the comprehensive guidelines for authors</p>
        </div>
      </section>

      <div className="page-body journal-container" ref={componentRef}>
        <p>
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> welcomes high-quality research contributions from scholars, academicians, industry professionals, and practitioners across all engineering domains. Authors are requested to carefully read and follow the guidelines below before submitting their manuscripts.
        </p>

        <h2>1. Manuscript Preparation</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li><strong>Language:</strong> All manuscripts must be written in clear, concise, and grammatically correct English.</li>
            <li><strong>Format:</strong> Manuscripts should be submitted in MS Word (DOC/DOCX) format. PDF files will not be accepted for initial submission.</li>
            <li><strong>Length:</strong> Research papers should typically range between 6–12 pages. Review articles may be longer, subject to editorial approval.</li>
            <li>
              <strong>Structure:</strong> The manuscript should be organized as follows:
              <ol style={{ marginTop: 8 }}>
                <li>Title Page (with author details)</li>
                <li>Abstract (150–250 words) and Keywords (3–6)</li>
                <li>Introduction</li>
                <li>Literature Survey</li>
                <li>Methodology / Materials and Methods</li>
                <li>Results and Discussion</li>
                <li>Conclusion</li>
                <li>Acknowledgements (if any)</li>
                <li>References</li>
              </ol>
            </li>
          </ul>
        </div>

        <h2>2. Formatting Requirements</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li><strong>Font:</strong> Times New Roman, size 12, single-column, 1.5 line spacing.</li>
            <li><strong>Headings:</strong> Use a clear hierarchy (e.g., 1. Introduction, 1.1 Subheading).</li>
            <li><strong>Figures &amp; Tables:</strong> Must be numbered consecutively, with descriptive captions. Ensure high resolution and clarity.</li>
            <li><strong>Equations:</strong> Should be typed using an equation editor and numbered sequentially.</li>
            <li><strong>References:</strong> Follow <strong>IEEE</strong> referencing style consistently throughout.</li>
          </ul>
        </div>

        <h2>3. Originality &amp; Plagiarism Policy</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>Submissions must be original and not under review or published elsewhere.</li>
            <li>All manuscripts will be checked for plagiarism. Papers exceeding the acceptable similarity index will be rejected.</li>
          </ul>
        </div>

        <h2>4. Peer Review Process</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>All submissions undergo a double-blind peer-review process.</li>
            <li>Authors may be asked to revise their manuscripts based on reviewer feedback.</li>
            <li>Final acceptance is subject to editorial approval.</li>
          </ul>
        </div>

        <h2>5. Submission Process</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>Manuscripts should be submitted via the <a href="/SubmitForm">Online Submission System</a> or emailed directly to <span style={{ fontFamily: 'monospace' }}>editor@ijepa.org</span>.</li>
            <li>Along with the manuscript, authors must provide:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>A cover letter highlighting the contribution of the paper.</li>
                <li>A signed copyright form (see below).</li>
              </ul>
            </li>
          </ul>
        </div>

        <h2>6. Publication Charges</h2>
        <div className="page-card">
          <p>To support the open-access policy and editorial process, the following Article Processing Charges (APC) apply:</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Indian Authors: <strong>INR 1500/- per accepted paper</strong></li>
            <li>International Authors: <strong>USD 50 per accepted paper</strong></li>
          </ul>
          <p style={{ marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
            Note: No submission fees are charged. Authors are required to pay only after acceptance of the manuscript.
          </p>
        </div>

        <h2>7. Paper Template</h2>
        <div className="page-card">
          <p>Authors must prepare their manuscripts using the official IJEPA Paper Template to ensure uniformity.</p>
          <a href={paperTemplateDocx} download="Paper Template.docx" className="button button-primary button-small">Download Paper Template</a>
        </div>

        <h2>8. Copyright Form</h2>
        <div className="page-card">
          <p>Upon acceptance, authors must complete and submit the IJEPA Copyright Transfer Form. This form ensures that:</p>
          <ul>
            <li>The work is original and not published elsewhere.</li>
            <li>Authors transfer publication rights to IJEPA while retaining intellectual property rights.</li>
          </ul>
          <a href={copyrightPdf} download="Copyright.pdf" className="button button-dark button-small">Download Copyright Form</a>
        </div>

        <h2>9. Publication Ethics</h2>
        <div className="page-card">
          <p>IJEPA adheres to strict ethical standards. Authors are expected to:</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Properly cite all sources of information.</li>
            <li>Acknowledge contributions and funding support.</li>
            <li>Disclose any potential conflicts of interest.</li>
            <li>Refrain from multiple submissions of the same work.</li>
          </ul>
        </div>

        <h2>10. Copyright &amp; Open Access Policy</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>By submitting to IJEPA, authors agree to transfer copyright of the accepted article to the journal.</li>
            <li>All published papers are made freely accessible under the journal's open-access policy, ensuring maximum visibility.</li>
          </ul>
        </div>

        <h2>11. Contact Information</h2>
        <div className="page-card">
          <p>For queries regarding manuscript preparation and submission, please contact:</p>
          <p style={{ marginBottom: 0 }}><strong>Editorial Office, IJEPA</strong><br />Email: editor@ijepa.org</p>
        </div>

        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 20 }}>
          We strongly encourage authors to review recent articles published in IJEPA to familiarize themselves with the journal's style and scope before submission.
        </p>
      </div>
    </div>
  );
};

export default AuthorGuidelines;
