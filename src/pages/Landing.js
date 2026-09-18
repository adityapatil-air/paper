import React, { useState, useEffect } from 'react';
import { mockAPI } from '../data/mockData';
import hero from "../components/annie-spratt-5cFwQ-WMcJU-unsplash.jpg"
import rclient from '../assets/rclient.png'

// We will inject Roboto font for Landing page only
const Landing = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [searchTerm, setSearchTerm] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [selectedCategory, setSelectedCategory] = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadPublishedPapers();
  }, []);

  useEffect(() => {
    filterPapers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papers, searchTerm, selectedCategory]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPublishedPapers = async () => {
    try {
      setLoading(true);
      const publishedPapers = await mockAPI.getPublishedPapers();
      setPapers(publishedPapers);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPapers = () => {
    let filtered = papers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paper.authors.some(author => 
          author.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        paper.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(paper => paper.category === selectedCategory);
    }

    setFilteredPapers(filtered);
  };

  // eslint-disable-next-line no-unused-vars
  const categories = ['all', ...new Set(papers.map(paper => paper.category))];

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-slate-50 py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading published papers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        .landing-page-roboto { font-family: 'Roboto', sans-serif; }
      `}</style>
      <div className="bg-slate-50 landing-page-roboto">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${hero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        
      }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-primary-700 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-4000"></div>
        
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <span className="text-primary-200 text-sm font-medium">Trusted by 500+ Researchers Worldwide</span>
            
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Publish Your Research with
              <span className="block bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">IJEPA</span>
            
            </h1>
            
            <p className="text-xl md:text-2xl text-white mb-10 leading-relaxed max-w-3xl mx-auto">
              A seamless platform for authors, reviewers, and editors. Transparent workflows. 
              Trusted by researchers worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/papers"
                className="group bg-primary-600 text-white hover:bg-primary-700 font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Browse Papers...
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="/register"
                className="group border-2 border-white text-white hover:bg-white hover:text-slate-900 font-semibold py-4 px-8 rounded-xl transition-all duration-300 hover:-translate-y-1"
              >
                  Join Our Platform
              </a>
            </div>
          </div>
        </div>
      </section>
       <section className="py-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Main Content Box — matches all other pages */}
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">

      {/* Header */}
      <div className="text-center mb-10 pb-6 border-b border-slate-200">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          About <span className="text-amber-700">IJEPA</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Learn about our mission, vision, and global impact in engineering research.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <p className="text-slate-700 leading-relaxed text-justify mb-4">
              The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is a peer-reviewed, open-access journal dedicated to advancing research, innovation, and practical applications in the field of engineering. Our mission is to serve as a trusted platform for scholars, researchers, practitioners, and industry professionals to share knowledge, exchange ideas, and contribute to the progress of engineering science and technology.
            </p>
            <p className="text-slate-700 leading-relaxed text-justify">
              IJEPA publishes monthly high-quality original research papers, review articles, and case studies that address theoretical foundations, experimental investigations, and real-world applications across diverse engineering disciplines. We welcome interdisciplinary work that bridges the gap between academic research and industry practices, fostering solutions to contemporary challenges.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Our Vision
            </h3>
            <p className="text-slate-700 text-justify">
              To become a globally recognized journal that drives innovation, disseminates impactful research, and promotes collaboration across engineering domains.
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Our Scope
            </h3>
            <p className="text-slate-700 mb-3 text-justify">
              IJEPA covers, but is not limited to, the following areas:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-justify">
              <li>Civil, Mechanical, Electrical, and Electronics Engineering</li>
              <li>Computer Science, Information Technology, and Artificial Intelligence</li>
              <li>Industrial, Manufacturing, and Materials Engineering</li>
              <li>Communication, Control, and Instrumentation Systems</li>
              <li>Sustainable, Green, and Emerging Engineering Practices</li>
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <img
              src={rclient}
              alt="Client"
              className="w-full h-auto rounded-lg"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Important Dates Section */}
      

      {/* Search and Filter Section */}
      
      

      <div className="max-w-7xl mx-auto px-6">
      <section>
  <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
    <div className="text-center mb-10">
  <h3 className="text-4xl font-extrabold text-slate-900">
    Why Publish with <span className="text-primary-700">IJEPA ?</span>
  </h3>

  <div className="mt-2 flex justify-center">
    <div className="w-24 h-1 bg-primary-700 rounded-full"></div>
  </div>
</div>


    <div className="space-y-6">
      <ul className="space-y-2 text-slate-700">
        <li className="flex items-start">
          <span className="text-green-600 mr-2">•</span>
          <span>Peer-reviewed and high-quality publications</span>
        </li>
        <li className="flex items-start">
          <span className="text-green-600 mr-2">•</span>
          <span>Open access for global visibility and readership</span>
        </li>
        <li className="flex items-start">
          <span className="text-green-600 mr-2">•</span>
          <span>Rapid and transparent review process</span>
        </li>
        <li className="flex items-start">
          <span className="text-green-600 mr-2">•</span>
          <span>International editorial and reviewer panel</span>
        </li>
        <li className="flex items-start">
          <span className="text-green-600 mr-2">•</span>
          <span>Opportunities for academic recognition and collaboration</span>
        </li>
      </ul>
    </div>
  </div>

  <p className="mt-8 text-center text-lg italic text-slate-600">
    "At IJEPA, we believe that engineering is not just about knowledge creation but also about meaningful application. 
    By connecting research with practice, we aim to contribute to technological growth and societal development."
  </p>

</section>
</div>


      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl z-50"
          aria-label="Scroll to top"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  </>
);
};
export default Landing;