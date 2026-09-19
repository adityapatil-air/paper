import React from 'react';

const TermsOfService = () => {
  return (
    <div className="terms-of-service-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Terms of Service</p>
          <p className="eyebrow">LEGAL</p>
          <h1>Terms of Service</h1>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          By accessing or using the website of the <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong>, you agree to be bound by the following terms and conditions.
        </p>

        <h2>Use of Content</h2>
        <p>All published articles are made available under an open-access policy for personal, academic, and research use, subject to proper citation of the original source.</p>

        <h2>Manuscript Submission</h2>
        <p>By submitting a manuscript, authors confirm that the work is original, unpublished, and not under consideration elsewhere, and agree to abide by the journal's peer-review and publication ethics policies.</p>

        <h2>Intellectual Property</h2>
        <p>Authors retain intellectual property rights over their work while granting IJEPA the rights necessary to publish and distribute the accepted article.</p>

        <h2>Limitation of Liability</h2>
        <p>IJEPA and its editorial team make reasonable efforts to ensure accuracy but do not guarantee the completeness or correctness of published content, and shall not be liable for any resulting damages.</p>

        <h2>Changes to These Terms</h2>
        <p>These terms may be updated periodically. Continued use of the website constitutes acceptance of the revised terms.</p>

        <h2>Contact Us</h2>
        <p>For questions regarding these Terms of Service, please reach out via our <a href="/contact-us">Contact Us</a> page.</p>
      </div>
    </div>
  );
};

export default TermsOfService;
