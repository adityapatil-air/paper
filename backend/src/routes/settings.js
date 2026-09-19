const express = require('express');
const { supabase } = require('../supabaseClient');

const router = express.Router();

const ensureSupabase = (res) => {
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Supabase client is not configured on the server.' });
    return false;
  }
  return true;
};

const SETTINGS_TABLE = process.env.SUPABASE_SETTINGS_TABLE || 'site_settings';
const IMPORTANT_DATES_KEY = 'important_dates';
const EDITORIAL_BOARD_KEY = 'editorial_board';

// GET /api/settings/important-dates
router.get('/important-dates', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('key, value')
      .eq('key', IMPORTANT_DATES_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching important dates', error);
      return res.status(500).json({ success: false, error: 'Failed to load important dates.' });
    }

    return res.json({ success: true, dates: data?.value || null });
  } catch (err) {
    console.error('Unexpected error in GET /api/settings/important-dates', err);
    return res.status(500).json({ success: false, error: 'Failed to load important dates.' });
  }
});

// POST /api/settings/important-dates
router.post('/important-dates', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { dates } = req.body || {};

    if (!dates || typeof dates !== 'object') {
      return res.status(400).json({ success: false, error: 'dates object is required.' });
    }

    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({
        key: IMPORTANT_DATES_KEY,
        value: dates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      console.error('Error saving important dates', error);
      return res.status(500).json({ success: false, error: 'Failed to save important dates.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/settings/important-dates', err);
    return res.status(500).json({ success: false, error: 'Failed to save important dates.' });
  }
});

// GET /api/settings/editorial-board
router.get('/editorial-board', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('key, value')
      .eq('key', EDITORIAL_BOARD_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching editorial board', error);
      return res.status(500).json({ success: false, error: 'Failed to load editorial board.' });
    }

    return res.json({ success: true, board: data?.value || null });
  } catch (err) {
    console.error('Unexpected error in GET /api/settings/editorial-board', err);
    return res.status(500).json({ success: false, error: 'Failed to load editorial board.' });
  }
});

// POST /api/settings/editorial-board
router.post('/editorial-board', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const { board } = req.body || {};

    if (!Array.isArray(board)) {
      return res.status(400).json({ success: false, error: 'board array is required.' });
    }

    const cleaned = board
      .map((m, idx) => {
        const rawOrder = m?.sortOrder;
        const parsedOrder = typeof rawOrder === 'number' ? rawOrder : parseInt(String(rawOrder ?? ''), 10);
        return {
          id: m?.id,
          section: String(m?.section || '').trim(),
          name: String(m?.name || '').trim(),
          title: String(m?.title || '').trim(),
          affiliation: String(m?.affiliation || '').trim(),
          email: String(m?.email || '').trim(),
          profileUrl: String(m?.profileUrl || '').trim(),
          photo: String(m?.photo || '').trim(),
          sortOrder: Number.isNaN(parsedOrder) ? idx : parsedOrder,
        };
      })
      .filter((m) => m.section && m.name)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const normalized = cleaned.map((m, idx) => ({ ...m, sortOrder: idx }));

    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({
        key: EDITORIAL_BOARD_KEY,
        value: normalized,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      console.error('Error saving editorial board', error);
      return res.status(500).json({ success: false, error: 'Failed to save editorial board.' });
    }

    return res.json({ success: true, board: normalized });
  } catch (err) {
    console.error('Unexpected error in POST /api/settings/editorial-board', err);
    return res.status(500).json({ success: false, error: 'Failed to save editorial board.' });
  }
});

module.exports = router;
