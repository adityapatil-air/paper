import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from './ui/Icon';
import logo from '../assets/logo.png';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  // Escape closes the mobile menu and returns focus to its button.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const navLinks = [
    { to: '/about-us', label: 'About Us' },
    { to: '/indexing', label: 'Indexing' },
    { to: '/journal-issues', label: 'Journal Issues' },
    { to: '/author-guidelines', label: 'For Authors' },
    { to: '/callforpapers', label: 'Call for Papers' },
    { to: '/joinusedito', label: 'Join Us' },
    { to: '/editorial-board', label: 'Editorial Board' },
    { to: '/contact-us', label: 'Contact' },
  ];

  const dashboardPath = user?.role === 'author'
    ? '/author-dashboard'
    : user?.role === 'reviewer'
      ? '/reviewer-dashboard'
      : '/admin-dashboard';

  const closeMenu = () => setIsMenuOpen(false);
  const handleLogout = () => {
    logout();
    navigate('/');
    closeMenu();
  };

  return (
    <header className="site-header">
      <div className="institutional-bar">
        <div>International Peer-Reviewed Open Access Journal <span className="institutional-extra">&nbsp;|&nbsp; Published by Buildsoftech Publication &nbsp;|&nbsp; ISSN: 3139-5961</span></div>
        <div className="institutional-links">
          {user ? <button onClick={handleLogout}>Logout</button> : <><Link to="/login">Login</Link><span>|</span><Link to="/register">Register</Link></>}
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z"/></svg></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M18.9 1.75h3.68l-8.04 9.19L24 22.25h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.75h7.6l5.24 6.93 6.06-6.93zm-1.3 18.34h2.04L6.5 3.8H4.3l13.3 16.29z"/></svg></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg></a>
        </div>
      </div>

      <div className="main-nav-wrap">
        <Link to="/" className="journal-brand" onClick={closeMenu}>
          <img src={logo} alt="IJEPA" />
          <span className="brand-acronym">IJEPA</span>
        </Link>
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-nav"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Icon name={isMenuOpen ? 'x' : 'menu'} size={26} />
        </button>
        <nav id="primary-nav" className={`primary-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={closeMenu}>Home</Link>
          {navLinks.map((link) => <Link key={link.to} to={link.to} className={location.pathname === link.to ? 'active' : ''} onClick={closeMenu}>{link.label}</Link>)}
          <Link to="/submitform" className="nav-submit" onClick={closeMenu}>Submit Manuscript</Link>
          {user && <Link to={dashboardPath} className={location.pathname.includes('dashboard') ? 'active' : ''} onClick={closeMenu}>Dashboard</Link>}
          <Link to="/papers" className="search-link" aria-label="Search and browse papers" title="Search and browse papers" onClick={closeMenu}>⌕</Link>
          <div className="mobile-auth-links">
            {user
              ? <button onClick={handleLogout}>Logout</button>
              : <><Link to="/login" onClick={closeMenu}>Login</Link><Link to="/register" onClick={closeMenu}>Register</Link></>}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
