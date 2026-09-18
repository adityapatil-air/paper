import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PaperCard = ({ paper, showActions = false, onAction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'under_review':
        return 'Under Review';
      case 'submitted':
        return 'Submitted';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-academic-200 p-6 hover:shadow-md transition-all duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-academic-900 line-clamp-2 leading-tight transition-colors duration-200 hover:text-primary-600 cursor-pointer group-hover:underline">
          {paper.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${getStatusColor(paper.status)} ${isHovered ? 'scale-105' : ''} whitespace-nowrap`}>
            {getStatusText(paper.status)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={`p-2 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isLiked ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-academic-400 hover:text-red-400 hover:bg-academic-50'
            }`}
            aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
          >
            {isLiked ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-start">
          <span className="font-medium text-academic-700 text-sm w-20 shrink-0">Authors:</span>
          <span className="text-sm text-academic-600">{paper.authors.join(', ')}</span>
        </div>
        <div className="flex items-start">
          <span className="font-medium text-academic-700 text-sm w-20 shrink-0">Category:</span>
          <span className="text-sm text-academic-600">{paper.category}</span>
        </div>
        {paper.doi && (
          <div className="flex items-start">
            <span className="font-medium text-academic-700 text-sm w-20 shrink-0">DOI:</span>
            <span className="text-sm text-primary-600 font-mono hover:text-primary-700 transition-colors duration-200 cursor-pointer">
              {paper.doi}
            </span>
          </div>
        )}
      </div>

      <div className="mb-5">
        <p className="text-academic-700 text-sm leading-relaxed line-clamp-3">
          {paper.abstract}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {paper.keywords.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-academic-100 text-academic-700 text-xs rounded-full font-medium transition-all duration-200 hover:bg-primary-100 hover:text-primary-700 hover:scale-105 cursor-pointer border border-academic-200 hover:border-primary-300"
            title={`Click to search for "${keyword}"`}
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="pt-4 border-t border-academic-100">
        <div className="flex flex-wrap justify-between items-center text-xs text-academic-500">
          <div className="mb-2 md:mb-0">
            <span className="font-medium">Submitted:</span> <time dateTime={paper.submissionDate}>{new Date(paper.submissionDate).toLocaleDateString()}</time>
          </div>
          {paper.publicationDate && (
            <div className="mb-2 md:mb-0">
              <span className="font-medium">Published:</span> <time dateTime={paper.publicationDate}>{new Date(paper.publicationDate).toLocaleDateString()}</time>
            </div>
          )}
          {paper.citationCount !== undefined && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="font-medium">Citations:</span> {paper.citationCount}
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-5 pt-5 border-t border-academic-200">
          <div className="flex space-x-3">
            <button
              onClick={() => onAction('view', paper)}
              className="flex-1 py-2 px-4 bg-academic-200 hover:bg-academic-300 text-academic-700 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-academic-500 focus:ring-offset-2 text-sm"
            >
              View Details
            </button>
            {paper.status === 'submitted' && (
              <button
                onClick={() => onAction('review', paper)}
                className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-sm"
              >
                Start Review
              </button>
            )}
          </div>
        </div>
      )}

      {paper.status === 'published' && (
        <div className="mt-5 pt-5 border-t border-academic-200">
          <Link
            to={`/paper/${paper.id}`}
            className="block w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-sm"
          >
            View Full Paper
          </Link>
        </div>
      )}
    </div>
  );
};

export default PaperCard;
