-- CRM platform — in-app notifications (step 13, block 2).
-- Run this in the Supabase SQL Editor after 0011_profiles_is_active.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (
    kind in (
      'report_returned',
      'report_approved',
      'task_assigned',
      'portfolio_transferred',
      'trader_high_risk'
    )
  ),
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- select/update: only your own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- insert: any authenticated user may create a notification for anyone —
-- the whole point is that ONE person's action (a lead reviewing a report,
-- assigning a task, transferring a portfolio) notifies a DIFFERENT person.
drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
  on public.notifications for insert
  to authenticated
  with check (true);
