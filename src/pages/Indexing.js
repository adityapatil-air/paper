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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Content Box — identical to AuthorGuidelines */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 print:p-6">
          
          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b border-slate-200">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Indexing & <span className="text-amber-700">Abstracting</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enhancing global visibility and impact of your research through strategic database partnerships.
            </p>
          </div>

          {/* Introduction */}
          <p className="text-slate-700 mb-8 leading-relaxed text-justify">
            The <strong>International Journal of Engineering Practices and Applications (IJEPA)</strong> is committed to increasing the visibility, accessibility, and citation of published research. To achieve this, we actively pursue indexing in leading academic and research databases.
          </p>

          {/* Currently Indexed */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Currently Indexed In
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {currentIndexing.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                    <p className="text-slate-600 text-sm mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Indexing in Progress */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Indexing in Progress
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed text-justify">
              The editorial team is in the process of applying for inclusion in:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-justify">
              <li>Scopus</li>
              <li>Web of Science (ESCI)</li>
              <li>DOAJ (Directory of Open Access Journals)</li>
              <li>EBSCO</li>
              <li>ProQuest</li>
              <li>UGC-CARE (for Indian recognition)</li>
            </ul>
          </section>

          {/* Why Indexing Matters */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Why Indexing Matters
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-justify">
              <li>Greater visibility and global readership for published papers</li>
              <li>Increased citations and academic recognition for authors</li>
              <li>Long-term preservation and accessibility of research</li>
              <li>Compliance with academic and institutional requirements for quality publications</li>
            </ul>
          </section>

          {/* DOI & CrossRef */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              DOIs & CrossRef Membership
            </h2>
            <p className="text-slate-700 leading-relaxed text-justify">
              Each article published in IJEPA is assigned a unique <strong>Digital Object Identifier (DOI)</strong>, ensuring permanent online availability, reliable citation tracking, and integration with global scholarly infrastructure through our CrossRef membership.
            </p>
          </section>

          {/* Commitment */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Our Commitment
            </h2>
            <p className="text-slate-700 leading-relaxed text-justify">
              We are continuously working to expand our indexing coverage so that IJEPA remains a trusted platform for impactful engineering research.
            </p>
            <div className="mt-4">
              <a
                href="/contact-us"
                className="inline-flex items-center px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Contact Editorial Office
              </a>
            </div>
          </section>

        </div>
      </div>
     
    </div>
  );
};

export default Indexing;