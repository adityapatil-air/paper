import React from 'react';

const JoinEditorialTeam = () => {
  const GOOGLE_FORM_LINK = "https://forms.gle/UrzaLpgBvWUu4hJn9";
  const JOURNAL_EMAIL = "editor@ijepa.org";

  return (
    <div className="join-editorial-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Join the Editorial Team</p>
          <p className="eyebrow">SCHOLARLY LEADERSHIP</p>
          <h1>Join the Editorial Team</h1>
          <p>Join us as an Associate Editor or Reviewer</p>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          The International Journal of Engineering Practices and Applications (IJEPA) invites academicians, researchers, and industry experts with strong academic and research credentials to join our editorial community as Associate Editors or Reviewers.
          We believe that the quality of a journal is a reflection of the dedication and expertise of its editorial board and reviewers. By joining IJEPA, you will have the opportunity to contribute to the advancement of engineering research worldwide while gaining valuable recognition for your service.
        </p>

        <h2>Eligibility Criteria</h2>
        <div className="page-card">
          <ul className="content-list is-flush">
            <li>A Ph.D. or Master's degree in a relevant engineering or technology discipline.</li>
            <li>Proven research record with publications in peer-reviewed journals or conferences.</li>
            <li>Commitment to maintaining high ethical standards in research and publication.</li>
            <li>Willingness to review manuscripts in your area of expertise within stipulated timelines.</li>
          </ul>
        </div>

        <h2>Roles &amp; Responsibilities</h2>
        <div className="page-card">
          <h3 className="role-heading">Associate Editors</h3>
          <ul className="content-list">
            <li>Assist in managing the peer-review process.</li>
            <li>Provide editorial decisions and recommendations.</li>
            <li>Contribute to the strategic development of the journal.</li>
          </ul>

          <h3 className="role-heading">Reviewers</h3>
          <ul className="content-list is-flush">
            <li>Provide constructive, detailed, and timely reviews of assigned manuscripts.</li>
            <li>Help uphold the quality and integrity of published research.</li>
          </ul>
        </div>

        <h2>Benefits</h2>
        <div className="page-card">
          <ul className="checklist" style={{ marginBottom: 0 }}>
            {[
              'Recognition as an Associate Editor/Reviewer on the IJEPA website.',
              'Opportunity to stay updated with cutting-edge research in your field.',
              'Certificate of appreciation for your editorial/reviewing contribution.',
              'Networking with international researchers and professionals.'
            ].map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <h2>How to Apply</h2>
        <div className="page-card">
          <p>Interested candidates are invited to complete the application form via the link below:</p>
          <a
            href={GOOGLE_FORM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-primary button-small"
          >
            Apply Here
          </a>
          <p style={{ marginTop: 18, marginBottom: 0 }}>
            For queries, please contact:<br />
            <strong>Editorial Office, IJEPA</strong><br />
            Email: <a href={`mailto:${JOURNAL_EMAIL}`}>{JOURNAL_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinEditorialTeam;
