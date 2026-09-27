import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockAPI } from '../../data/mockData';
import Icon from './Icon';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import { formatDate } from './DashHeader';

// Lists the signed-in user's certificates of one type ('review' or 'author').
const CertificateList = ({ type, emptyTitle, emptyText, onCount }) => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });

  useEffect(() => {
    let active = true;
    mockAPI.getMyCertificates().then((result) => {
      if (!active) return;
      const items = (result.certificates || []).filter((c) => c.type === type);
      setState({ loading: false, error: result.success ? '' : result.error, items });
      if (onCount) onCount(items.length);
    });
    return () => { active = false; };
  }, [type, onCount]);

  if (state.loading) return <Spinner size="sm" label="Loading certificates" />;
  if (state.error) return <p role="alert">{state.error}</p>;
  if (state.items.length === 0) return <EmptyState title={emptyTitle} variant="review">{emptyText}</EmptyState>;

  return (
    <ul className="cert-list">
      {state.items.map((c) => (
        <li key={`${c.type}-${c.paperId}`} className="cert-item">
          <div className="cert-item-body">
            <span className="cert-item-icon" aria-hidden="true"><Icon name="star" size={20} /></span>
            <div>
              <strong>{c.paperTitle}</strong>
              <span>{type === 'review' ? 'Certificate of Reviewing' : 'Certificate of Publication'}{c.publicationDate ? ` · Published ${formatDate(c.publicationDate)}` : ''}</span>
            </div>
          </div>
          <Link to={`/certificate/${c.type}/${c.paperId}`} className="button button-primary button-small">
            <Icon name="download" size={15} /> View &amp; download
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default CertificateList;
