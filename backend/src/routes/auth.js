const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabaseClient');
const { JWT_SECRET } = require('../jwtSecret');
const { rateLimit } = require('../middleware/rateLimit');
const { normalizeEmail, isValidEmail, resolveRoleForEmail, findUserByEmail } = require('../reviewerInvites');
const { sendEmail, templates } = require('../email');

const router = express.Router();

// Must match MIN_PASSWORD_LENGTH in src/pages/Register.js.
const MIN_PASSWORD_LENGTH = 8;
const VERIFY_TTL = '15m';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const TOO_MANY_LOGINS = 'Too many sign-in attempts. Please wait 15 minutes and try again.';
const emailKey = (req) => normalizeEmail(req.body?.email);

// Password guessing: 10 attempts per account per IP, and 50 per IP overall, every 15 minutes.
const loginPerAccount = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10, key: (req) => `${req.ip}|${emailKey(req)}`, message: TOO_MANY_LOGINS });
const loginPerIp = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 50, key: (req) => req.ip, message: TOO_MANY_LOGINS });
// Verification codes: 10 per network and 5 per address every hour, so nobody can flood an inbox.
const registerPerIp = rateLimit({ windowMs: ONE_HOUR, max: 10, key: (req) => req.ip, message: 'Too many sign-up attempts from this network. Please try again in an hour.' });
const registerPerEmail = rateLimit({ windowMs: ONE_HOUR, max: 5, key: (req) => `start|${emailKey(req)}`, message: 'Too many codes were sent to this email. Please try again in an hour.' });
// Code guessing: 10 tries per network every 15 minutes (a code has a million possibilities and lives 15 minutes).
const verifyPerIp = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 10, key: (req) => `verify|${req.ip}`, message: 'Too many incorrect codes. Please wait 15 minutes and request a new code.' });
const googlePerIp = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 30, key: (req) => `google|${req.ip}`, message: TOO_MANY_LOGINS });

const buildPublicUser = (row) => {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
};

const signSession = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

// The code is never stored: the verify token carries an HMAC of it, keyed with the server secret,
// so it can't be recovered from the token.
const codeHash = (email, code) => crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
const sameHash = (a, b) => {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

// POST /api/auth/register - replaced by the verified two-step flow below.
router.post('/register', (req, res) => res.status(410).json({
  success: false,
  error: 'Registration now needs email verification. Please refresh the page and try again.',
  code: 'VERIFY_EMAIL_REQUIRED',
}));

// POST /api/auth/register/start  { name, email, password, affiliation?, department? }
// Emails a 6-digit code and returns a short-lived token holding the pending registration.
router.post('/register/start', registerPerIp, registerPerEmail, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const { name, password, affiliation, department } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const cleanName = String(name || '').trim();

    if (!cleanName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address, like name@university.edu.' });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }
    if (await findUserByEmail(email, 'id')) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Sign in instead.', code: 'EMAIL_IN_USE' });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const verifyToken = jwt.sign({
      purpose: 'register',
      name: cleanName.slice(0, 120),
      email,
      affiliation: String(affiliation || '').trim().slice(0, 200) || null,
      department: String(department || '').trim().slice(0, 200) || null,
      passwordHash: await bcrypt.hash(String(password), 10),
      codeHash: codeHash(email, code),
    }, JWT_SECRET, { expiresIn: VERIFY_TTL });

    const sent = await sendEmail({ to: { email, name: cleanName }, ...templates.verificationCode({ name: cleanName, code }) });
    if (!sent) {
      return res.status(502).json({ success: false, error: 'We couldn’t send the verification email. Check the address and try again.' });
    }

    return res.json({ success: true, verifyToken, email });
  } catch (err) {
    console.error('Unexpected error in /api/auth/register/start', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/register/verify  { verifyToken, code }  -> creates the account and signs in.
router.post('/register/verify', verifyPerIp, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const code = String(req.body?.code || '').replace(/\s+/g, '');
    let pending;
    try {
      pending = jwt.verify(String(req.body?.verifyToken || ''), JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'This code has expired. Request a new one.', code: 'CODE_EXPIRED' });
    }
    if (pending?.purpose !== 'register' || !pending.email) {
      return res.status(400).json({ success: false, error: 'Invalid verification request.' });
    }
    if (!/^\d{6}$/.test(code) || !sameHash(codeHash(pending.email, code), pending.codeHash)) {
      return res.status(400).json({ success: false, error: 'That code isn’t right. Check the email and try again.', code: 'CODE_INVALID' });
    }
    if (await findUserByEmail(pending.email, 'id')) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Sign in instead.', code: 'EMAIL_IN_USE' });
    }

    // Self-registration creates an author, unless an admin invited this email to review.
    const role = await resolveRoleForEmail(pending.email, 'author');
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: pending.name,
        email: pending.email,
        password_hash: pending.passwordHash,
        affiliation: pending.affiliation,
        department: pending.department,
        role,
      })
      .select()
      .single();
    if (error) {
      console.error('Error inserting user', error);
      return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }

    const user = buildPublicUser(data);
    return res.json({ success: true, user, token: signSession(user) });
  } catch (err) {
    console.error('Unexpected error in /api/auth/register/verify', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginPerIp, loginPerAccount, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const { password } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const userRow = await findUserByEmail(email);
    if (!userRow) {
      return res.json({ success: false, error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(String(password), userRow.password_hash || '');
    if (!passwordMatches) {
      return res.json({ success: false, error: 'Invalid credentials' });
    }

    // An admin may have invited this existing account to review since the last sign-in.
    const role = await resolveRoleForEmail(userRow.email, userRow.role);
    if (role !== userRow.role) {
      await supabase.from('users').update({ role }).eq('id', userRow.id);
      userRow.role = role;
    }

    const user = buildPublicUser(userRow);
    return res.json({ success: true, user, token: signSession(user) });
  } catch (err) {
    console.error('Unexpected error in /api/auth/login', err);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/google  { accessToken }
// Exchanges a Supabase (Google) session for an IJEPA account and session. Google has already
// verified the email, so no code is needed. Creates the account on first sign-in.
router.post('/google', googlePerIp, async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;
    const accessToken = String(req.body?.accessToken || '');
    if (!accessToken) return res.status(400).json({ success: false, error: 'Missing Google session.' });

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const googleUser = authData?.user;
    if (authError || !googleUser?.email) {
      return res.status(401).json({ success: false, error: 'Your Google session has expired. Please sign in again.', code: 'AUTH_EXPIRED' });
    }

    const email = normalizeEmail(googleUser.email);
    const meta = googleUser.user_metadata || {};
    let row = await findUserByEmail(email);

    if (row) {
      const role = await resolveRoleForEmail(row.email, row.role);
      if (role !== row.role) {
        await supabase.from('users').update({ role }).eq('id', row.id);
        row.role = role;
      }
    } else {
      const role = await resolveRoleForEmail(email, 'author');
      // Google accounts sign in without a password; store an unusable random hash (the column is required).
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const { data, error } = await supabase
        .from('users')
        .insert({ name: String(meta.full_name || meta.name || email.split('@')[0]).slice(0, 120), email, password_hash: passwordHash, role })
        .select()
        .single();
      if (error) {
        console.error('Error creating Google user', error);
        return res.status(500).json({ success: false, error: 'Google sign-in failed. Please try again.' });
      }
      row = data;
    }

    const user = buildPublicUser(row);
    return res.json({ success: true, user, token: signSession(user) });
  } catch (err) {
    console.error('Unexpected error in /api/auth/google', err);
    return res.status(500).json({ success: false, error: 'Google sign-in failed. Please try again.' });
  }
});

module.exports = router;
