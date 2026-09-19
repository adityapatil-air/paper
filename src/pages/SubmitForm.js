import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = '';

const SubmitForm = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coAuthors, setCoAuthors] = useState([]);

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    affiliation: '',
    paperTitle: '',
    keywords: '',
    manuscript: null,
    comments: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: '/submitform' } });
    } else {
      setLoading(false);
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddCoAuthor = () => {
    setCoAuthors(prev => ([
      ...prev,
      { fullName: '', affiliation: '', email: '' }
    ]));
  };

  const handleRemoveCoAuthor = (index) => {
    setCoAuthors(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const next = { ...prev };
      delete next[`coAuthors.${index}.fullName`];
      delete next[`coAuthors.${index}.affiliation`];
      delete next[`coAuthors.${index}.email`];
      return next;
    });
  };

  const handleCoAuthorChange = (index, field, value) => {
    setCoAuthors(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    const key = `coAuthors.${index}.${field}`;
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.affiliation.trim()) newErrors.affiliation = 'Affiliation is required';
    if (!formData.paperTitle.trim()) newErrors.paperTitle = 'Paper title is required';
    if (!formData.manuscript) newErrors.manuscript = 'Manuscript file is required';

    const normalizedCoAuthors = (coAuthors || [])
      .map((a) => ({
        fullName: String(a?.fullName || '').trim(),
        affiliation: String(a?.affiliation || '').trim(),
        email: String(a?.email || '').trim(),
      }))
      .filter((a) => a.fullName || a.affiliation || a.email);

    normalizedCoAuthors.forEach((a, index) => {
      if (!a.fullName) newErrors[`coAuthors.${index}.fullName`] = 'Co-author name is required';
      if (!a.affiliation) newErrors[`coAuthors.${index}.affiliation`] = 'Co-author affiliation is required';
      if (!a.email) {
        newErrors[`coAuthors.${index}.email`] = 'Co-author email is required';
      } else if (!/\S+@\S+\.\S+/.test(a.email)) {
        newErrors[`coAuthors.${index}.email`] = 'Co-author email is invalid';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const form = new FormData();
      form.append('fullName', formData.fullName);
      form.append('email', formData.email);
      form.append('affiliation', formData.affiliation);
      form.append('paperTitle', formData.paperTitle);
      form.append('keywords', formData.keywords || '');
      form.append('comments', formData.comments || '');

      const normalizedCoAuthors = (coAuthors || [])
        .map((a) => ({
          fullName: String(a?.fullName || '').trim(),
          affiliation: String(a?.affiliation || '').trim(),
          email: String(a?.email || '').trim(),
        }))
        .filter((a) => a.fullName || a.affiliation || a.email);

      form.append('coAuthors', JSON.stringify(normalizedCoAuthors));
      if (user?.id) {
        form.append('userId', String(user.id));
      }

      if (formData.manuscript) {
        form.append('manuscript', formData.manuscript);
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        body: form,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error || 'Failed to submit paper. Please try again.');
      } else {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Submission failed', error);
      setSubmitError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilePreview = (file) => {
    if (!file) return null;
    return (
      <p style={{ color: '#0f7b3d', fontWeight: 600, marginTop: 8 }}>
        {file.name}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Authenticating..." />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="page-card" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div className="badge badge-success" style={{ fontSize: 12, padding: '8px 16px', marginBottom: 16, display: 'inline-block' }}>
            Submitted
          </div>
          <h1 style={{ color: 'var(--navy)', fontSize: 20, margin: '0 0 12px' }}>Paper Submitted Successfully!</h1>
          <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 20px' }}>
            Thank you for your submission. You will receive a confirmation email shortly. Our team will review your paper and get back to you.
          </p>
          <button
            onClick={() => navigate('/author-dashboard')}
            className="button button-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="journal-container" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <button
            onClick={() => navigate('/author-dashboard')}
            className="icon-btn"
            style={{ marginBottom: 18 }}
          >
            &larr; Back to Dashboard
          </button>

          <h1 style={{ color: 'var(--navy)', fontSize: 22, margin: '0 0 10px' }}>Submit Your Research Paper</h1>
          <p style={{ color: 'var(--muted)', fontSize: 11, maxWidth: 560, margin: '0 auto' }}>
            Please fill in all required fields and upload the necessary documents to submit your manuscript for review.
          </p>
        </div>

        {/* Form */}
        <div className="dash-panel">
          <form onSubmit={handleSubmit}>
            {submitError && (
              <div className="badge badge-danger" style={{ display: 'block', padding: '10px 14px', marginBottom: 18, fontSize: 10 }}>
                {submitError}
              </div>
            )}
            {/* Section: Author Information */}
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 24, marginBottom: 24 }}>
              <h2 style={{ color: 'var(--navy)', fontSize: 15, margin: '0 0 18px' }}>
                1. Author Information
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="fullName">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-input"
                    style={errors.fullName ? { borderColor: '#c0342c' } : undefined}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && <p className="form-hint" style={{ color: '#c0342c' }}>{errors.fullName}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    style={errors.email ? { borderColor: '#c0342c' } : undefined}
                    placeholder="your.email@institution.edu"
                  />
                  {errors.email && <p className="form-hint" style={{ color: '#c0342c' }}>{errors.email}</p>}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="affiliation">
                    Affiliation / Institution *
                  </label>
                  <input
                    type="text"
                    id="affiliation"
                    name="affiliation"
                    value={formData.affiliation}
                    onChange={handleInputChange}
                    className="form-input"
                    style={errors.affiliation ? { borderColor: '#c0342c' } : undefined}
                    placeholder="University, Company, or Organization"
                  />
                  {errors.affiliation && <p className="form-hint" style={{ color: '#c0342c' }}>{errors.affiliation}</p>}
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <h3 style={{ color: 'var(--navy)', fontSize: 12, margin: 0 }}>Co-authors (Optional)</h3>
                  <button
                    type="button"
                    onClick={handleAddCoAuthor}
                    className="button button-dark button-small"
                  >
                    Add Co-author
                  </button>
                </div>

                {coAuthors.length === 0 ? (
                  <p style={{ fontSize: 10, color: 'var(--muted)' }}>Add co-authors if your paper has multiple authors.</p>
                ) : (
                  <div>
                    {coAuthors.map((author, index) => (
                      <div key={index} className="page-card" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Co-author {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveCoAuthor(index)}
                            style={{ border: 0, background: 'none', color: '#c0342c', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Full Name *</label>
                            <input
                              type="text"
                              value={author.fullName}
                              onChange={(e) => handleCoAuthorChange(index, 'fullName', e.target.value)}
                              className="form-input"
                              style={errors[`coAuthors.${index}.fullName`] ? { borderColor: '#c0342c' } : undefined}
                              placeholder="Co-author name"
                            />
                            {errors[`coAuthors.${index}.fullName`] && (
                              <p className="form-hint" style={{ color: '#c0342c' }}>{errors[`coAuthors.${index}.fullName`]}</p>
                            )}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Affiliation *</label>
                            <input
                              type="text"
                              value={author.affiliation}
                              onChange={(e) => handleCoAuthorChange(index, 'affiliation', e.target.value)}
                              className="form-input"
                              style={errors[`coAuthors.${index}.affiliation`] ? { borderColor: '#c0342c' } : undefined}
                              placeholder="Institution"
                            />
                            {errors[`coAuthors.${index}.affiliation`] && (
                              <p className="form-hint" style={{ color: '#c0342c' }}>{errors[`coAuthors.${index}.affiliation`]}</p>
                            )}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Email *</label>
                            <input
                              type="email"
                              value={author.email}
                              onChange={(e) => handleCoAuthorChange(index, 'email', e.target.value)}
                              className="form-input"
                              style={errors[`coAuthors.${index}.email`] ? { borderColor: '#c0342c' } : undefined}
                              placeholder="name@email.com"
                            />
                            {errors[`coAuthors.${index}.email`] && (
                              <p className="form-hint" style={{ color: '#c0342c' }}>{errors[`coAuthors.${index}.email`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section: Paper Details */}
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 24, marginBottom: 24 }}>
              <h2 style={{ color: 'var(--navy)', fontSize: 15, margin: '0 0 18px' }}>
                2. Paper Details
              </h2>

              <div className="form-group">
                <label htmlFor="paperTitle">
                  Paper Title *
                </label>
                <input
                  type="text"
                  id="paperTitle"
                  name="paperTitle"
                  value={formData.paperTitle}
                  onChange={handleInputChange}
                  className="form-input"
                  style={errors.paperTitle ? { borderColor: '#c0342c' } : undefined}
                  placeholder="Enter the title of your research paper"
                />
                {errors.paperTitle && <p className="form-hint" style={{ color: '#c0342c' }}>{errors.paperTitle}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="keywords">
                  Keywords (Optional)
                </label>
                <input
                  type="text"
                  id="keywords"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., AI, Civil Engineering, Renewable Energy"
                />
                <p className="form-hint">Separate keywords with commas</p>
              </div>
            </div>

            {/* Section: Document Uploads */}
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 24, marginBottom: 24 }}>
              <h2 style={{ color: 'var(--navy)', fontSize: 15, margin: '0 0 18px' }}>
                3. Document Uploads
              </h2>

              <div className="form-group">
                <label>
                  Upload Manuscript *
                </label>
                <label
                  className="file-drop"
                  style={{ display: 'block', borderColor: errors.manuscript ? '#c0342c' : undefined }}
                >
                  <div>Upload a file or drag and drop</div>
                  <div style={{ marginTop: 4 }}>PDF, DOC, or DOCX format only (Max 20MB)</div>
                  <input
                    type="file"
                    name="manuscript"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {getFilePreview(formData.manuscript)}
                </label>
                {errors.manuscript && <p className="form-hint" style={{ color: '#c0342c' }}>{errors.manuscript}</p>}
              </div>
            </div>

            {/* Section: Additional Information */}
            <div>
              <h2 style={{ color: 'var(--navy)', fontSize: 15, margin: '0 0 18px' }}>
                4. Additional Information
              </h2>

              <div className="form-group">
                <label htmlFor="comments">
                  Additional Comments / Cover Letter (Optional)
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows="4"
                  className="form-textarea"
                  placeholder="Share any additional context, special requests, or cover letter details..."
                />
                <p className="form-hint">Max 500 characters</p>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ paddingTop: 20 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="button button-primary"
                style={{ width: '100%', padding: '13px 0' }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LoadingSpinner size="sm" text="" />
                    Submitting Paper...
                  </span>
                ) : (
                  'Submit Paper for Review'
                )}
              </button>
              <p style={{ marginTop: 14, textAlign: 'center', fontSize: 9, color: 'var(--muted)' }}>
                By submitting, you agree to our <a href="/author-guidelines" style={{ color: 'var(--blue)' }}>Author Guidelines</a> and <button type="button" onClick={() => window.open('#', '_blank')} style={{ color: 'var(--blue)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>Publication Ethics</button>.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitForm;
