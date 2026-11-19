// Journal rule (client, Nov 2026): every paper's publication date is the 30th of its month,
// or the 28th in February. Applied when a paper is published and when dates are sent to the
// site, so older rows show the same rule even before scripts/set_publication_day.js is run.

const journalDay = (month) => (month === 2 ? 28 : 30);

// '2026-07-15' (or a Date) -> '2026-07-30'. Returns the input unchanged if it is not a date.
const toJournalDate = (value) => {
  if (!value) return value;
  const m = String(value instanceof Date ? value.toISOString() : value).match(/^(\d{4})-(\d{2})/);
  if (!m) return value;
  const month = parseInt(m[2], 10);
  return `${m[1]}-${m[2]}-${String(journalDay(month)).padStart(2, '0')}`;
};

module.exports = { toJournalDate, journalDay };
