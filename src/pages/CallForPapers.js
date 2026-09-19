import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockAPI } from '../data/mockData';

const CallForPapers = () => {
  const [importantDates, setImportantDates] = useState(null);

  useEffect(() => {
    const loadDates = async () => {
      const result = await mockAPI.getImportantDates();
      if (result.success) {
        setImportantDates(result.dates);
      }
    };

    loadDates();
  }, []);

  const fallbackDates = [
    ['Manuscript Submission Deadline', '20 December 2024'],
    ['Notification of Acceptance', 'To be announced'],
    ['Final Camera-Ready Paper Due', 'To be announced'],
    ['Publication Date', 'To be announced']
  ];

  const desiredDateOrder = [
    'Manuscript Submission Deadline',
    'Notification of Acceptance',
    'Final Camera-Ready Paper Due',
    'Publication Date'
  ];

  const dateEntries = importantDates && typeof importantDates === 'object'
    ? desiredDateOrder
      .map((label) => [label, importantDates[label]])
      .filter(([, value]) => value !== undefined)
    : fallbackDates;

  return (
    <div className="call-for-papers-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Call for Papers</p>
          <p className="eyebrow">RESEARCH & PUBLICATION</p>
          <h1>Call for Papers</h1>
          <p>Submit your original research to be considered for publication in upcoming issues of IJEPA.</p>
        </div>
      </section>

      <div className="page-body journal-container">
        <h2>Scope of the Journal</h2>
        <div className="page-card">
          <p>Topics of interest include (but are not limited to):</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Civil, Mechanical, Electrical, and Electronics Engineering</li>
            <li>Computer Science, Artificial Intelligence, and Information Technology</li>
            <li>Industrial and Manufacturing Engineering</li>
            <li>Materials Science and Engineering Applications</li>
            <li>Communication, Signal Processing, and Control Systems</li>
            <li>Renewable Energy, Green Technologies, and Sustainable Engineering</li>
            <li>Emerging Trends and Interdisciplinary Engineering Practices</li>
          </ul>
        </div>

        <h2>Why Publish with IJEPA?</h2>
        <div className="page-card">
          <ul className="checklist" style={{ marginBottom: 0 }}>
            {[
              'Peer-reviewed and high-quality publications',
              'Open access for global visibility and readership',
              'Rapid and transparent review process',
              'International editorial and reviewer panel',
              'Opportunities for academic recognition and collaboration'
            ].map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <h2>Submission Guidelines</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>
              Authors are requested to submit their manuscripts in accordance with the journal's formatting guidelines, available on the{' '}
              <Link to="/author-guidelines">Author Guidelines</Link>{' '}
              page.
            </li>
            <li>Submissions should be original, unpublished, and not under consideration elsewhere.</li>
            <li>
              Manuscripts can be submitted online via our{' '}
              <Link to="/SubmitForm">Online Submission System</Link>{' '}
              or by email to{' '}
              <a href="mailto:editor@ijepa.org">editor@ijepa.org</a>.
            </li>
          </ul>
        </div>

        <h2>Important Dates</h2>
        <div className="date-grid">
          {dateEntries.map(([label, date], i) => (
            <div key={i} className="date-tile">
              <strong>{label}</strong>
              <span>{date}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <Link to="/SubmitForm" className="button button-primary">Submit Your Manuscript</Link>
        </div>
      </div>
    </div>
  );
};

export default CallForPapers;
