-- CRM platform — audit log (step 11, block 1).
-- Run this in the Supabase SQL Editor after 0001-0008.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null check (entity_type in ('trader', 'profile', 'task', 'report', 'dashboard')),
  entity_id uuid,
  entity_label text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

-- read: lead/admin only
drop policy if exists "audit_log_select_lead_admin" on public.audit_log;
create policy "audit_log_select_lead_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_lead_or_admin());

-- write: any authenticated user, but only as themselves — no spoofing another actor_id
drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
create policy "audit_log_insert_authenticated"
  on public.audit_log for insert
  to authenticated
  with check (actor_id = auth.uid());

-- no update/delete policy for anyone — the log is append-only and immutable
-- (RLS enabled + no matching policy = denied by default).
