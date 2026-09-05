-- CRM platform — initial schema + RLS
-- Run this once in the Supabase SQL Editor (SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: guarded with "if not exists" / "or replace" where possible.

create extension if not exists pgcrypto;

-- =========================================================================
-- TABLES
-- =========================================================================

-- profiles: one row per auth.users row, holds app-level identity/role.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  telegram text,
  role text not null default 'manager' check (role in ('manager', 'lead', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.traders (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  tier text check (tier in ('gold', 'silver', 'bronze')),
  deposit numeric,
  manager_id uuid references public.profiles (id) on delete set null,
  status text check (status in ('green', 'amber', 'red')),
  score int,
  score_delta int,
  last_active date,
  cr numeric,
  sla_in text,
  sla_out text,
  turnover_week numeric,
  turnover_delta numeric,
  settlement numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text check (kind in ('daily', 'weekly', 'monthly')),
  trader_id uuid references public.traders (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  status text not null default 'in_progress' check (status in ('in_progress', 'done', 'overdue')),
  created_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind text check (kind in ('note', 'call', 'status_change', 'task_closed')),
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.trader_weekly (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders (id) on delete cascade,
  week_start date not null,
  score int,
  cr numeric,
  turnover numeric,
  status text,
  created_at timestamptz not null default now(),
  unique (trader_id, week_start)
);

-- =========================================================================
-- INDEXES (foreign keys used in RLS / lookups)
-- =========================================================================

create index if not exists traders_manager_id_idx on public.traders (manager_id);
create index if not exists tasks_trader_id_idx on public.tasks (trader_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);
create index if not exists interactions_trader_id_idx on public.interactions (trader_id);
create index if not exists trader_weekly_trader_id_idx on public.trader_weekly (trader_id);

-- =========================================================================
-- profiles auto-provisioning: create a profile row whenever a new
-- auth.users row is created, so every logged-in user has one immediately.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'manager'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.traders enable row level security;
alter table public.tasks enable row level security;
alter table public.interactions enable row level security;
alter table public.news enable row level security;
alter table public.trader_weekly enable row level security;

-- helper: is the current user a lead or admin?
-- Plain (invoker-rights) function is enough since the profiles select
-- policy below already lets any authenticated user read all profiles.
create or replace function public.is_lead_or_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('lead', 'admin')
  );
$$;

-- ---- profiles ----------------------------------------------------------
-- visible to everyone who is logged in
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- ---- traders -------------------------------------------------------------
-- manager sees only their own traders; lead/admin see all
create policy "traders_select"
  on public.traders for select
  to authenticated
  using (
    manager_id = auth.uid()
    or public.is_lead_or_admin()
  );

-- ---- tasks ---------------------------------------------------------------
-- visible if the linked trader is visible; tasks with no trader fall back
-- to the assignee (or lead/admin), since there is no trader to check against
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (
    (
      trader_id is not null
      and exists (select 1 from public.traders t where t.id = tasks.trader_id)
    )
    or (
      trader_id is null
      and (assignee_id = auth.uid() or public.is_lead_or_admin())
    )
  );

-- ---- interactions ----------------------------------------------------------
-- visible if the linked trader is visible
create policy "interactions_select"
  on public.interactions for select
  to authenticated
  using (
    exists (select 1 from public.traders t where t.id = interactions.trader_id)
  );

-- ---- news ------------------------------------------------------------------
-- visible to everyone logged in; only lead/admin can post
create policy "news_select_authenticated"
  on public.news for select
  to authenticated
  using (true);

create policy "news_insert_lead_admin"
  on public.news for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_lead_or_admin()
  );

-- ---- trader_weekly -----------------------------------------------------
-- visible if the linked trader is visible (same rule as interactions)
create policy "trader_weekly_select"
  on public.trader_weekly for select
  to authenticated
  using (
    exists (select 1 from public.traders t where t.id = trader_weekly.trader_id)
  );

-- Note: no insert/update/delete policies are defined yet for traders,
-- tasks, interactions or trader_weekly beyond what's listed above — those
-- come with the data-entry screens in a later step. Until then, only a
-- service-role key (or the Supabase dashboard) can write to those tables.
