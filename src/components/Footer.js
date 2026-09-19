import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-grid journal-container">
      <div className="footer-about">
        <div className="footer-brand"><img src={logo} alt="IJEPA" /><strong>IJEPA</strong></div>
        <p>International Journal of Engineering Practices and Applications — advancing research, innovation, and practical applications in engineering.</p>
        <p className="footer-publisher">Published by Buildsoftech Publication</p>
      </div>
      <div><h3>Quick Links</h3><Link to="/">Home</Link><Link to="/about-us">About Us</Link><Link to="/editorial-board">Editorial Board</Link><Link to="/journal-issues">Journal Issues</Link><Link to="/papers">Browse Papers</Link></div>
      <div><h3>For Authors</h3><Link to="/author-guidelines">Author Guidelines</Link><Link to="/submitform">Submit Manuscript</Link><Link to="/callforpapers">Call for Papers</Link><Link to="/joinusedito">Join Us</Link></div>
      <div><h3>Policies</h3><Link to="/indexing">Indexing & Abstracting</Link><Link to="/privacy-policy">Privacy Policy</Link><Link to="/terms-of-service">Terms of Service</Link><Link to="/contact-us">Contact Us</Link></div>
      <div><h3>Contact</h3><a href="mailto:editor@ijepa.org">editor@ijepa.org</a><span>+91 8149844901</span><span>Shop No 2, Snehankit Colony,<br />Karve Nagar, Pune, India</span>
        <div className="footer-social">
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z"/></svg></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.9 1.75h3.68l-8.04 9.19L24 22.25h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.75h7.6l5.24 6.93 6.06-6.93zm-1.3 18.34h2.04L6.5 3.8H4.3l13.3 16.29z"/></svg></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg></a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z"/></svg></a>
        </div>
      </div>
    </div>
    <div className="copyright journal-container"><span>© {new Date().getFullYear()} International Journal of Engineering Practices and Applications (IJEPA). All rights reserved.</span><span><Link to="/privacy-policy">Privacy Policy</Link> &nbsp; | &nbsp; <Link to="/terms-of-service">Terms & Conditions</Link></span></div>
  </footer>
);

export default Footer;
