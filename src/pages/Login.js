import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';

const Login = () => {
  const { login, loginWithGoogle } = useAuth(); // ✅ assuming you have Google login in AuthContext
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || null;

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

  // ✅ Demo login buttons
  // eslint-disable-next-line no-unused-vars
  const handleDemoLogin = async (role) => {
    setError('');
    setLoading(true);
    try {
      let creds;
      if (role === 'admin') {
        creds = { email: 'admin@example.com', password: 'password123' };
      } else if (role === 'reviewer') {
        creds = { email: 'reviewer@example.com', password: 'password123' };
      } else {
        creds = { email: 'author@example.com', password: 'password123' };
      }

      const result = await login(creds.email, creds.password);
      if (result && result.success) {
        const dashboardPath = getDashboardPath(result?.user?.role);
        navigate(dashboardPath, { replace: true });
      } else {
        setError(result?.error || 'Demo login failed.');
      }
    } catch (err) {
      setError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google login
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
    <div className="min-h-full bg-academic-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-2">
           <img
    src="/logo1 (2).png"
    alt="Right Logo"
    className="w-48 h-48 object-contain"
  />
        </div>

        <h2 className="mt-2 text-center text-3xl font-extrabold text-academic-900 leading-tight">
          Sign in to your account
        </h2>
        <p className="mt-4 text-center text-base text-academic-600">
          Access your research papers, reviews, and administrative tools
        </p>
        <p className="mt-2 text-center text-sm text-academic-600">
          Or{' '}
          <Link
            to="/register"
            className="font-medium text-amber-700 hover:text-amber-800 transition-colors duration-200"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          {error && <Alert type="error" message={error} />}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-academic-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-academic-300 rounded-md shadow-sm placeholder-academic-400 focus:outline-none focus:ring-amber-700 focus:border-amber-700 sm:text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-academic-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-academic-300 rounded-md shadow-sm placeholder-academic-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="button w-full justify-center"
              >
                {loading ? (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <span>Signing In...</span>
                  </p>
                ) : (
                  <p>Sign In</p>
                )}
              </button>
            </div>
          </form>

          {/* Forgot password */}
          <div className="mt-6 flex items-center justify-center">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Forgot your password?
            </Link>
          </div>

          {/* ✅ Google Sign-in */}
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-academic-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5 mr-2"
              />
              Sign in with Google
            </button>
          </div>

          {/* ✅ Demo login buttons */}
         
        </div>
      </div>
    </div>
  );
};

export default Login;
