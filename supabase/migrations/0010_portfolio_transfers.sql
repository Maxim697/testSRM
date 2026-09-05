-- CRM platform — portfolio transfer (step 11, block 2).
-- Run this in the Supabase SQL Editor after 0009_audit_log.sql.
--
-- IMPORTANT: as of this migration, "traders" has TWO foreign keys into
-- "profiles" (manager_id, previous_manager_id). Any existing PostgREST
-- embed like "manager:profiles(full_name)" becomes ambiguous (PGRST201)
-- and must use an explicit constraint-name hint, e.g.
-- "manager:profiles!traders_manager_id_fkey(full_name)" — this is the
-- same issue already hit (and fixed) for weekly_reports and tasks.

alter table public.traders
  add column if not exists previous_manager_id uuid references public.profiles (id) on delete set null;

create table if not exists public.portfolio_transfers (
  id uuid primary key default gen_random_uuid(),
  from_manager_id uuid references public.profiles (id) on delete set null,
  to_manager_id uuid references public.profiles (id) on delete set null,
  initiated_by uuid references public.profiles (id) on delete set null,
  traders_count int not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_transfers_created_at_idx on public.portfolio_transfers (created_at desc);

alter table public.portfolio_transfers enable row level security;

-- read: any authenticated user — a manager needs to see their own recent
-- transfers to power the "recently transferred" hint on the trader card.
drop policy if exists "portfolio_transfers_select_authenticated" on public.portfolio_transfers;
create policy "portfolio_transfers_select_authenticated"
  on public.portfolio_transfers for select
  to authenticated
  using (true);

-- write: only lead/admin may initiate a transfer, and only as themselves.
drop policy if exists "portfolio_transfers_insert_lead_admin" on public.portfolio_transfers;
create policy "portfolio_transfers_insert_lead_admin"
  on public.portfolio_transfers for insert
  to authenticated
  with check (initiated_by = auth.uid() and public.is_lead_or_admin());
