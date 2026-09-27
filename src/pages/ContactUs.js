import React from 'react';
import Icon from '../components/ui/Icon';

const EDITORIAL_EMAIL = 'editor@ijepa.org';
const PHONE_DISPLAY = '+91 8149844901';
const PHONE_LINK = '+918149844901';

const ContactUs = () => (
  <div className="contact-page">
    <section className="page-banner">
      <div className="journal-container">
        <p className="breadcrumb">Home / Contact Us</p>
        <p className="eyebrow">GET IN TOUCH</p>
        <h1>Contact Us</h1>
        <p>We're here to assist you with any questions about submissions, editorial policies, or journal operations.</p>
      </div>
    </section>

    <div className="page-body journal-container">
      <p>
        The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> values communication with authors, reviewers, editors, and readers. We encourage you to reach out for any queries, clarifications, or support related to manuscript submission, editorial policies, or publication processes.
      </p>

      <div className="contact-cards">
        <a className="contact-card" href={`mailto:${EDITORIAL_EMAIL}`}>
          <span className="contact-card-icon" aria-hidden="true"><Icon name="mail" size={22} /></span>
          <span className="contact-card-label">Email</span>
          <strong>{EDITORIAL_EMAIL}</strong>
          <span className="contact-card-hint">Write to the editorial office</span>
        </a>
        <a className="contact-card" href={`tel:${PHONE_LINK}`}>
          <span className="contact-card-icon" aria-hidden="true"><Icon name="phone" size={22} /></span>
          <span className="contact-card-label">Phone</span>
          <strong>{PHONE_DISPLAY}</strong>
          <span className="contact-card-hint">Call the editorial office</span>
        </a>
      </div>

      <div className="contact-columns">
        <div className="page-card">
          <h3>Editorial Office</h3>
          <p className="contact-line is-lead">International Journal of Engineering Practices and Applications (IJEPA)</p>
          <p className="contact-line">Email: <a href={`mailto:${EDITORIAL_EMAIL}`}>{EDITORIAL_EMAIL}</a></p>
          <p className="contact-line">Phone: <a href={`tel:${PHONE_LINK}`}>{PHONE_DISPLAY}</a></p>
          <p className="contact-line">Website: <a href="https://www.ijepa.org">www.ijepa.org</a></p>
        </div>

        <div className="page-card">
          <h3>How we can help</h3>
          <h4><span className="dot" />For Authors</h4>
          <ul>
            <li>Manuscript preparation or submission guidelines</li>
            <li>Status updates on submitted papers</li>
            <li>Publication charges or templates</li>
          </ul>

          <h4><span className="dot" />For Reviewers / Editors</h4>
          <ul>
            <li>Joining as Associate Editor or Reviewer</li>
            <li>Support with review process or editorial roles</li>
          </ul>

          <h4><span className="dot" />General Inquiries</h4>
          <ul className="is-last">
            <li>Feedback about the journal</li>
            <li>Technical support</li>
          </ul>
        </div>
      </div>

      <div className="contact-note">
        We aim to respond to all inquiries within <strong>2–3 business days</strong>. Please include your paper ID, if you have one.
      </div>
    </div>
  </div>
);

export default ContactUs;
