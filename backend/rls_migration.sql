-- P0-02: lock every public table away from the anon / authenticated roles.
--
-- The browser only uses Supabase Auth (Google sign-in). All table access goes
-- through the Express backend with the service-role key, which bypasses RLS, so
-- enabling RLS with no policies denies the public anon key without affecting the app.
--
-- Safe to re-run. Does not modify or delete any rows.

alter table if exists public.users              enable row level security;
alter table if exists public.papers             enable row level security;
alter table if exists public.paper_authors      enable row level security;
alter table if exists public.reviews            enable row level security;
alter table if exists public.review_assignments enable row level security;
alter table if exists public.notifications      enable row level security;
alter table if exists public.issues             enable row level security;
alter table if exists public.issue_papers       enable row level security;
alter table if exists public.site_settings      enable row level security;

-- Verify: every row should show rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
