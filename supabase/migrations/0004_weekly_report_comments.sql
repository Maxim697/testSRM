-- CRM platform — weekly report comments (step 6).
-- Run this in the Supabase SQL Editor after 0001-0003.
--
-- The weekly report's numeric rows are all computed live from traders /
-- trader_weekly / tasks — only the "Коментар" column needs a place to
-- persist, keyed by which week and which metric row it belongs to.

create table if not exists public.weekly_report_comments (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  metric_key text not null,
  comment text,
  author_id uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (week_start, metric_key)
);

alter table public.weekly_report_comments enable row level security;

create policy "weekly_report_comments_select"
  on public.weekly_report_comments for select
  to authenticated
  using (true);

create policy "weekly_report_comments_insert"
  on public.weekly_report_comments for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "weekly_report_comments_update"
  on public.weekly_report_comments for update
  to authenticated
  using (true)
  with check (author_id = auth.uid());
