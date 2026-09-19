import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizePx = {
    sm: 16,
    md: 32,
    lg: 48,
  };

  const dim = sizePx[size] || sizePx.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div className="spinner-ring" style={{ width: dim, height: dim }} />
      {text && (
        <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
