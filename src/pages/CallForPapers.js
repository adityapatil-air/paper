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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content Box — matches AuthorGuidelines exactly */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">
          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b border-slate-200">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Call for <span className="text-amber-700">Papers</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Submit your original research to be considered for publication in upcoming issues of IJEPA.
            </p>
          </div>

          {/* Scope */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Scope of the Journal
            </h2>
            <p className="text-slate-700 mb-3 text-justify">
              Topics of interest include (but are not limited to):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-justify">
              <li>Civil, Mechanical, Electrical, and Electronics Engineering</li>
              <li>Computer Science, Artificial Intelligence, and Information Technology</li>
              <li>Industrial and Manufacturing Engineering</li>
              <li>Materials Science and Engineering Applications</li>
              <li>Communication, Signal Processing, and Control Systems</li>
              <li>Renewable Energy, Green Technologies, and Sustainable Engineering</li>
              <li>Emerging Trends and Interdisciplinary Engineering Practices</li>
            </ul>
          </section>

          {/* Why Publish */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Why Publish with IJEPA?
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              {[
                'Peer-reviewed and high-quality publications',
                'Open access for global visibility and readership',
                'Rapid and transparent review process',
                'International editorial and reviewer panel',
                'Opportunities for academic recognition and collaboration'
              ].map((item, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-amber-700 mr-2 mt-0.5">✓</span>
                  <span className="text-justify">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Submission Guidelines */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Submission Guidelines
            </h2>
            <ul className="space-y-2 text-slate-700 text-justify">
              <li>
                • Authors are requested to submit their manuscripts in accordance with the journal’s formatting guidelines, available on the{' '}
                <Link to="/author-guidelines" className="text-amber-700 hover:underline">
                  Author Guidelines
                </Link>{' '}
                page.
              </li>
              <li>• Submissions should be original, unpublished, and not under consideration elsewhere.</li>
              <li>
                • Manuscripts can be submitted online via our{' '}
                <Link to="/SubmitForm" className="text-amber-700 hover:underline">
                  Online Submission System
                </Link>{' '}
                or by email to{' '}
                <a href="mailto:editor@ijepa.org" className="text-amber-700 hover:underline">
                  editor@ijepa.org
                </a>
                .
              </li>
            </ul>
          </section>

          {/* Literature Review */}
          

          {/* Important Dates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Important Dates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dateEntries.map(([label, date], i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="font-medium text-slate-800">{label}</p>
                  <p className="text-amber-700 font-semibold mt-1">{date}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Submit Button */}
          <div className="text-center pt-6 border-t border-slate-200">
            <Link
              to="/SubmitForm"
              className="inline-flex items-center px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg transition-colors"
            >
              Submit Your Manuscript
            </Link>
          </div>
        </div>
      </div>
     
    </div>
  );
};

export default CallForPapers;