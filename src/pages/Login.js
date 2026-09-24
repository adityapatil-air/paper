import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import logo from '../assets/logo.png';

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fromState = location.state?.from;
  const from = (typeof fromState === 'string' ? fromState : fromState?.pathname) || null;
  const contextMessage = from === '/submitform'
    ? 'Sign in (or create a free account) to submit your manuscript — it only takes a minute.'
    : from
      ? 'Sign in to continue where you left off.'
      : null;

  const getDashboardPath = (role) => {
    if (role === 'admin') return '/admin-dashboard';
    if (role === 'reviewer') return '/reviewer-dashboard';
    return '/author-dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result && result.success) {
        const dashboardPath = getDashboardPath(result?.user?.role);
        navigate(from || dashboardPath, { replace: true });
      } else {
        setError(result?.error || 'Failed to sign in. Please check your credentials.');
      }
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
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
    } finally {
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
            <h2>Welcome back to the world's engineering research community.</h2>
            <ul className="auth-visual-points">
              <li><span className="dot" /> Track every submission through peer review in real time</li>
              <li><span className="dot" /> Collaborate with reviewers and editors on one platform</li>
              <li><span className="dot" /> Publish open-access research trusted by 500+ researchers</li>
            </ul>
          </div>
          <p className="auth-visual-foot">International Journal of Engineering Practices and Applications</p>
        </div>

        <div className="auth-panel">
          <div className="auth-card">
            <h1>Sign in to your account</h1>
            <p className="auth-subtitle">
              Access your research papers, reviews, and administrative tools.<br />
              New here? <Link to="/register">Create a free account</Link>
            </p>

            {contextMessage && !error && <Alert type="info" message={contextMessage} />}
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                  placeholder="you@institution.edu"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingRight: 66 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', color: 'var(--blue)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                {/* No self-service reset yet (the backend sends no email); the editorial office resets passwords. */}
                <a href="mailto:editor@ijepa.org?subject=Password%20reset%20request" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                  Forgot your password? Email editor@ijepa.org
                </a>
              </div>

              <button type="submit" disabled={loading} className="button button-primary" style={{ width: '100%' }}>
                {loading ? 'Signing In...' : 'Sign In →'}
              </button>
            </form>

            <div className="auth-divider">or continue with</div>

            <button onClick={handleGoogleLogin} className="button-google" disabled={loading}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                style={{ width: 18, height: 18 }}
              />
              Sign in with Google
            </button>

            <div className="auth-footer-link">
              Don't have an account? <Link to="/register">Sign up for free</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
