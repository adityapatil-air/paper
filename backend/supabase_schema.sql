-- Supabase schema for Research Paper Review Platform
-- This file is meant to be run in the Supabase SQL editor.

-- Optional: required for crypt() and bcrypt password hashing
create extension if not exists pgcrypto;

-- =========================
-- ENUM TYPES
-- =========================

-- User roles
create type user_role as enum ('author', 'reviewer', 'admin', 'editor');

-- Paper status
create type paper_status as enum ('submitted', 'under_review', 'published', 'rejected');

-- Payment status
create type payment_status as enum ('pending', 'paid');

-- Reviewer recommendation options
create type review_recommendation as enum (
  'accept',
  'accept_with_revisions',
  'reject_with_revisions',
  'reject'
);

-- =========================
-- USERS
-- =========================

create table if not exists public.users (
  id            bigserial primary key,
  email         text not null unique,
  password_hash text not null,
  name          text not null,
  role          user_role not null default 'author',
  affiliation   text,
  department    text,
  expertise     text[] default '{}',

  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

create index if not exists users_role_idx on public.users (role);

-- =========================
-- PAPERS
-- =========================

create table if not exists public.papers (
  id               bigserial primary key,
  main_author_id   bigint references public.users(id) on delete set null,

  title            text not null,
  authors          text[] not null default '{}',
  abstract         text,
  keywords         text[] not null default '{}',
  category         text,
  word_count       integer,

  status           paper_status not null default 'submitted',
  submission_date  date not null default current_date,
  publication_date date,
  doi              text unique,
  citation_count   integer default 0,

  submission_fee   numeric(10,2) default 150,
  payment_status   payment_status not null default 'pending',

  review_deadline  date,

  pdf_url          text,

  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create index if not exists papers_status_idx on public.papers (status);
create index if not exists papers_category_idx on public.papers (category);
create index if not exists papers_main_author_idx on public.papers (main_author_id);

-- =========================
-- PAPER AUTHORS (OPTIONAL)
-- =========================

create table if not exists public.paper_authors (
  id               bigserial primary key,
  paper_id         bigint not null references public.papers(id) on delete cascade,
  full_name        text not null,
  affiliation      text,
  email            text,
  is_corresponding boolean not null default false,
  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists paper_authors_paper_idx on public.paper_authors (paper_id);
create index if not exists paper_authors_email_idx on public.paper_authors (email);

-- =========================
-- REVIEW ASSIGNMENTS
-- =========================

create table if not exists public.review_assignments (
  id          bigserial primary key,
  paper_id    bigint not null references public.papers(id) on delete cascade,
  reviewer_id bigint not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),

  unique (paper_id, reviewer_id)
);

create index if not exists review_assignments_reviewer_idx on public.review_assignments (reviewer_id);
create index if not exists review_assignments_paper_idx on public.review_assignments (paper_id);

-- =========================
-- REVIEWS
-- =========================

create table if not exists public.reviews (
  id               bigserial primary key,
  paper_id         bigint not null references public.papers(id) on delete cascade,
  reviewer_id      bigint not null references public.users(id) on delete cascade,
  reviewer_name    text,

  rating           integer not null check (rating between 1 and 5),
  recommendation   review_recommendation not null,
  comments         text not null,

  submitted_date   date not null default current_date,
  status           text not null default 'completed',

  created_at       timestamptz not null default timezone('utc', now())
);

create index if not exists reviews_paper_idx on public.reviews (paper_id);
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);

-- =========================
-- NOTIFICATIONS
-- =========================

create table if not exists public.notifications (
  id         bigserial primary key,
  user_id    bigint not null references public.users(id) on delete cascade,
  title      text not null,
  message    text not null,
  type       text not null,
  read       boolean not null default false,
  timestamp  timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- =========================
-- SITE SETTINGS (KEY/VALUE)
-- =========================

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

-- =========================
-- JOURNAL ISSUES
-- =========================

create table if not exists public.issues (
  id         bigserial primary key,
  volume     integer not null,
  issue      integer not null,
  month      text,
  year       integer not null,
  is_current boolean not null default false,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists issues_year_idx on public.issues (year, volume, issue);
create index if not exists issues_current_idx on public.issues (is_current);

-- =========================
-- ISSUE-PAPER MAPPING
-- =========================

create table if not exists public.issue_papers (
  id       bigserial primary key,
  issue_id bigint not null references public.issues(id) on delete cascade,
  paper_id bigint not null references public.papers(id) on delete cascade,

  unique (issue_id, paper_id)
);

create index if not exists issue_papers_issue_idx on public.issue_papers (issue_id);
create index if not exists issue_papers_paper_idx on public.issue_papers (paper_id);
