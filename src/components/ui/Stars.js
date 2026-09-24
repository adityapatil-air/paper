import React from 'react';
import Icon from './Icon';

export const Stars = ({ rating = 0, max = 5 }) => (
  <span className="stars">
    <span className="sr-only">{`Rated ${rating} out of ${max}`}</span>
    {Array.from({ length: max }).map((_, i) => (
      <Icon key={i} name="star" size={16} className={i < rating ? 'is-on' : ''} />
    ))}
    <span className="stars-label" aria-hidden="true">{rating}/{max}</span>
  </span>
);

export const RECOMMENDATIONS = {
  accept: { label: 'Accept', tone: 'accepted' },
  accept_with_revisions: { label: 'Accept with minor revisions', tone: 'review' },
  // Stored value kept for existing reviews; it means "major revisions", not a rejection.
  reject_with_revisions: { label: 'Major revisions needed', tone: 'revision' },
  reject: { label: 'Reject', tone: 'rejected' },
};

export const recommendationLabel = (value) =>
  RECOMMENDATIONS[value]?.label || String(value || '—').replace(/_/g, ' ');

export default Stars;
