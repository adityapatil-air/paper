import React from 'react';
import Icon from './Icon';

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Derives the author-facing progress of a paper purely from its status and known dates.
const buildSteps = (paper) => {
  const status = paper?.status;
  const steps = [
    { key: 'submitted', label: 'Submitted', date: formatDate(paper?.submissionDate), state: 'done' },
    { key: 'review', label: 'Under review', state: 'upcoming' },
    { key: 'decision', label: 'Decision', state: 'upcoming' },
    { key: 'published', label: 'Published', date: formatDate(paper?.publicationDate), state: 'upcoming' },
  ];

  switch (status) {
    case 'submitted':
      steps[1].state = 'current';
      steps[1].note = 'Awaiting editorial check';
      break;
    case 'under_review':
      steps[1].state = 'current';
      steps[1].note = 'With reviewers';
      break;
    case 'revisions_requested':
      steps[1].state = 'done';
      steps[2].state = 'warning';
      steps[2].label = 'Revision requested';
      steps[2].note = 'Upload a revised manuscript';
      break;
    case 'accepted':
      steps[1].state = 'done';
      steps[2].state = 'done';
      steps[2].label = 'Accepted';
      steps[3].state = 'current';
      break;
    case 'rejected':
      steps[1].state = 'done';
      steps[2].state = 'error';
      steps[2].label = 'Not accepted';
      steps[3].state = 'skipped';
      break;
    case 'published':
      steps.forEach((s) => { s.state = 'done'; });
      steps[2].label = 'Accepted';
      break;
    default:
      break;
  }
  return steps;
};

const STEP_ICON = { done: 'check', error: 'x', warning: 'edit' };

const PaperStepper = ({ paper }) => {
  const steps = buildSteps(paper);
  return (
    <ol className="paper-stepper" aria-label="Submission progress">
      {steps.map((step, i) => (
        <li key={step.key} className={`ps-step is-${step.state}`} aria-current={step.state === 'current' || step.state === 'warning' ? 'step' : undefined}>
          <span className="ps-marker" aria-hidden="true">
            {STEP_ICON[step.state] ? <Icon name={STEP_ICON[step.state]} size={14} strokeWidth={2.6} /> : i + 1}
          </span>
          <span className="ps-text">
            <strong>{step.label}</strong>
            {(step.date || step.note) && <small>{step.date || step.note}</small>}
          </span>
          <span className="sr-only">{` — ${step.state === 'done' ? 'completed' : step.state === 'upcoming' || step.state === 'skipped' ? 'not started' : 'in progress'}`}</span>
        </li>
      ))}
    </ol>
  );
};

export default PaperStepper;
