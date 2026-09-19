import React, { useState } from 'react';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Replace with real API call in production
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      setSubmitError('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
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

            {submitSuccess && (
              <div className="contact-note" style={{ marginTop: 0, marginBottom: 14 }}>
                Message sent successfully! We'll get back to you soon.
              </div>
            )}

            {submitError && (
              <div className="contact-note" style={{ marginTop: 0, marginBottom: 14, background: '#fbe9e9', color: '#8a2b2b' }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Subject"
                />
              </div>

              <div className="form-group">
                <label>Message *</label>
                <textarea
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
                disabled={isSubmitting}
                className="button button-primary"
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
