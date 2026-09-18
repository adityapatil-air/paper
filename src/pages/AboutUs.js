import React from 'react';

const AboutUs = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-slate-800">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-10 pb-6 border-b border-slate-200">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            About <span className="text-amber-700">Us</span>
          </h1>
        </div>

        <p className="text-slate-700 leading-relaxed text-justify">
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is a peer-reviewed,
          open-access journal dedicated to advancing research, innovation, and practical applications in the field of
          engineering. Our mission is to serve as a trusted platform for scholars, researchers, practitioners, and
          industry professionals to share knowledge, exchange ideas, and contribute to the progress of engineering
          science and technology.
        </p>

        <p className="text-slate-700 leading-relaxed text-justify mt-5">
          IJEPA publishes monthly high-quality original research papers, review articles, and case studies that address
          theoretical foundations, experimental investigations, and real-world applications across diverse engineering
          disciplines. We actively encourage interdisciplinary research that bridges the gap between academic innovation
          and industry practices, fostering solutions to contemporary engineering challenges.
        </p>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Journal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Starting Year:</span> 2026</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Frequency:</span> Monthly</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Format:</span> Online</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Subject Area:</span> Engineering</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:col-span-2">
              <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Language of Publication:</span> English</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Publisher Details</h2>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <p className="text-slate-700"><span className="font-semibold text-slate-900">Publisher Name:</span> BuildSoftTech Publication</p>
            <p className="text-slate-700 mt-2"><span className="font-semibold text-slate-900">Address:</span> Shop No 2, Snehankit Colony, Karve Nagar, Pune-411052, Maharashtra, India</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Our Vision</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            To become a globally recognized platform for publishing impactful engineering research that drives
            innovation, supports sustainable development, and enhances collaboration between academia and industry.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Our Scope</h2>
          <p className="text-slate-700 mb-4">The journal covers (but is not limited to):</p>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li>Mechanical Engineering</li>
            <li>Civil Engineering</li>
            <li>Electrical &amp; Electronics Engineering</li>
            <li>Computer Science &amp; IT</li>
            <li>Artificial Intelligence &amp; Data Science</li>
            <li>Interdisciplinary Engineering Applications</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;