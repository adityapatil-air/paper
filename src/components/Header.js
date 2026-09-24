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
