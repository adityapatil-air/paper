#!/usr/bin/env node
/*
 * Regenerates public/sitemap.xml: the static pages plus one entry per published paper.
 *
 *   node scripts/build_sitemap.js            (run from backend/, before `npm run build`)
 *
 * Paper URLs use the canonical /article/volume-<v>/issue-<n>/<paper ID> form. Set SITE_URL to override https://ijepa.org.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../src/supabaseClient');
const { paperCode, articlePath } = require('../src/paperCode');

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
    .select('id, publication_date, submission_date, pdf_url')
    .eq('status', 'published')
    .order('id');
  if (error) { console.error('Could not load papers:', error.message); process.exit(1); }
  const { data: links, error: linkError } = await supabase.from('issue_papers').select('paper_id, issues!inner(volume, issue)');
  if (linkError) { console.error('Could not load issue links:', linkError.message); process.exit(1); }
  const issueByPaper = Object.fromEntries((links || []).map((l) => [l.paper_id, l.issues]));

  const urls = [
    ...STATIC_PAGES.map((p) => entry(SITE + p)),
    ...(data || []).map((p) => entry(SITE + articlePath(paperCode(p), issueByPaper[p.id]), p.publication_date || null)),
  ];
  fs.writeFileSync(OUT, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.log(`Wrote ${urls.length} URLs (${(data || []).length} papers) to ${path.relative(process.cwd(), OUT)}`);
})();
