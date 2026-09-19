import React from 'react';

const Indexing = () => {
  const currentIndexing = [
    {
      name: 'Google Scholar',
      description: 'Global academic search engine',
      imageUrl: 'https://scholar.google.com/favicon.ico'
    },
    {
      name: 'CrossRef',
      description: 'DOI registration agency',
      imageUrl: 'https://www.crossref.org/favicon.ico'
    },
    {
      name: 'ResearchGate',
      description: 'Research networking platform',
      imageUrl: 'https://www.researchgate.net/favicon.ico'
    },
    {
      name: 'Academia.edu',
      description: 'Academic sharing platform',
      imageUrl: 'https://www.academia.edu/favicon.ico'
    },
    {
      name: 'Semantic Scholar',
      description: 'AI-powered research discovery',
      imageUrl: 'https://www.semanticscholar.org/favicon.ico'
    },
    {
      name: 'BASE',
      description: 'Bielefeld Academic Search Engine',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/BASE_search_engine_logo.svg'
    },
  ];

  return (
    <div className="indexing-page">
      <section className="page-banner">
        <div className="journal-container">
          <p className="breadcrumb">Home / Indexing &amp; Abstracting</p>
          <p className="eyebrow">GLOBAL VISIBILITY</p>
          <h1>Indexing &amp; Abstracting</h1>
          <p>Enhancing global visibility and impact of your research through strategic database partnerships.</p>
        </div>
      </section>

      <div className="page-body journal-container">
        <p>
          The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is committed to increasing the visibility, accessibility, and citation of published research. To achieve this, we actively pursue indexing in leading academic and research databases.
        </p>

        <h2>Currently Indexed In</h2>
        <div className="indexing-grid">
          {currentIndexing.map((item, index) => (
            <div key={index} className="indexing-item">
              <img
                src={item.imageUrl}
                alt={item.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <h2>Indexing in Progress</h2>
        <div className="page-card">
          <p>The editorial team is in the process of applying for inclusion in:</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Scopus</li>
            <li>Web of Science (ESCI)</li>
            <li>DOAJ (Directory of Open Access Journals)</li>
            <li>EBSCO</li>
            <li>ProQuest</li>
            <li>UGC-CARE (for Indian recognition)</li>
          </ul>
        </div>

        <h2>Why Indexing Matters</h2>
        <div className="page-card">
          <ul style={{ marginBottom: 0 }}>
            <li>Greater visibility and global readership for published papers</li>
            <li>Increased citations and academic recognition for authors</li>
            <li>Long-term preservation and accessibility of research</li>
            <li>Compliance with academic and institutional requirements for quality publications</li>
          </ul>
        </div>

        <h2>DOIs &amp; CrossRef Membership</h2>
        <div className="page-card">
          <p style={{ margin: 0 }}>
            Each article published in IJEPA is assigned a unique <strong>Digital Object Identifier (DOI)</strong>, ensuring permanent online availability, reliable citation tracking, and integration with global scholarly infrastructure through our CrossRef membership.
          </p>
        </div>

        <h2>Our Commitment</h2>
        <p>
          We are continuously working to expand our indexing coverage so that IJEPA remains a trusted platform for impactful engineering research.
        </p>
        <a href="/contact-us" className="button button-primary button-small">Contact Editorial Office</a>
      </div>
    </div>
  );
};

export default Indexing;
