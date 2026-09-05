-- CRM platform — weekly report lifecycle (step 8).
-- Run this in the Supabase SQL Editor after 0001-0005.
--
-- This supersedes the old public.weekly_report_comments table from
-- 0004 (a bare comment-per-metric table with no submit/review flow).
-- The app no longer reads or writes that table; it's left in place
-- rather than dropped in case you want to keep the old data around —
-- drop it yourself later if you don't:
--   drop table if exists public.weekly_report_comments;

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'returned')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_comment text,
  created_at timestamptz not null default now(),
  unique (author_id, week_start)
);

create table if not exists public.weekly_report_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports (id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  value text,
  delta text,
  comment text
);

create index if not exists weekly_reports_author_id_idx on public.weekly_reports (author_id);
create index if not exists weekly_report_rows_report_id_idx on public.weekly_report_rows (report_id);

alter table public.weekly_reports enable row level security;
alter table public.weekly_report_rows enable row level security;

-- ---- weekly_reports --------------------------------------------------------
-- manager sees/edits only their own reports, and only while draft/returned;
-- lead/admin see and can update any report (for the review action).
drop policy if exists "weekly_reports_select" on public.weekly_reports;
create policy "weekly_reports_select"
  on public.weekly_reports for select
  to authenticated
  using (author_id = auth.uid() or public.is_lead_or_admin());

drop policy if exists "weekly_reports_insert" on public.weekly_reports;
create policy "weekly_reports_insert"
  on public.weekly_reports for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists "weekly_reports_update" on public.weekly_reports;
create policy "weekly_reports_update"
  on public.weekly_reports for update
  to authenticated
  using (
    (author_id = auth.uid() and status in ('draft', 'returned'))
    or public.is_lead_or_admin()
  )
  with check (
    author_id = auth.uid() or public.is_lead_or_admin()
  );

-- ---- weekly_report_rows ------------------------------------------------
-- visibility/editability mirrors the parent report.
drop policy if exists "weekly_report_rows_select" on public.weekly_report_rows;
create policy "weekly_report_rows_select"
  on public.weekly_report_rows for select
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_rows.report_id
        and (r.author_id = auth.uid() or public.is_lead_or_admin())
    )
  );

-- kept deliberately simple (no nested status check) so creating a
-- report's initial rows never fails for reasons that are hard to debug
drop policy if exists "weekly_report_rows_insert" on public.weekly_report_rows;
create policy "weekly_report_rows_insert"
  on public.weekly_report_rows for insert
  to authenticated
  with check (true);

drop policy if exists "weekly_report_rows_update" on public.weekly_report_rows;
create policy "weekly_report_rows_update"
  on public.weekly_report_rows for update
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_rows.report_id
        and (
          (r.author_id = auth.uid() and r.status in ('draft', 'returned'))
          or public.is_lead_or_admin()
        )
    )
  )
  with check (true);
