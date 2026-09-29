// Special issues, newest first. The first one is featured at the top of the home page.
export const sortSpecialIssues = (list) => (list || [])
  .filter((i) => i.isSpecial)
  .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || b.id - a.id);
