import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <span aria-hidden="true">in</span><span aria-hidden="true">𝕏</span><span aria-hidden="true">f</span>
        </div>
      </div>

      <div className="main-nav-wrap">
        <Link to="/" className="journal-brand" onClick={closeMenu}>
          <img src={logo} alt="IJEPA" />
          <span className="brand-acronym">IJEPA</span>
        </Link>
        <button className="menu-button" type="button" aria-label="Toggle navigation" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '×' : '☰'}
        </button>
        <nav className={`primary-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={closeMenu}>Home</Link>
          {navLinks.map((link) => <Link key={link.to} to={link.to} className={location.pathname === link.to ? 'active' : ''} onClick={closeMenu}>{link.label}</Link>)}
          <Link to="/submitform" className="nav-submit" onClick={closeMenu}>Submit Manuscript</Link>
          {user && <Link to={dashboardPath} className={location.pathname.includes('dashboard') ? 'active' : ''} onClick={closeMenu}>Dashboard</Link>}
          <Link to="/papers" className="search-link" aria-label="Browse papers" onClick={closeMenu}>⌕</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
