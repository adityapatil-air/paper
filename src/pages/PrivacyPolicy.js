import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Privacy Policy</p>
          <p className="eyebrow">LEGAL</p>
          <h1>Privacy Policy</h1>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> respects your privacy and is committed to protecting the personal information you share with us through manuscript submission, correspondence, or use of this website.
        </p>

        <h2>Information We Collect</h2>
        <p>We may collect names, email addresses, affiliations, and manuscript details submitted by authors, reviewers, and editorial board members through our submission and contact forms.</p>

        <h2>How We Use Your Information</h2>
        <p>Information collected is used solely for editorial and publication purposes, including manuscript processing, peer review coordination, and communication regarding submissions.</p>

        <h2>Data Protection</h2>
        <p>We take reasonable technical and organizational measures to safeguard your personal data against unauthorized access, alteration, or disclosure.</p>

        <h2>Third-Party Sharing</h2>
        <p>We do not sell or rent personal information to third parties. Limited data may be shared with indexing and archiving services solely to support the journal's publication process.</p>

        <h2>Contact Us</h2>
        <p>For questions regarding this Privacy Policy, please reach out via our <a href="/contact-us">Contact Us</a> page.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
