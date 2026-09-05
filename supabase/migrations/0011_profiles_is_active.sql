-- CRM platform — user deactivation (step 13, block 1).
-- Run this in the Supabase SQL Editor after 0001-0010.

alter table public.profiles
  add column if not exists is_active boolean not null default true;
