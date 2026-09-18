import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <div className="w-full h-full border-4 border-academic-200 border-t-primary-600 rounded-full"></div>
        </div>
        <div className={`${sizeClasses[size]} absolute top-0 left-0 animate-spin`} style={{animationDirection: 'reverse', animationDuration: '1.5s'}}>
          <div className="w-full h-full border-4 border-transparent border-r-primary-400 rounded-full"></div>
        </div>
      </div>
      {text && (
        <div className="text-center">
          <p className="text-sm text-academic-600 animate-pulse">{text}</p>
          <div className="flex space-x-1 mt-2 justify-center">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
