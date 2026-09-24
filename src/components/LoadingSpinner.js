import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => (
  <div className={`loading-spinner loading-spinner-${size}`} role="status">
    <div className="spinner-ring" aria-hidden="true" />
    {text ? <p>{text}</p> : <span className="sr-only">Loading</span>}
  </div>
);

export default LoadingSpinner;
