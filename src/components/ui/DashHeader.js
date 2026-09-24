import React from 'react';
import Icon from './Icon';

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

// Consistent logged-in page header: role eyebrow, greeting, supporting line and primary actions.
export const DashHeader = ({ role, user, title, subtitle, actions }) => (
  <header className="dash-header">
    <div className="dash-header-copy">
      {role && <p className="dash-role"><span className="dash-role-dot" aria-hidden="true" />{role}</p>}
      <h1>{title || (firstName(user?.name) && !String(user?.name).includes('@') ? `Welcome back, ${firstName(user.name)}` : 'Welcome back')}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="dash-header-actions">{actions}</div>}
  </header>
);

export const StatCard = ({ label, value, icon, tone = 'blue', hint }) => (
  <div className={`stat-card stat-${tone}`}>
    {icon && <span className="stat-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>}
    <div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-sub">{hint}</p>}
    </div>
  </div>
);

// Search + sort + toggle row shared by the dashboards.
export const FilterBar = ({ search, onSearch, placeholder = 'Search…', sort, onSort, sortOptions, children, label = 'Search' }) => (
  <div className="filter-bar" role="search">
    <label className="filter-search">
      <span className="sr-only">{label}</span>
      <Icon name="search" size={18} />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        className="form-input"
      />
    </label>
    {sortOptions && (
      <label className="filter-sort">
        <span className="sr-only">Sort by</span>
        <select value={sort} onChange={(e) => onSort(e.target.value)} className="form-select">
          {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    )}
    {children}
  </div>
);

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_az', label: 'Title A–Z' },
  { value: 'title_za', label: 'Title Z–A' },
];

// Segmented toggle (e.g. "In progress" / "All") built from pressed-state buttons.
export const Segmented = ({ value, onChange, options, label }) => (
  <div className="segmented" role="group" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={value === o.value}
        className={value === o.value ? 'is-active' : ''}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const joinAuthors = (authors) => (Array.isArray(authors) ? authors.join(', ') : String(authors || ''));
