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

const mapNotificationRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  type: row.type,
  read: row.read,
  timestamp: row.timestamp,
});

// GET /api/notifications?userId=1
router.get('/', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const userId = parseInt(req.query.userId, 10);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Valid userId is required.' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching notifications', error, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
    }

    const notifications = (data || []).map(mapNotificationRow);
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error('Unexpected error in GET /api/notifications', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notification id.' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('Error marking notification read', error);
      return res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in POST /api/notifications/:id/read', err);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
  }
});

// DELETE /api/notifications/:id - delete a notification
router.delete('/:id', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notification id.' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error deleting notification', error);
      return res.status(500).json({ success: false, error: 'Failed to delete notification.' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/notifications/:id', err);
    return res.status(500).json({ success: false, error: 'Failed to delete notification.' });
  }
});

module.exports = router;
