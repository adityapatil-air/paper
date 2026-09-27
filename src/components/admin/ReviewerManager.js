import React, { useCallback, useEffect, useState } from 'react';
import { mockAPI } from '../../data/mockData';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import { formatDate } from '../ui/DashHeader';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin: invite reviewers by email and manage reviewer access. Reviewers are separate from
// Editorial Board members (which are only a public listing).
const ReviewerManager = ({ onChange }) => {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: '', invites: [], reviewers: [] });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyEmail, setBusyEmail] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    const result = await mockAPI.getReviewerInvites();
    setState({ loading: false, error: result.success ? '' : result.error, invites: result.invites, reviewers: result.reviewers });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setInviting(true);
    const result = await mockAPI.inviteReviewer(clean, name.trim());
    setInviting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.status === 'granted'
      ? `${clean} already had an account and is now a reviewer. We emailed them.`
      : `Invitation sent to ${clean}. They become a reviewer when they sign up with this email.`);
    setEmail('');
    setName('');
    await load();
    if (onChange) onChange();
  };

  const handleResend = async (inviteEmail) => {
    setBusyEmail(inviteEmail);
    const result = await mockAPI.resendReviewerInvite(inviteEmail);
    setBusyEmail(null);
    if (result.success) toast.success(`Invitation sent again to ${inviteEmail}.`);
    else toast.error(result.error);
  };

  const handleCancel = async (inviteEmail) => {
    setBusyEmail(inviteEmail);
    const result = await mockAPI.cancelReviewerInvite(inviteEmail);
    setBusyEmail(null);
    if (result.success) {
      toast.success('Invite cancelled.');
      load();
    } else {
      toast.error(result.error);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const result = await mockAPI.revokeReviewer(revokeTarget.id);
    setRevoking(false);
    if (result.success) {
      toast.success(`${revokeTarget.name || revokeTarget.email} no longer has reviewer access.`);
      setRevokeTarget(null);
      await load();
      if (onChange) onChange();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <section className="dash-panel" aria-labelledby="sec-reviewers">
      <div className="dash-panel-head">
        <div>
          <h2 id="sec-reviewers">Reviewers</h2>
          <p>Invite reviewers by email. When they sign up or sign in with Google using that address, they get reviewer access automatically. Reviewers are separate from Editorial Board members.</p>
        </div>
      </div>

      <form className="invite-form" onSubmit={handleInvite} noValidate>
        <div className="field">
          <div className="field-label"><label htmlFor="invite-email">Reviewer email<span className="req" aria-hidden="true">*</span></label></div>
          <input id="invite-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reviewer@university.edu" disabled={inviting} />
        </div>
        <div className="field">
          <div className="field-label"><label htmlFor="invite-name">Name <span className="optional">(optional)</span></label></div>
          <input id="invite-name" type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} placeholder="Dr. Jane Doe" disabled={inviting} />
        </div>
        <button type="submit" className="button button-primary" disabled={inviting || !email.trim()} aria-busy={inviting || undefined}>
          {inviting ? <><Spinner size="sm" /> Sending…</> : <><Icon name="send" size={16} /> Invite reviewer</>}
        </button>
      </form>

      {state.loading ? (
        <Spinner size="sm" label="Loading reviewers" />
      ) : state.error ? (
        <p role="alert">{state.error}</p>
      ) : (
        <div className="reviewer-lists">
          <div>
            <h3>Pending invitations ({state.invites.length})</h3>
            {state.invites.length === 0 ? (
              <p className="panel-intro">No pending invitations.</p>
            ) : (
              <ul className="people-list">
                {state.invites.map((inv) => (
                  <li key={inv.email} className="people-item">
                    <div>
                      <strong>{inv.name || inv.email}</strong>
                      <span>{inv.name ? `${inv.email} · ` : ''}Invited {formatDate(inv.invitedAt)}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => handleResend(inv.email)} disabled={busyEmail === inv.email}>
                        <Icon name="refresh" size={15} /> Resend
                      </button>
                      <button type="button" className="icon-btn" onClick={() => handleCancel(inv.email)} disabled={busyEmail === inv.email}>
                        <Icon name="x" size={15} /> Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3>Reviewers ({state.reviewers.length})</h3>
            {state.reviewers.length === 0 ? (
              <EmptyState compact title="No reviewers yet">Invite someone above. They appear here once they have an account.</EmptyState>
            ) : (
              <ul className="people-list">
                {state.reviewers.map((r) => (
                  <li key={r.id} className="people-item">
                    <div>
                      <strong>{r.name || r.email}</strong>
                      <span>{[r.email, r.affiliation].filter(Boolean).join(' · ')}</span>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => setRevokeTarget(r)}>
                      <Icon name="x" size={15} /> Remove access
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        tone="danger"
        title="Remove reviewer access?"
        message="Their account stays, but it becomes an author account. They keep any certificates for past reviews."
        confirmLabel="Remove access"
        busyLabel="Removing…"
        busy={revoking}
        onCancel={() => { if (!revoking) setRevokeTarget(null); }}
        onConfirm={confirmRevoke}
      >
        {revokeTarget && <div className="paper-ref"><strong>{revokeTarget.name || revokeTarget.email}</strong><span>{revokeTarget.email}</span></div>}
      </ConfirmDialog>
    </section>
  );
};

export default ReviewerManager;
