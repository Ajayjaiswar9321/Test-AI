-- Run this SQL in Supabase SQL Editor before enabling SUPABASE_* env vars.

create table if not exists public.users (
  id bigserial primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.test_runs (
  id text primary key,
  type text not null,
  status text not null,
  logs text not null,
  created_at timestamptz not null default now()
);

-- Optional hardening:
-- alter table public.users enable row level security;
-- alter table public.test_runs enable row level security;
-- Service role key bypasses RLS, so backend writes still work.
