-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Adds the text and file fields used by the admin "Journal issues" manager.
alter table public.issues add column if not exists title           text;
alter table public.issues add column if not exists description     text;
alter table public.issues add column if not exists cover_image_url text;
alter table public.issues add column if not exists file_url        text;
alter table public.issues add column if not exists file_name       text;
alter table public.issues add column if not exists published_at    date;
