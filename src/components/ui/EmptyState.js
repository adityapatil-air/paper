import React from 'react';

const Illustration = ({ variant }) => (
  <svg className="empty-illustration" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="108" rx="54" ry="7" className="ei-shadow" />
    {variant === 'search' ? (
      <>
        <rect x="34" y="18" width="70" height="84" rx="8" className="ei-paper" />
        <path d="M46 36h46M46 48h36M46 60h42" className="ei-line" />
        <circle cx="104" cy="72" r="20" className="ei-lens" />
        <path d="m118 86 16 16" className="ei-handle" />
      </>
    ) : variant === 'review' ? (
      <>
        <rect x="42" y="14" width="76" height="90" rx="8" className="ei-paper" />
        <path d="M56 34h48M56 46h40M56 58h44" className="ei-line" />
        <circle cx="112" cy="84" r="17" className="ei-badge" />
        <path d="m104 84 6 6 10-11" className="ei-check" />
      </>
    ) : (
      <>
        <rect x="52" y="10" width="64" height="80" rx="8" className="ei-paper ei-back" />
        <rect x="40" y="22" width="68" height="82" rx="8" className="ei-paper" />
        <path d="M52 42h44M52 54h36M52 66h40" className="ei-line" />
        <circle cx="108" cy="88" r="16" className="ei-badge" />
        <path d="M108 81v14M101 88h14" className="ei-check" />
      </>
    )}
  </svg>
);

const EmptyState = ({ title, children, action, variant = 'docs', compact = false }) => (
  <div className={`empty-panel${compact ? ' is-compact' : ''}`}>
    <Illustration variant={variant} />
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action && <div className="empty-panel-action">{action}</div>}
  </div>
);

export default EmptyState;
