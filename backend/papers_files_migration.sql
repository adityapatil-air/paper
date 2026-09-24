-- Run once in the Supabase SQL editor.
-- Adds the columns the upload code writes to but that do not exist yet:
--   copyright_url  signed copyright form uploaded with a submission or by an admin
--   cover_letter   the author's cover letter / comments (now separate from the abstract)
alter table public.papers add column if not exists copyright_url text;
alter table public.papers add column if not exists cover_letter  text;

-- The app moves papers to "revisions_requested" (admin Request revisions ->
-- author uploads a revised manuscript), but the enum was created without it,
-- so that status update has been failing silently.
alter type paper_status add value if not exists 'revisions_requested';
