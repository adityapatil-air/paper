import React from 'react';

// Inline spinner for buttons; page-level loading uses skeletons instead.
const Spinner = ({ size = 'sm', label }) => (
  <span className={`spinner-inline spinner-${size}`} role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
);

export default Spinner;
