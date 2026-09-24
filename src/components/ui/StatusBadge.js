import React from 'react';
import Icon from './Icon';

// One source of truth for paper status presentation (label + colour + icon).
export const STATUS_META = {
  submitted: { label: 'Submitted', tone: 'submitted', icon: 'send' },
  under_review: { label: 'Under review', tone: 'review', icon: 'clock' },
  revisions_requested: { label: 'Revision requested', tone: 'revision', icon: 'edit' },
  accepted: { label: 'Accepted', tone: 'accepted', icon: 'check' },
  rejected: { label: 'Rejected', tone: 'rejected', icon: 'x' },
  published: { label: 'Published', tone: 'published', icon: 'globe' },
};

export const statusLabel = (status) =>
  STATUS_META[status]?.label || String(status || 'Unknown').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const Badge = ({ tone = 'neutral', icon, children, className = '' }) => (
  <span className={`badge badge-${tone} ${className}`}>
    {icon && <Icon name={icon} size={13} strokeWidth={2.2} />}
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { tone: 'neutral', icon: 'info' };
  return <Badge tone={meta.tone} icon={meta.icon}>{statusLabel(status)}</Badge>;
};

export default StatusBadge;
