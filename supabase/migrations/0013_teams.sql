-- CRM platform — teams as a real entity + team-scoped RLS (step 14).
-- Run this in the Supabase SQL Editor after 0001-0012.
--
-- Adds public.teams and profiles.team_id, migrates existing users into
-- two teams, then rewrites every RLS policy that used to grant a lead
-- blanket "see/edit everything" access (via is_lead_or_admin()) so a
-- lead is instead scoped to their own team — a manager belonging to
-- their team, or a trader/task/report/interaction belonging to one of
-- those managers. Admin is unaffected (still sees/edits everything).

-- =========================================================================
-- SCHEMA
-- =========================================================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- one lead per team
create unique index if not exists teams_lead_id_uidx on public.teams (lead_id) where lead_id is not null;

alter table public.profiles
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists profiles_team_id_idx on public.profiles (team_id);

comment on column public.profiles.team_id is
  'Which team this person belongs to. A manager belongs to one team. A '
  'lead belongs to the team where teams.lead_id points back at them — '
  'kept as a plain column rather than derived, so RLS checks below stay a '
  'single indexed lookup. Admins are not members of any team (null).';

alter table public.teams enable row level security;

-- Team names aren't sensitive — same "visible to everyone logged in"
-- rule as profiles/news. No insert/update/delete policy: managing teams
-- (creating one, changing its lead) isn't a feature yet, so only the
-- Supabase dashboard / service role can write here for now, same as
-- traders/tasks/interactions/trader_weekly were before 0003 added
-- screens for them.
drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
  on public.teams for select
  to authenticated
  using (true);

-- =========================================================================
-- DATA MIGRATION — two teams from whatever leads/managers already exist.
-- Generic on purpose (looks up profiles by role, not hardcoded ids/emails)
-- so it works whether this runs against the seed data or real accounts.
-- =========================================================================

do $$
declare
  team1_id uuid;
  team2_id uuid;
  the_lead_id uuid;
  manager_ids uuid[];
  first_half int;
begin
  -- Only do this once — if teams already exist, assume this migration
  -- already ran (re-running it would create duplicate teams).
  if exists (select 1 from public.teams) then
    raise notice 'public.teams already has rows — skipping the data migration below.';
  else
    insert into public.teams (name) values ('Команда Мумбаї') returning id into team1_id;
    insert into public.teams (name) values ('Команда Делі') returning id into team2_id;

    -- The one existing lead (if there happen to be more than one, the
    -- oldest becomes team 1's lead — everything below still holds
    -- together, it just means only the first lead gets a team here).
    select id into the_lead_id
    from public.profiles
    where role = 'lead'
    order by created_at
    limit 1;

    if the_lead_id is not null then
      update public.profiles set team_id = team1_id where id = the_lead_id;
      update public.teams set lead_id = the_lead_id where id = team1_id;
    end if;
    -- else: only ever happens if there's no lead at all yet — team2 (and
    -- team1, here) both stay lead-less, which is fine, not the specific
    -- "one lead" case the instructions called out but handled the same way.

    -- Existing managers, oldest first: the first half (rounded up) join
    -- the lead's team, the rest form the second team.
    select array_agg(id order by created_at)
    into manager_ids
    from public.profiles
    where role = 'manager';

    if manager_ids is not null and array_length(manager_ids, 1) > 0 then
      first_half := ceil(array_length(manager_ids, 1) / 2.0);

      update public.profiles
      set team_id = team1_id
      where id = any (manager_ids[1:first_half]);

      if array_length(manager_ids, 1) > first_half then
        update public.profiles
        set team_id = team2_id
        where id = any (manager_ids[first_half + 1:array_length(manager_ids, 1)]);
      end if;
    end if;

    -- admins explicitly stay team_id = null — nothing to do, that's the
    -- column default.
  end if;
end $$;

-- =========================================================================
-- HELPERS
-- =========================================================================

create or replace function public.is_lead()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'lead'
  );
