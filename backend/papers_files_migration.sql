-- Run once in the Supabase SQL editor.
-- Adds the columns the upload code writes to but that do not exist yet:
--   copyright_url  signed copyright form uploaded with a submission or by an admin
--   cover_letter   the author's cover letter / comments (now separate from the abstract)
alter table public.papers add column if not exists copyright_url text;
alter table public.papers add column if not exists cover_letter  text;
