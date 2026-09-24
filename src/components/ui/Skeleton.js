import React from 'react';

export const Skeleton = ({ width, height = 14, radius, className = '' }) => (
  <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
);

export const SkeletonText = ({ lines = 3 }) => (
  <div className="skeleton-text" aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="skeleton-table" aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div className="skeleton-row" key={r} style={{ gridTemplateColumns: `2.4fr repeat(${cols - 1}, 1fr)` }}>
        {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} width={c === 0 ? '85%' : '70%'} />)}
      </div>
    ))}
  </div>
);

// Page-level placeholder that mirrors the dashboard layout (header, stat cards, list).
export const DashboardSkeleton = ({ stats = 4, label = 'Loading dashboard' }) => (
  <div className="dash-page" aria-busy="true">
    <div className="journal-container">
      <span className="sr-only" role="status">{label}…</span>
      <div className="dash-header" aria-hidden="true">
        <div className="skeleton-stack">
          <Skeleton width={110} height={12} />
          <Skeleton width={280} height={30} />
          <Skeleton width={360} height={14} />
        </div>
        <Skeleton width={170} height={44} radius={8} />
      </div>
      <div className={`stat-cards stat-cards-${stats}`} aria-hidden="true">
        {Array.from({ length: stats }).map((_, i) => (
          <div className="stat-card" key={i}>
            <Skeleton width={36} height={36} radius={10} />
            <div className="skeleton-stack">
              <Skeleton width={90} height={12} />
              <Skeleton width={48} height={26} />
            </div>
          </div>
        ))}
      </div>
      <div className="dash-panel" aria-hidden="true">
        <div className="skeleton-toolbar">
          <Skeleton width="45%" height={42} radius={8} />
          <Skeleton width={160} height={42} radius={8} />
        </div>
        <SkeletonTable />
      </div>
    </div>
  </div>
);

export default Skeleton;
