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

// ARIA tabs with roving tabindex: ←/→/Home/End move between tabs. Panels use id `panel-${id}`.
export const TabList = ({ tabs, active, onChange, label }) => {
  const onKeyDown = (e) => {
    const idx = tabs.findIndex((t) => t.id === active);
    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    setTimeout(() => document.getElementById(`tab-${tabs[next].id}`)?.focus(), 0);
  };
  return (
    <div className="dash-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={`dash-tab ${active === t.id ? 'is-active' : ''}`}
        >
          {t.label}
          {typeof t.count === 'number' && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
};

export const TabPanel = ({ id, children }) => (
  <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} tabIndex={0} className="tab-panel">
    {children}
  </section>
);

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const joinAuthors = (authors) => (Array.isArray(authors) ? authors.join(', ') : String(authors || ''));

// Author line for a paper as a reviewer sees it (the API withholds names during double-blind review).
export const paperAuthorsLabel = (paper) => (paper?.authorsHidden ? 'Hidden for double-blind review' : joinAuthors(paper?.authors));