$$;

-- Is target_id a profile on the current user's own team? False for a
-- null target (nothing to compare), false for the current user's own
-- team_id being null (admins aren't "on a team" with anyone).
create or replace function public.same_team(target_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles them on them.id = target_id
    where me.id = auth.uid()
      and me.team_id is not null
      and me.team_id = them.team_id
  );
$$;

-- The one rule this whole migration is about: can the current user see /
-- act on something that belongs to target_id? Yes if target_id is
-- themselves, yes for an admin regardless of target, yes for a lead only
-- when target_id is on their own team. Replaces is_lead_or_admin() in
-- every policy below that used to mean "lead sees everything" — that
-- function itself is untouched and still used as-is where "lead or
-- admin" (not team-scoped) is still the right rule (news posting, audit
-- log, the "is this a privileged actor at all" half of portfolio
-- transfers).
create or replace function public.can_view_user(target_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    target_id = auth.uid()
    or public.is_admin()
    or (public.is_lead() and public.same_team(target_id));
$$;

-- =========================================================================
-- TRADERS — manager sees their own; lead sees their team's managers'
-- traders; admin sees all.
-- =========================================================================

drop policy if exists "traders_select" on public.traders;
create policy "traders_select"
  on public.traders for select
  to authenticated
  using (public.can_view_user(manager_id));

-- Also governs portfolio transfers: USING checks the trader's *current*
-- manager (must be visible to the actor), WITH CHECK checks the *new*
-- manager_id being written — so a lead can only move a trader between
-- two managers who are both on their own team, while an admin can move
-- between any two managers (can_view_user is unconditionally true for
-- an admin regardless of target).
drop policy if exists "traders_update" on public.traders;
create policy "traders_update"
  on public.traders for update
  to authenticated
  using (public.can_view_user(manager_id))
  with check (public.can_view_user(manager_id));

-- =========================================================================
-- TASKS — trader-linked tasks cascade through traders_select above via
-- the EXISTS check (unchanged); only the "no trader" branch (general /
-- team tasks) needed its is_lead_or_admin() swapped for can_view_user()
-- so it's scoped to the assignee's team instead of every lead/admin.
-- =========================================================================

drop policy if exists "tasks_select" on public.tasks;
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
      and public.can_view_user(assignee_id)
    )
  );

-- insert: a manager may only create a task for themselves; a lead only
-- for a manager on their own team (or themselves); admin for anyone.
-- created_by can't be spoofed as someone else, same as before.
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_view_user(assignee_id)
  );

-- update: anyone who can currently view the assignee (lead: same team;
-- admin: anyone), the assignee themselves (to work it), or the creator
-- (to edit what they set up — kept independent of team so a lead who
-- created a task for someone still keeps edit access even in the edge
-- case of that person later moving teams; "creator can always edit
-- their own creation" was already the rule before this migration).
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (
    public.can_view_user(assignee_id)
    or created_by = auth.uid()
  )
  with check (
    public.can_view_user(assignee_id)
    or created_by = auth.uid()
  );

-- the field-lock trigger's "am I a full editor of this task" bypass —
-- was is_lead_or_admin() (any lead, any task); now scoped to the task's
-- own (pre-update) assignee being on the acting lead's team, same rule
-- as everywhere else.
create or replace function public.tasks_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  if new.status = 'done'
     and new.created_by is not null
     and new.created_by is distinct from new.assignee_id
     and (new.result_comment is null or btrim(new.result_comment) = '')
  then
    raise exception 'result_comment is required to close a task assigned by someone else';
  end if;

  if not public.can_view_user(old.assignee_id)
     and old.created_by is not null
     and old.created_by is distinct from auth.uid()
  then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.kind is distinct from old.kind
       or new.trader_id is distinct from old.trader_id
       or new.due_date is distinct from old.due_date
       or new.priority is distinct from old.priority
       or new.assignee_id is distinct from old.assignee_id
       or new.created_by is distinct from old.created_by
    then
      raise exception 'Only status and result_comment can be changed on a task assigned by someone else';
    end if;
  end if;

  return new;
end;
$$;

-- =========================================================================
-- INTERACTIONS — insert had been simplified to "any authenticated user"
-- in 0005 while writes were being debugged; restoring the original
-- trader-visibility check now that traders_select is team-scoped means
-- this becomes team-scoped too, for free, via the same EXISTS cascade
-- (interactions_select from 0001 already used this pattern and needs no
-- change).
-- =========================================================================

drop policy if exists "interactions_insert" on public.interactions;
create policy "interactions_insert"
  on public.interactions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.traders t where t.id = interactions.trader_id)
  );

