import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';
import logo2 from '../assets/build.png';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navLinks = [
    { to: '/about-us', label: 'About Us' },
    { to: '/indexing', label: 'Indexing' },
    { to: '/journal-issues', label: 'Journal Issues' },
    { to: '/author-guidelines', label: 'Author Guidelines' },
    { to: '/callforpapers', label: 'Call for Papers' },
    { to: '/joinusedito', label: 'Join Us' },
    { to: '/editorial-board', label: 'Editorial Board' },
    { to: '/contact-us', label: 'Contact Us' },
  ];

  return (
    <>
      {/* Desktop Header */}
      <div className="hidden md:block">
        {/* Top banner with logo and journal info */}
        <header className="bg-white py-3 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="flex items-center justify-center space-x-4">
              <Link to="/" className="flex-shrink-0">
                <img
                  src={logo}
                  alt="Research Platform Logo"
                  className="w-20 h-20 object-contain"
                />
              </Link>
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                  International Journal of Engineering Practices and Applications
                </h1>
                <p className="text-sm text-slate-600 mt-1">Publication by Buildsoftech Publication</p>
                <p className="text-sm font-medium text-slate-600 mt-1">ISSN: 3139-5961</p>
              </div>
              <Link to="/" className="flex-shrink-0">
                <img
                  src={logo2}
                  alt="Research Platform Logo"
                  className="w-20 h-20 object-contain"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Centered Navigation */}
        <nav className="bg-slate-800 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Centered nav links */}
              <div className="flex-1 flex justify-center">
                <div className="flex flex-wrap justify-center gap-x-1 gap-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors duration-200 relative group"
                    >
                      <span className="relative z-10">{link.label}</span>
                      {/* Underline effect */}
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    </Link>
                  ))}
                  {user && (
                    <Link
                      to={
                        user.role === 'author'
                          ? '/author-dashboard'
                          : user.role === 'reviewer'
                            ? '/reviewer-dashboard'
                            : '/admin-dashboard'
                      }
                      className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors duration-200 relative group"
                    >
                      <span className="relative z-10">Dashboard</span>
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Auth buttons */}
              <div className="flex items-center space-x-2">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors duration-200"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-slate-300 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 md:hidden sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              <span className="font-bold text-slate-800 text-lg">IJEPA</span>
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 top-16 bg-white z-40 overflow-y-auto pt-4 pb-6 px-4 border-t">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-4 py-3 text-base font-medium text-slate-700 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link
                  to={
                    user.role === 'author'
                      ? '/author-dashboard'
                      : user.role === 'reviewer'
                        ? '/reviewer-dashboard'
                        : '/admin-dashboard'
                  }
                  className="block px-4 py-3 text-base font-medium text-slate-700 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              {user ? (
                <>
                  <div className="px-4 text-sm text-slate-600">
                    Signed in as <span className="font-medium text-slate-800">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="block w-full px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full px-4 py-3 text-base font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg text-center transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;