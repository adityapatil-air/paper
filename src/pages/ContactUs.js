import React, { useState } from 'react';

const EDITORIAL_EMAIL = 'editor@ijepa.org';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [composeOpened, setComposeOpened] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // The site has no mail service, so the message is handed to the visitor's email app,
  // addressed to the editorial office. The form keeps its text in case no app opens.
  const handleSubmit = (e) => {
    e.preventDefault();
    const body = `${formData.message}\n\n— ${formData.name} (${formData.email})`;
    window.location.href = `mailto:${EDITORIAL_EMAIL}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
    setComposeOpened(true);
  };

  return (
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

        <div className="contact-columns">
          <div>
            <h2>Get in Touch</h2>

            <div className="page-card">
              <h3>Editorial Office</h3>
              <p style={{ margin: '0 0 6px' }}>International Journal of Engineering Practices and Applications (IJEPA)</p>
              <p style={{ margin: '0 0 4px' }}>Email: <a href="mailto:editor@ijepa.org">editor@ijepa.org</a></p>
              <p style={{ margin: '0 0 4px' }}>Phone: +91 8149844901</p>
              <p style={{ margin: 0 }}>Website: <a href="https://www.ijepa.org">www.ijepa.org</a></p>

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
              <ul style={{ marginBottom: 0 }}>
                <li>Feedback about the journal</li>
                <li>Technical support</li>
              </ul>
            </div>

            <div className="contact-note">
              We aim to respond to all inquiries within <strong>2–3 business days</strong>.
            </div>
          </div>

          <div>
            <h2>Send a Message</h2>

            <p>This form opens your email app with the message addressed to <a href={`mailto:${EDITORIAL_EMAIL}`}>{EDITORIAL_EMAIL}</a>.</p>

            {composeOpened && (
              <div className="contact-note" role="status" style={{ marginTop: 0, marginBottom: 14 }}>
                Your email app should now show the message. Send it from there. If nothing opened, email <a href={`mailto:${EDITORIAL_EMAIL}`}>{EDITORIAL_EMAIL}</a> directly.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="contact-name">Full Name *</label>
                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-email">Email *</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-subject">Subject *</label>
                <input
                  type="text"
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Subject"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-message">Message *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="form-textarea"
                  placeholder="Your message..."
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                style={{ width: '100%' }}
              >
                Continue in email app
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
