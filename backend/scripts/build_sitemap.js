#!/usr/bin/env node
/*
 * Regenerates public/sitemap.xml: the static pages plus one entry per published paper.
 *
 *   node scripts/build_sitemap.js            (run from backend/, before `npm run build`)
 *
 * Paper URLs use the stable /p/:id form. Set SITE_URL to override https://ijepa.org.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../src/supabaseClient');

const SITE = (process.env.SITE_URL || 'https://ijepa.org').replace(/\/+$/, '');
const OUT = path.join(__dirname, '..', '..', 'public', 'sitemap.xml');

const STATIC_PAGES = [
  '/', '/papers', '/journal-issues', '/callforpapers', '/author-guidelines', '/indexing',
  '/editorial-board', '/joinusedito', '/contact-us', '/about-us', '/privacy-policy', '/terms-of-service',
];

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entry = (loc, lastmod) => `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;

(async () => {
  if (!supabase) { console.error('Supabase is not configured (.env).'); process.exit(1); }
  const { data, error } = await supabase
    .from('papers')
    .select('id, publication_date')
    .eq('status', 'published')
    .order('id');
  if (error) { console.error('Could not load papers:', error.message); process.exit(1); }

  const urls = [
    ...STATIC_PAGES.map((p) => entry(SITE + p)),
    ...(data || []).map((p) => entry(`${SITE}/p/${p.id}`, p.publication_date || null)),
  ];
  fs.writeFileSync(OUT, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.log(`Wrote ${urls.length} URLs (${(data || []).length} papers) to ${path.relative(process.cwd(), OUT)}`);
})();
