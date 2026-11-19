// Journal paper ID, e.g. IJEPA-2026-031. Back-catalogue papers carry theirs in the PDF file name
// (it is also printed in the PDF and used in the DOI); newer papers get IJEPA-<year>-<database id>.
// Rows must include id, pdf_url and submission_date (publication_date as a fallback).
const PAPER_CODE_FIELDS = 'pdf_url, submission_date, publication_date';

const paperCode = (paper) => {
  const fromFile = String(paper?.pdf_url ?? paper?.pdfUrl ?? '').match(/IJEPA-\d{4}-\d{3,}/i);
  if (fromFile) return fromFile[0].toUpperCase();
  const date = paper?.submission_date || paper?.submissionDate || paper?.publication_date || paper?.publicationDate || '';
  const year = String(date).slice(0, 4) || String(new Date().getFullYear());
  return `IJEPA-${year}-${String(paper?.id ?? '').padStart(3, '0')}`;
};

// Public address of a published paper: /article/volume-1/issue-7/IJEPA-2026-034 when it belongs to a
// numbered issue, otherwise /article/IJEPA-2026-034 (special issues, or not yet in an issue).
const articlePath = (code, issue) => (issue && issue.volume && issue.issue
  ? `/article/volume-${issue.volume}/issue-${issue.issue}/${code}`
  : `/article/${code}`);

module.exports = { PAPER_CODE_FIELDS, paperCode, articlePath };
