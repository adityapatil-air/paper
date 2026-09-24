import React from 'react';
import Icon from './ui/Icon';

const ICONS = { success: 'checkCircle', error: 'xCircle', warning: 'alert', info: 'info' };

const Alert = ({ type = 'info', title, message, children, onClose, className = '', id, tabIndex }) => (
  <div
    id={id}
    tabIndex={tabIndex}
    className={`alert alert-${type} ${className}`}
    role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
  >
    <span className="alert-icon" aria-hidden="true"><Icon name={ICONS[type] || 'info'} size={20} /></span>
    <div className="alert-copy">
      {title && <strong className="alert-title">{title}</strong>}
      {message && <p>{message}</p>}
      {children}
    </div>
    {onClose && (
      <button type="button" onClick={onClose} className="alert-close" aria-label="Dismiss">
        <Icon name="x" size={16} />
      </button>
    )}
  </div>
);

export default Alert;
