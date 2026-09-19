import React from 'react';

const AboutUs = () => {
  return (
    <div className="about-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / About Us</p>
          <p className="eyebrow">ABOUT THE JOURNAL</p>
          <h1>About Us</h1>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is a peer-reviewed,
          open-access journal dedicated to advancing research, innovation, and practical applications in the field of
          engineering. Our mission is to serve as a trusted platform for scholars, researchers, practitioners, and
          industry professionals to share knowledge, exchange ideas, and contribute to the progress of engineering
          science and technology.
        </p>

        <p>
          IJEPA publishes monthly high-quality original research papers, review articles, and case studies that address
          theoretical foundations, experimental investigations, and real-world applications across diverse engineering
          disciplines. We actively encourage interdisciplinary research that bridges the gap between academic innovation
          and industry practices, fostering solutions to contemporary engineering challenges.
        </p>

        <h2>Journal Information</h2>
        <div className="info-grid">
          <div className="info-tile"><strong>Starting Year:</strong> 2026</div>
          <div className="info-tile"><strong>Frequency:</strong> Monthly</div>
          <div className="info-tile"><strong>Format:</strong> Online</div>
          <div className="info-tile"><strong>Subject Area:</strong> Engineering</div>
          <div className="info-tile" style={{ gridColumn: '1 / -1' }}><strong>Language of Publication:</strong> English</div>
        </div>

        <h2>Publisher Details</h2>
        <div className="page-card">
          <p style={{ margin: 0 }}><strong>Publisher Name:</strong> BuildSoftTech Publication</p>
          <p style={{ margin: '8px 0 0' }}><strong>Address:</strong> Shop No 2, Snehankit Colony, Karve Nagar, Pune-411052, Maharashtra, India</p>
        </div>

        <h2>Our Vision</h2>
        <div className="page-card">
          <p style={{ margin: 0 }}>
            To become a globally recognized platform for publishing impactful engineering research that drives
            innovation, supports sustainable development, and enhances collaboration between academia and industry.
          </p>
        </div>

        <h2>Our Scope</h2>
        <div className="page-card">
          <p>The journal covers (but is not limited to):</p>
          <ul>
            <li>Mechanical Engineering</li>
            <li>Civil Engineering</li>
            <li>Electrical &amp; Electronics Engineering</li>
            <li>Computer Science &amp; IT</li>
            <li>Artificial Intelligence &amp; Data Science</li>
            <li>Interdisciplinary Engineering Applications</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
