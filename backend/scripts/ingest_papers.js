#!/usr/bin/env node
/*
 * One-off importer for the IJEPA back-catalogue in "Papers to upload/".
 *
 *   node scripts/ingest_papers.js            # preview: parse PDFs -> papers_preview.csv (NO DB writes)
 *   node scripts/ingest_papers.js --insert   # read the (possibly edited) CSV and insert
 *
 * The CSV is the source of truth for --insert, so you can correct any row by hand first.
 * Re-running --insert is safe: papers whose title already exists are skipped.
 * Rows marked duplicate_of=... (byte-identical PDFs) are skipped by --insert.
 * Issue metadata comes from the FOLDER name (the value printed inside the PDFs is unreliable).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { extract, parseFolder, MONTHS } = require('./_extract');

const ROOT = path.join(__dirname, '..', '..', 'Papers to upload');
const CSV = path.join(__dirname, 'papers_preview.csv');
const INSERT = process.argv.includes('--insert');

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
const firstOfMonth = (month, year) => {
  const mi = MONTHS.indexOf(month);
  return mi < 0 ? year + '-01-01' : year + '-' + String(mi + 1).padStart(2, '0') + '-01';
};

function listPdfs() {
  const folders = fs.readdirSync(ROOT).filter((f) => fs.statSync(path.join(ROOT, f)).isDirectory()).sort();
  const out = [];
  for (const folder of folders) {
    const meta = parseFolder(folder);
    if (!meta) { console.warn('Skipping unrecognised folder: ' + folder); continue; }
    for (const file of fs.readdirSync(path.join(ROOT, folder)).filter((f) => /\.pdf$/i.test(f)).sort()) {
      out.push({ folder, meta, file, full: path.join(ROOT, folder, file) });
    }
  }
  return out;
}

async function preview() {
  const items = listPdfs();
  const byHash = new Map();
  const rows = [];
  for (const it of items) {
    const buf = fs.readFileSync(it.full);
    const hash = md5(buf);
    const meta = await extract(it.full);
    const dupOf = byHash.get(hash);
    if (!dupOf) byHash.set(hash, it.file);
    rows.push({
      file: it.file,
      issue_folder: it.folder,
      volume: it.meta.volume,
      issue_number: it.meta.issue,
      month: it.meta.month,
      year: it.meta.year,
      title: meta.title,
      authors: meta.authors.join(' | '),
      keywords: meta.keywords,
      pages: meta.pages,
      abstract_words: meta.abstractWords,
      duplicate_of: dupOf || '',
      abstract: meta.abstract,
    });
  }

  const cols = ['file', 'issue_folder', 'volume', 'issue_number', 'month', 'year', 'title', 'authors', 'keywords', 'pages', 'abstract_words', 'duplicate_of', 'abstract'];
  fs.writeFileSync(CSV, cols.join(',') + '\n' + rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n') + '\n');

  const dupes = rows.filter((r) => r.duplicate_of);
  const unique = rows.length - dupes.length;
  console.log('\nParsed ' + rows.length + ' PDFs -> ' + path.relative(process.cwd(), CSV));
  console.log('Unique papers: ' + unique + '   |   Byte-identical duplicates: ' + dupes.length + '\n');
  const perIssue = {};
  rows.forEach((r) => { if (!perIssue[r.issue_number]) perIssue[r.issue_number] = { total: 0, dup: 0 }; perIssue[r.issue_number].total++; if (r.duplicate_of) perIssue[r.issue_number].dup++; });
  console.log('Per issue (folder is authoritative):');
  Object.keys(perIssue).sort((a, b) => a - b).forEach((n) => {
    const p = perIssue[n];
    console.log('  Issue ' + n + ': ' + p.total + ' files' + (p.dup ? '  (' + p.dup + ' duplicate, ' + (p.total - p.dup) + ' unique)' : ''));
  });
  if (dupes.length) {
    console.log('\nDuplicate files (would be SKIPPED by --insert):');
    dupes.forEach((r) => console.log('  ' + r.file + '  ==  ' + r.duplicate_of + '   "' + r.title.slice(0, 60) + '"'));
  }
  const bad = rows.filter((r) => !r.title || r.title.length < 6 || !r.authors || r.abstract_words < 20);
  console.log(bad.length ? '\n' + bad.length + ' row(s) need manual review: ' + bad.map((r) => r.file).join(', ') : '\nNo rows flagged for manual review.');
  console.log('\nReview / edit the CSV, then run with --insert to write to the database.');
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c === '\r') { /* skip */ }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.some((c) => c.length)).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] == null ? '' : r[i]])));
}

