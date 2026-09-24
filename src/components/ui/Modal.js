import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const FOCUSABLE_PARTS = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
];
const FOCUSABLE = FOCUSABLE_PARTS.join(',');
const BODY_FOCUSABLE = FOCUSABLE_PARTS.map((sel) => `.modal-panel-body ${sel}`).join(',');

// Modals can stack (e.g. a confirm dialog over a details dialog); only the top one handles Esc/Tab.
const stack = [];

const Modal = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  tone,
  children,
  footer,
  closeDisabled = false,
  initialFocusRef,
}) => {
  const panelRef = useRef(null);
  const tokenRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  const titleId = useId();
  const descId = useId();

  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    tokenRef.current = token;
    stack.push(token);
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = initialFocusRef?.current
        || panel.querySelector('[data-autofocus]')
        || panel.querySelector(BODY_FOCUSABLE)
        || panel.querySelector(FOCUSABLE)
        || panel;
      target.focus();
    };
    const focusTimer = setTimeout(focusFirst, 0);

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!closeDisabledRef.current) onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      const idx = stack.indexOf(token);
      if (idx >= 0) stack.splice(idx, 1);
      if (stack.length === 0) document.body.style.overflow = overflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        // The trigger was removed (e.g. a deleted row): fall back to the dialog underneath, if any.
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs[dialogs.length - 1]?.focus();
      }
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget && !closeDisabled) onClose?.();
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={panelRef}
        className={`modal-panel modal-${size}${tone ? ` modal-tone-${tone}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <div className="modal-panel-header">
          <div className="modal-heading">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="modal-panel-close"
            aria-label="Close dialog"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="modal-panel-body">{children}</div>
        {footer && <div className="modal-panel-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
