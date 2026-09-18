import React from 'react';

const JoinEditorialTeam = () => {
  const GOOGLE_FORM_LINK = "https://forms.gle/UrzaLpgBvWUu4hJn9";
  const JOURNAL_EMAIL = "editor@ijepa.org";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content Box — matches AuthorGuidelines exactly */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">
          
          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b border-slate-200">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Join Us as Associate Editor or Reviewer
            </h1>
          </div>

          {/* Intro Paragraph */}
          <p className="text-slate-700 mb-8 leading-relaxed text-justify">
            The International Journal of Engineering Practices and Applications (IJEPA) invites academicians, researchers, and industry experts with strong academic and research credentials to join our editorial community as Associate Editors or Reviewers.
            We believe that the quality of a journal is a reflection of the dedication and expertise of its editorial board and reviewers. By joining IJEPA, you will have the opportunity to contribute to the advancement of engineering research worldwide while gaining valuable recognition for your service.
          </p>

          {/* Eligibility Criteria */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Eligibility Criteria
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-justify">
              <li>A Ph.D. or Master’s degree in a relevant engineering or technology discipline.</li>
              <li>Proven research record with publications in peer-reviewed journals or conferences.</li>
              <li>Commitment to maintaining high ethical standards in research and publication.</li>
              <li>Willingness to review manuscripts in your area of expertise within stipulated timelines.</li>
            </ul>
          </section>

          {/* Roles & Responsibilities */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Roles & Responsibilities
            </h2>

            <div className="mb-4">
              <h3 className="font-bold text-slate-800 mb-2">Associate Editors</h3>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 text-justify">
                <li>Assist in managing the peer-review process.</li>
                <li>Provide editorial decisions and recommendations.</li>
                <li>Contribute to the strategic development of the journal.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-2">Reviewers</h3>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 text-justify">
                <li>Provide constructive, detailed, and timely reviews of assigned manuscripts.</li>
                <li>Help uphold the quality and integrity of published research.</li>
              </ul>
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Benefits
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              {[
                'Recognition as an Associate Editor/Reviewer on the IJEPA website.',
                'Opportunity to stay updated with cutting-edge research in your field.',
                'Certificate of appreciation for your editorial/reviewing contribution.',
                'Networking with international researchers and professionals.'
              ].map((item, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-amber-700 mr-2 mt-0.5">✓</span>
                  <span className="text-justify">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to Apply */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              How to Apply
            </h2>
            <p className="text-slate-700 mb-4 text-justify">
              Interested candidates are invited to complete the application form via the link below:
            </p>
            <a
              href={GOOGLE_FORM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg transition-colors"
            >
              Apply Here
            </a>
            <p className="mt-6 text-slate-700 text-justify">
              For queries, please contact:<br />
              <span className="font-medium">Editorial Office, IJEPA</span><br />
              Email: <a
                href={`mailto:${JOURNAL_EMAIL}`}
                className="text-amber-700 hover:underline"
              >
                {JOURNAL_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </div>
  
    </div>
  );
};

export default JoinEditorialTeam;