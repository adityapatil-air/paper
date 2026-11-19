#!/usr/bin/env node
/*
 * One-off: set every paper's publication_date to the 30th of its month (28th in February).
 *
 *   node scripts/set_publication_day.js           # preview the changes, no writes
 *   node scripts/set_publication_day.js --apply   # write them
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env. Safe to re-run.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { toJournalDate } = require('../src/publicationDate');

const APPLY = process.argv.includes('--apply');

(async () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env first.');
    process.exit(1);
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from('papers').select('id, title, publication_date').not('publication_date', 'is', null);
  if (error) { console.error(error.message); process.exit(1); }

  const changes = data
    .map((p) => ({ ...p, next: toJournalDate(String(p.publication_date).slice(0, 10)) }))
    .filter((p) => p.next !== String(p.publication_date).slice(0, 10));

  console.log(`${data.length} dated papers, ${changes.length} to change.`);
  changes.forEach((p) => console.log(`  #${p.id}  ${p.publication_date} -> ${p.next}  ${String(p.title).slice(0, 60)}`));
  if (!APPLY) { console.log('\nPreview only. Run with --apply to save.'); return; }

  for (const p of changes) {
    const { error: e } = await db.from('papers').update({ publication_date: p.next }).eq('id', p.id);
    if (e) { console.error(`  #${p.id} failed: ${e.message}`); process.exitCode = 1; }
  }
  console.log('Done.');
})();
