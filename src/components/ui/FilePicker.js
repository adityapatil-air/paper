import React, { useRef, useState } from 'react';
import Icon from './Icon';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extOf = (name) => {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

// Compact drag-and-drop file field used in dashboard modals.
const FilePicker = ({
  id,
  label,
  optional = false,
  extensions = ['pdf'],
  maxBytes = 20 * 1024 * 1024,
  file,
  onChange,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const formats = extensions.map((e) => e.toUpperCase()).join(', ');
  const maxLabel = `${Math.round(maxBytes / (1024 * 1024))} MB`;

  const accept = (f) => {
    if (!f) return;
    if (!extensions.includes(extOf(f.name))) {
      setError(`“${f.name}” isn't supported. Choose a ${formats} file.`);
      return;
    }
    if (f.size > maxBytes) {
      setError(`“${f.name}” is ${formatBytes(f.size)}. The limit is ${maxLabel}.`);
      return;
    }
    setError('');
    onChange(f);
  };

  const dropHandlers = disabled ? {} : {
    onDragEnter: (e) => { e.preventDefault(); depth.current += 1; setDragging(true); },
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (e) => { e.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); },
    onDrop: (e) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 1) { setError('Drop a single file.'); return; }
      accept(files[0]);
    },
  };

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <div className="field-label">
        <span className="label-text" id={`${id}-label`}>
          {label}{optional ? <span className="optional">(optional)</span> : <span className="req" aria-hidden="true">*</span>}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={extensions.map((e) => `.${e}`).join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { accept(e.target.files && e.target.files[0]); e.target.value = ''; }}
      />
      <div {...dropHandlers}>
        {file ? (
          <div className={`file-card${dragging ? ' is-dragging' : ''}`}>
            <span className={`file-type${extOf(file.name) === 'pdf' ? ' is-pdf' : ''}`} aria-hidden="true">{extOf(file.name).toUpperCase()}</span>
            <div className="file-info">
              <strong title={file.name}>{file.name}</strong>
              <span>{formatBytes(file.size)}</span>
            </div>
            <div className="file-actions">
              <button type="button" className="icon-btn" onClick={() => inputRef.current?.click()} disabled={disabled}>
                <Icon name="refresh" size={15} /> Replace
              </button>
              <button type="button" className="icon-btn icon-btn-danger" onClick={() => { onChange(null); setError(''); }} disabled={disabled} aria-label={`Remove ${file.name}`}>
                <Icon name="trash" size={15} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}${error ? ' is-invalid' : ''}`}
            onClick={(e) => { if (!disabled && !e.target.closest('button')) inputRef.current?.click(); }}
            role="presentation"
          >
            <span className="dropzone-icon" aria-hidden="true"><Icon name="upload" size={22} /></span>
            <p className="dropzone-title">
              {dragging ? 'Drop to attach' : <>Drag &amp; drop, or{' '}
                <button
                  type="button"
                  id={id}
                  className="link-btn"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled}
                  aria-describedby={[`${id}-label`, hintId, error ? errorId : null].filter(Boolean).join(' ')}
                >
                  browse files
                </button></>}
            </p>
            <p className="dropzone-hint" id={hintId}>{formats} · up to {maxLabel}</p>
          </div>
        )}
      </div>
      {error && <p className="field-error" id={errorId} role="alert"><Icon name="alert" size={15} />{error}</p>}
    </div>
  );
};

export default FilePicker;
