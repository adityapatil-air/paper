import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    affiliation: '',
    department: '',
    role: 'author' // Default role
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
    if (!formData.role) {
      setError('Please select a role');
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
        const role = userData.role;
        if (role === 'reviewer') {
          navigate('/reviewer-dashboard');
        } else if (role === 'admin' || role === 'editor') {
          navigate('/admin-dashboard');
        } else {
          navigate('/author-dashboard');
        }
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
      // Redirects to Google; Supabase will bring the user back to your site
      await loginWithGoogle();
    } catch (err) {
      setError('Google sign-in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-academic-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo only */}
        <div className="flex justify-center mb-2">
           <img
    src="/logo1 (2).png"
    alt="Right Logo"
    className="w-48 h-48 object-contain"
  />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-academic-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-academic-600">
          Or{' '}
          <Link
            to="/login"
            className="font-medium text-amber-700 hover:text-amber-800"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <Alert type="error" message={error} onClose={() => setError('')} />
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="affiliation" className="label">
                Affiliation
              </label>
              <input
                id="affiliation"
                name="affiliation"
                type="text"
                required
                value={formData.affiliation}
                onChange={handleChange}
                className="input-field"
                placeholder="University, Institution, or Organization"
              />
            </div>

            <div>
              <label htmlFor="department" className="label">
                Department
              </label>
              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                className="input-field"
                placeholder="Department or Field of Study"
              />
            </div>

            <div>
              <label htmlFor="role" className="label">
                Register As
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="author">Author</option>
                <option value="reviewer">Reviewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field"
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-amber-700 border-academic-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-academic-900">
                I agree to the{' '}
                <a href="/terms-of-service" className="text-amber-700 hover:text-amber-800">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy-policy" className="text-amber-700 hover:text-amber-800">
                  Privacy Policy
                </a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="button w-full justify-center"
              >
                {loading ? (
                  <p className="flex items-center justify-center gap-2 text-sm">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <span>Creating Account...</span>
                  </p>
                ) : (
                  <p>Create Account</p>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-academic-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-academic-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-in */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-academic-300 rounded-md shadow-sm bg-white text-sm font-medium text-academic-700 hover:bg-academic-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-academic-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-academic-500">Note</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-academic-600">
                By registering, you will be able to submit research papers for review.
                Your account will be created as an {formData.role}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
