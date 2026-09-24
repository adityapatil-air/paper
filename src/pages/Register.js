import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import logo from '../assets/logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    affiliation: '',
    department: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.affiliation.trim()) {
      setError('Affiliation is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { confirmPassword, ...userData } = formData;
      const result = await register(userData);
      if (result.success) {
        navigate('/author-dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Google sign-in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-visual-brand">
            <img src={logo} alt="IJEPA" />
            <strong>IJEPA</strong>
          </div>
          <div>
            <h2>Join a global community of engineering researchers and reviewers.</h2>
            <ul className="auth-visual-points">
              <li><span className="dot" /> Submit manuscripts and track review status live</li>
              <li><span className="dot" /> Get matched with reviewers in your discipline</li>
              <li><span className="dot" /> Free, open-access publishing from day one</li>
            </ul>
          </div>
          <p className="auth-visual-foot">International Journal of Engineering Practices and Applications</p>
        </div>

        <div className="auth-panel">
          <div className="auth-card" style={{ maxWidth: 460 }}>
            <h1>Create your account</h1>
            <p className="auth-subtitle">
              Already registered? <Link to="/login">Sign in to your existing account</Link>
            </p>

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="you@institution.edu"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="affiliation">Affiliation</label>
                <input
                  id="affiliation"
                  name="affiliation"
                  type="text"
                  required
                  value={formData.affiliation}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="University, Institution, or Organization"
                />
              </div>

              <div className="form-group">
                <label htmlFor="department">Department</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Field of Study"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Create a password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Confirm password"
                    style={formData.confirmPassword && formData.password !== formData.confirmPassword ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="form-hint" style={{ color: 'var(--danger)' }}>Passwords don't match yet.</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '6px 0 20px' }}>
                <input id="terms" name="terms" type="checkbox" required style={{ marginTop: 3 }} />
                <label htmlFor="terms" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'none', fontWeight: 400 }}>
                  I agree to the{' '}
                  <a href="/terms-of-service" style={{ color: 'var(--blue)', fontWeight: 600 }}>Terms of Service</a>{' '}
                  and{' '}
                  <a href="/privacy-policy" style={{ color: 'var(--blue)', fontWeight: 600 }}>Privacy Policy</a>
                </label>
              </div>

              <button type="submit" disabled={loading} className="button button-primary" style={{ width: '100%' }}>
                {loading ? 'Creating Account...' : 'Create Account →'}
              </button>
            </form>

            <div className="auth-divider">or continue with</div>

            <button onClick={handleGoogleLogin} className="button-google" disabled={loading}>
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <p className="auth-footer-link">
              New accounts are author accounts. Want to review or edit for IJEPA? <Link to="/joinusedito">Join the editorial team</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
