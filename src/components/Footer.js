import React from 'react';
import logo from '../assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-amber-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img
                src={logo}
                alt="IJEPA Logo"
                className="h-[60px] w-auto"
              />
              <span className="text-2xl font-bold tracking-tight">IJEPA</span>
            </div>
            <p className="text-academic-300 text-base leading-relaxed max-w-md">
              The International Journal of Engineering Practices and Applications –
              advancing research, innovation, and practical applications in engineering.
            </p>
          </div>



          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-5 pb-2 border-b border-academic-700">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/contact-us"
                  className="inline-flex items-center text-academic-300 hover:text-white transition-colors text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Us
                </a>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mt-0.5 mr-2 text-academic-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-academic-300 text-base">+91 8149844901</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mt-0.5 mr-2 text-academic-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-academic-300 text-base break-words">editor@ijepa.org</span>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold mb-5 pb-2 border-b border-academic-700">Address</h3>
            <p className="text-academic-300 text-base leading-relaxed">
             Address: Shop No 2, Snehankit Colony, Karve Nagar, Pune-411052, Maharashtra, India
            </p>
          </div>
        </div>

        <div className="border-t border-academic-700 mt-12 pt-8 text-center text-sm text-academic-400">
          <p>&copy; {new Date().getFullYear()} International Journal of Engineering Practices and Applications (IJEPA). All rights reserved & Designed By GIGZS.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;