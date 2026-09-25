// Shared PDF metadata extractor for the IJEPA back-catalogue import.
// Anchors on author email lines (one per author in this journal template),
// which is far more reliable than guessing affiliation lines.
const fs = require('fs');
const pdf = require('pdf-parse');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseFolder(name) {
  const m = name.match(/Vol\s*(\d+)_Issue\s*(\d+)_([A-Za-z]+)\s*(\d{4})/i);
  if (!m) return null;
  const month = MONTHS.find((mm) => mm.toLowerCase().startsWith(m[3].toLowerCase().slice(0, 3))) || m[3];
  return { volume: +m[1], issue: +m[2], month, year: +m[4] };
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const hasEmail = (l) => /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(l);
const isAffil = (l) => /department|dept\.?|institute|college|university|polytechnic|school of|faculty|lecturer|professor|assistant prof|research scholar|scholar,|student,|technology|engineering|science|campus|nagar|road\b|latur|pune|mumbai|nashik|nagpur|india\b/i.test(l);
const isNoise = (l) => /^\d+$/.test(l) || /volume\s*\d+/i.test(l) || /^\(?ijepa\)?$/i.test(l) || /buildsofttech/i.test(l) || /international journal of engineering/i.test(l);

async function extract(filePath) {
  const data = await pdf(fs.readFileSync(filePath));
  const raw = data.text || '';
  const lines = raw.split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const idx = [];        // map: compact line -> original index
  const L = [];
  lines.forEach((l) => { if (l.length) { L.push(l); idx.push(true); } });

  let hi = L.findIndex((l) => /buildsofttech/i.test(l));
  if (hi < 0) hi = L.findIndex((l) => /\(IJEPA\)/i.test(l));
  const abIdx = L.findIndex((l, i) => i > hi && /^abstract\b/i.test(l.replace(/^\s+/, '')));
  const stop = abIdx < 0 ? L.length : abIdx;

  // Author region: header+1 .. abstract. Emails anchor each author.
  const emailIdxs = [];
  for (let i = hi + 1; i < stop; i++) if (hasEmail(L[i])) emailIdxs.push(i);

  const authors = [];
  const usedName = new Set();
  for (const e of emailIdxs) {
    for (let j = e - 1; j > hi; j--) {
      if (usedName.has(j)) break;
      const l = L[j];
      if (hasEmail(l) || isAffil(l) || isNoise(l)) continue;
      // plausible name: 1-6 words, letters, not the title (title is above the first name we ll take)
      const words = l.split(' ').filter(Boolean);
      if (words.length >= 1 && words.length <= 6 && /[A-Za-z]/.test(l)) {
        authors.push(l.replace(/[*†‡0-9]+$/g, '').replace(/[*†‡]/g, '').trim());
        usedName.add(j);
        break;
      }
    }
  }

  // Title = lines between header and the FIRST author name (or first email if none)
  let firstNameIdx = stop;
  if (emailIdxs.length) {
    // the smallest used name index
    firstNameIdx = Math.min(...[...usedName]);
    if (!isFinite(firstNameIdx)) firstNameIdx = emailIdxs[0];
  }
  const titleLines = [];
  for (let i = hi + 1; i < firstNameIdx; i++) {
    if (isNoise(L[i])) continue;
    titleLines.push(L[i]);
  }
  const title = clean(titleLines.join(' '));

  // Abstract between "Abstract [-:]" and "Keywords"
  const abMatch = raw.match(/Abstract\s*[:\-–—]/i);
  const kwMatch = raw.match(/K\s?ey\s?\s?words?\s*[:\-–—]?/i);
  let abstract = '';
  if (abMatch) {
    const s = abMatch.index + abMatch[0].length;
    const end = kwMatch && kwMatch.index > s ? kwMatch.index : Math.min(raw.length, s + 2500);
    abstract = clean(raw.slice(s, end));
  }

  let keywords = '';
  if (kwMatch) {
    const s = kwMatch.index + kwMatch[0].length;
    let tail = raw.slice(s, s + 800).split(/\n\s*(?:[IVX0-9]+\s*[.\)]\s*)?(?:INTRODUCTION|Introduction)/)[0];
    keywords = clean(tail).replace(/[.;]$/, '');
  }

  return { title, authors, keywords, abstract, pages: data.numpages, abstractWords: abstract ? abstract.split(/\s+/).length : 0, emailCount: emailIdxs.length };
}

module.exports = { extract, parseFolder, MONTHS };