-- =========================================================================
-- WEEKLY REPORTS — manager sees/edits only their own; lead sees/edits
-- their team's; admin any.
-- =========================================================================

drop policy if exists "weekly_reports_select" on public.weekly_reports;
create policy "weekly_reports_select"
  on public.weekly_reports for select
  to authenticated
  using (public.can_view_user(author_id));

-- NOTE: can_view_user(author_id) is unconditionally true for the report's
-- own author (self is always visible to self) — so the self-edit branch
-- below must stay its own separate, status-gated condition rather than
-- folding into an `or public.can_view_user(author_id)`, or the OR would
-- let an author "or" their way past the draft/returned lock via the
-- can_view_user branch alone. The non-self branch (a lead/admin
-- reviewing someone else's report) is deliberately not status-gated —
-- that's the whole point of the review action.
drop policy if exists "weekly_reports_update" on public.weekly_reports;
create policy "weekly_reports_update"
  on public.weekly_reports for update
  to authenticated
  using (
    (author_id = auth.uid() and status in ('draft', 'returned'))
    or (author_id <> auth.uid() and public.can_view_user(author_id))
  )
  with check (
    public.can_view_user(author_id)
  );

-- weekly_report_rows / weekly_report_task_notes: visibility/editability
-- mirrors the parent report, same as before — just swapping in
-- can_view_user() for the inline is_lead_or_admin() check.

drop policy if exists "weekly_report_rows_select" on public.weekly_report_rows;
create policy "weekly_report_rows_select"
  on public.weekly_report_rows for select
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_rows.report_id
        and public.can_view_user(r.author_id)
    )
  );

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
          or (r.author_id <> auth.uid() and public.can_view_user(r.author_id))
        )
    )
  )
  with check (true);

drop policy if exists "weekly_report_task_notes_select" on public.weekly_report_task_notes;
create policy "weekly_report_task_notes_select"
  on public.weekly_report_task_notes for select
  to authenticated
  using (
    exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_task_notes.report_id
        and public.can_view_user(r.author_id)
    )
  );

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
          or (r.author_id <> auth.uid() and public.can_view_user(r.author_id))
        )
    )
  )
  with check (true);

-- =========================================================================
-- PORTFOLIO TRANSFERS — a lead may only initiate a transfer where both
-- the source and destination manager are on their own team; admin any
-- pair. is_lead_or_admin() is kept alongside can_view_user() here (not
-- replaced) because it's still doing real work: can_view_user() alone
-- would also let a *manager* pass this check for a transfer entirely
-- within their own single-person "team view" (themselves), which isn't
-- meaningful for a manager (they can't transfer their own portfolio to
-- themselves) — is_lead_or_admin() is what actually restricts this
-- action to leads/admins in the first place, same as before.
-- =========================================================================

drop policy if exists "portfolio_transfers_insert_lead_admin" on public.portfolio_transfers;
create policy "portfolio_transfers_insert_lead_admin"
  on public.portfolio_transfers for insert
  to authenticated
  with check (
    initiated_by = auth.uid()
    and public.is_lead_or_admin()
    and public.can_view_user(from_manager_id)
    and public.can_view_user(to_manager_id)
  );
