import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const ToastContext = createContext(null);

const ICONS = { success: 'checkCircle', error: 'xCircle', warning: 'alert', info: 'info' };
const DURATION = { success: 4500, info: 4500, warning: 6000, error: 7000 };

const ToastItem = ({ toast, onDismiss }) => {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => onDismiss(toast.id), DURATION[toast.type] || 5000);
    return () => clearTimeout(t);
  }, [paused, toast, onDismiss]);

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-icon" aria-hidden="true"><Icon name={ICONS[toast.type] || 'info'} size={20} /></span>
      <div className="toast-copy">
        {toast.title && <strong>{toast.title}</strong>}
        <p>{toast.message}</p>
      </div>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const show = useCallback((type, message, options = {}) => {
    if (!message) return null;
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, type, message, title: options.title }]);
    return id;
  }, []);

  const api = useMemo(() => ({
    show,
    dismiss,
    success: (m, o) => show('success', m, o),
    error: (m, o) => show('error', m, o),
    info: (m, o) => show('info', m, o),
    warning: (m, o) => show('warning', m, o),
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
