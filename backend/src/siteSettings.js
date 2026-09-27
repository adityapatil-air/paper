const { supabase } = require('./supabaseClient');

// Small key/value store on the site_settings table (key text PK, value jsonb).
const SETTINGS_TABLE = process.env.SUPABASE_SETTINGS_TABLE || 'site_settings';

const getSetting = async (key, fallback = null) => {
  if (!supabase) return fallback;
  const { data, error } = await supabase.from(SETTINGS_TABLE).select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? data.value : fallback;
};

const setSetting = async (key, value) => {
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
};

module.exports = { getSetting, setSetting };
