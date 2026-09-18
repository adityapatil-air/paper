const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabaseClient');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-me';

const buildPublicUser = (row) => {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    }

    const { name, email, password, affiliation, department, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing user', existingError);
      return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }

    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const allowedRoles = ['author', 'reviewer', 'editor', 'admin'];
    const requestedRole = (role || 'author').toLowerCase();
    const finalRole = allowedRoles.includes(requestedRole) ? requestedRole : 'author';

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        affiliation: affiliation || null,
        department: department || null,
        role: finalRole,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting user', error);
      return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }

    const user = buildPublicUser(data);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error('Unexpected error in /api/auth/register', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user', fetchError);
      return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }

    if (!userRow) {
      return res.json({ success: false, error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, userRow.password_hash || '');
    if (!passwordMatches) {
      return res.json({ success: false, error: 'Invalid credentials' });
    }

    const user = buildPublicUser(userRow);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error('Unexpected error in /api/auth/login', err);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
