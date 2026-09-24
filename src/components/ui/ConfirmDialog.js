import React from 'react';
import Modal from './Modal';
import Icon from './Icon';
import Spinner from './Spinner';

// Styled replacement for window.confirm. `tone="danger"` for destructive actions.
const ConfirmDialog = ({
  open,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  busyLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    tone={tone}
    closeDisabled={busy}
    footer={(
      <>
        <button type="button" className="button button-ghost" onClick={onCancel} disabled={busy} data-autofocus={tone === 'danger' ? true : undefined}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${tone === 'danger' ? 'button-danger' : 'button-primary'}`}
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
          aria-busy={busy || undefined}
        >
          {busy && <Spinner size="sm" />}
          {busy ? (busyLabel || `${confirmLabel}…`) : confirmLabel}
        </button>
      </>
    )}
  >
    <div className="confirm-body">
      <span className={`confirm-icon confirm-icon-${tone}`} aria-hidden="true">
        <Icon name={tone === 'danger' ? 'alert' : 'info'} size={22} />
      </span>
      <div className="confirm-copy">
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
