const { supabase } = require('./supabaseClient');
const { getSetting, setSetting } = require('./siteSettings');

// Emails an admin has invited to review. Anyone who registers or signs in with one of these
// addresses gets the reviewer role. Stored in site_settings, so no schema change is needed.
const INVITES_KEY = 'reviewer_invites';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isValidEmail = (value) => EMAIL_RE.test(normalizeEmail(value)) && normalizeEmail(value).length <= 254;

const getInvites = async () => {
  const value = await getSetting(INVITES_KEY, []);
  return Array.isArray(value) ? value.filter((i) => i && i.email) : [];
};

const isInvited = async (email) => {
  const target = normalizeEmail(email);
  return (await getInvites()).some((i) => normalizeEmail(i.email) === target);
};

// Adds or refreshes an invite; returns the stored entry.
const addInvite = async ({ email, name, invitedBy }) => {
  const target = normalizeEmail(email);
  const invites = await getInvites();
  const entry = { email: target, name: String(name || '').trim() || null, invitedAt: new Date().toISOString(), invitedBy: invitedBy || null };
  const next = [entry, ...invites.filter((i) => normalizeEmail(i.email) !== target)];
  await setSetting(INVITES_KEY, next);
  return entry;
};

const removeInvite = async (email) => {
  const target = normalizeEmail(email);
  const invites = await getInvites();
  const next = invites.filter((i) => normalizeEmail(i.email) !== target);
  if (next.length !== invites.length) await setSetting(INVITES_KEY, next);
  return next.length !== invites.length;
};

// Role for a new or signing-in account: an invited email becomes a reviewer and the invite is
// used up. Existing admins and editors are never downgraded.
const resolveRoleForEmail = async (email, currentRole = 'author') => {
  if (currentRole === 'admin' || currentRole === 'editor' || currentRole === 'reviewer') return currentRole;
  if (await isInvited(email)) {
    await removeInvite(email);
    return 'reviewer';
  }
  return currentRole || 'author';
};

// Case-insensitive lookup of a user row by email. ilike treats % and _ as wildcards,
// so they are escaped to match literally.
const findUserByEmail = async (email, columns = '*') => {
  const pattern = normalizeEmail(email).replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase.from('users').select(columns).ilike('email', pattern).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
};

module.exports = {
  normalizeEmail,
  isValidEmail,
  getInvites,
  isInvited,
  addInvite,
  removeInvite,
  resolveRoleForEmail,
  findUserByEmail,
};
