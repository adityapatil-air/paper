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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content Box — matches AuthorGuidelines */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">

          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b border-slate-200">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Contact <span className="text-amber-700">Us</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We're here to assist you with any questions about submissions, editorial policies, or journal operations.
            </p>
          </div>

          {/* Intro */}
          <p className="text-slate-700 mb-8 leading-relaxed text-justify">
            The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> values communication with authors, reviewers, editors, and readers. We encourage you to reach out for any queries, clarifications, or support related to manuscript submission, editorial policies, or publication processes.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">
                Get in Touch
              </h2>

              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Editorial Office</h3>
                <p className="text-slate-700 text-sm mb-2">
                  International Journal of Engineering Practices and Applications (IJEPA)
                </p>
                <p className="text-slate-700 text-sm">
                  Email: <a href="mailto:editor@ijepa.org" className="text-amber-700 hover:underline">editor@ijepa.org</a>
                </p>
                <p className="text-slate-700 text-sm">
                  Phone: +91 8149844901
                </p>
                <p className="text-slate-700 text-sm">
                  Website: <a href="https://www.ijepa.org" className="text-amber-700 hover:underline">www.ijepa.org</a>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center">
                    <span className="w-2 h-2 bg-amber-700 rounded-full mr-2"></span>
                    For Authors
                  </h4>
                  <ul className="text-slate-700 text-sm space-y-1 list-disc pl-5">
                    <li>Manuscript preparation or submission guidelines</li>
                    <li>Status updates on submitted papers</li>
                    <li>Publication charges or templates</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center">
                    <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                    For Reviewers / Editors
                  </h4>
                  <ul className="text-slate-700 text-sm space-y-1 list-disc pl-5">
                    <li>Joining as Associate Editor or Reviewer</li>
                    <li>Support with review process or editorial roles</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    General Inquiries
                  </h4>
                  <ul className="text-slate-700 text-sm space-y-1 list-disc pl-5">
                    <li>Feedback about the journal</li>
                    <li>Technical support</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm font-medium">
                  We aim to respond to all inquiries within <strong>2–3 business days</strong>.
                </p>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">
                Send a Message
              </h2>

              {submitSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-800 rounded border border-green-200 text-sm">
                  Message sent successfully! We'll get back to you soon.
                </div>
              )}

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200 text-sm">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-700 focus:border-amber-700"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-700 focus:border-amber-700"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-700 focus:border-amber-700"
                    placeholder="Subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-700 focus:border-amber-700 resize-none"
                    placeholder="Your message..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-amber-500 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
   
    </div>
  );
};

export default ContactUs;