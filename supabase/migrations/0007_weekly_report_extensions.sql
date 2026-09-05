-- CRM platform — weekly report extensions (step 9).
-- Run this in the Supabase SQL Editor after 0001-0006.
--
-- Adds free-text "Робота за тиждень" fields directly on weekly_reports,
-- and a small side table for per-task comments in the new
-- "Завдання за тиждень" section. Editability of both is governed by the
-- existing weekly_reports_update / weekly_report_rows-style policies —
-- a manager can only touch either while their report is draft/returned.

alter table public.weekly_reports
  add column if not exists work_done text,
  add column if not exists blockers text,
  add column if not exists help_needed text,
  add column if not exists next_week_plan text;

create table if not exists public.weekly_report_task_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  comment text,
  unique (report_id, task_id)
);

create index if not exists weekly_report_task_notes_report_id_idx
  on public.weekly_report_task_notes (report_id);

alter table public.weekly_report_task_notes enable row level security;

drop policy if exists "weekly_report_task_notes_select" on public.weekly_report_task_notes;
create policy "weekly_report_task_notes_select"
  on public.weekly_report_task_notes for select
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_task_notes.report_id
        and (r.author_id = auth.uid() or public.is_lead_or_admin())
    )
  );

-- kept simple, same reasoning as weekly_report_rows_insert
drop policy if exists "weekly_report_task_notes_insert" on public.weekly_report_task_notes;
create policy "weekly_report_task_notes_insert"
  on public.weekly_report_task_notes for insert
  to authenticated
  with check (true);

drop policy if exists "weekly_report_task_notes_update" on public.weekly_report_task_notes;
create policy "weekly_report_task_notes_update"
  on public.weekly_report_task_notes for update
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_task_notes.report_id
        and (
          (r.author_id = auth.uid() and r.status in ('draft', 'returned'))
          or public.is_lead_or_admin()
        )
    )
  )
  with check (true);