async function insert() {
  const { supabase } = require('../src/supabaseClient');
  const { uploadFile } = require('../src/storage');
  if (!supabase) { console.error('Supabase is not configured (.env).'); process.exit(1); }
  if (!fs.existsSync(CSV)) { console.error('Run preview first to create papers_preview.csv.'); process.exit(1); }

  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const items = listPdfs();
  const byFile = new Map(items.map((it) => [it.file, it]));
  const issueCache = new Map();

  const findOrCreateIssue = async (volume, issue, month, year) => {
    const key = volume + '-' + issue + '-' + year;
    if (issueCache.has(key)) return issueCache.get(key);
    const { data: existing } = await supabase.from('issues').select('*').eq('volume', volume).eq('issue', issue).eq('year', year).maybeSingle();
    let rec = existing;
    if (!rec) {
      const { data, error } = await supabase.from('issues').insert({ volume, issue, month, year, published_at: firstOfMonth(month, year) }).select('*').single();
      if (error) throw new Error('issue create failed: ' + error.message);
      rec = data; console.log('  + created issue Vol ' + volume + ' Issue ' + issue + ' (' + month + ' ' + year + ') id=' + rec.id);
    } else {
      console.log('  = issue Vol ' + volume + ' Issue ' + issue + ' exists id=' + rec.id);
    }
    issueCache.set(key, rec);
    return rec;
  };

  let created = 0, skipped = 0, linked = 0;
  for (const r of rows) {
    const label = r.file + ' "' + r.title.slice(0, 50) + '"';
    if (r.duplicate_of) { console.log('  - skip duplicate ' + label + ' (== ' + r.duplicate_of + ')'); skipped++; continue; }
    if (!r.title || !r.title.trim()) { console.log('  - skip (no title) ' + label); skipped++; continue; }

    const issue = await findOrCreateIssue(+r.volume, +r.issue_number, r.month, +r.year);

    const { data: existingPaper } = await supabase.from('papers').select('id').ilike('title', r.title.trim()).maybeSingle();
    let paperId;
    if (existingPaper) {
      paperId = existingPaper.id;
      console.log('  = paper exists, not re-uploaded: ' + label + ' id=' + paperId);
      skipped++;
    } else {
      const it = byFile.get(r.file);
      const buf = fs.readFileSync(it.full);
      const url = await uploadFile({ originalname: r.file, mimetype: 'application/pdf', size: buf.length, buffer: buf }, 'issues/vol' + r.volume + '-issue' + r.issue_number);
      const authors = r.authors.split('|').map((a) => a.trim()).filter(Boolean);
      const keywords = r.keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const { data: paper, error } = await supabase.from('papers').insert({
        title: r.title.trim(),
        authors,
        abstract: r.abstract || null,
        keywords,
        status: 'published',
        submission_date: firstOfMonth(r.month, +r.year),
        publication_date: firstOfMonth(r.month, +r.year),
        payment_status: 'paid',
        pdf_url: url,
      }).select('id').single();
      if (error) throw new Error('paper insert failed for ' + r.file + ': ' + error.message);
      paperId = paper.id;
      created++;
      console.log('  + published paper ' + label + ' id=' + paperId);
    }

    const { error: linkErr } = await supabase.from('issue_papers').upsert({ issue_id: issue.id, paper_id: paperId }, { onConflict: 'issue_id,paper_id', ignoreDuplicates: true });
    if (linkErr) console.warn('    link warn: ' + linkErr.message); else linked++;
  }

  const target = 7;
  const { data: cur } = await supabase.from('issues').select('*').eq('volume', 1).eq('issue', target).eq('year', 2026).maybeSingle();
  if (cur) {
    await supabase.from('issues').update({ is_current: false }).eq('is_current', true);
    await supabase.from('issues').update({ is_current: true }).eq('id', cur.id);
    console.log('\nSet Vol 1 Issue ' + target + ' (id=' + cur.id + ') as current.');
  } else {
    console.log('\nNote: Vol 1 Issue ' + target + ' not found; current issue unchanged.');
  }
  console.log('\nDone. Published: ' + created + '   Skipped: ' + skipped + '   Issue links: ' + linked);
}

(INSERT ? insert() : preview()).catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
