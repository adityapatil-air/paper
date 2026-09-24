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
        {/* Social profile links go here once the journal has real profiles; the old icons linked to platform home pages. */}

      </div>
    </div>
    <div className="copyright journal-container"><span>© {new Date().getFullYear()} International Journal of Engineering Practices and Applications (IJEPA). All rights reserved.</span><span><Link to="/privacy-policy">Privacy Policy</Link> &nbsp; | &nbsp; <Link to="/terms-of-service">Terms & Conditions</Link></span></div>
  </footer>
);

export default Footer;
