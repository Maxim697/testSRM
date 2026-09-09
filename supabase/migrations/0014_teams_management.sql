-- CRM platform — team structure management for admins (step 15).
-- Run this in the Supabase SQL Editor after 0001-0013.
--
-- 0013 added public.teams with a select-only policy ("managing teams
-- isn't a feature yet"). It is now — the "Доступи" screen's new
-- "Структура" tab lets an admin create/rename/delete teams and change
-- their lead, all as real client-side writes instead of only via the
-- Supabase dashboard / service role. This migration only adds the
-- missing write policies and extends two check constraints; nothing
-- about profiles/traders/etc. RLS changes (profiles_update_admin from
-- 0005 already covers every profiles.role / profiles.team_id write this
-- feature needs, since it's unconditionally admin-only).

-- =========================================================================
-- teams — admin-only insert/update/delete. Select stays "everyone logged
-- in" from 0013 (team names aren't sensitive).
-- =========================================================================

drop policy if exists "teams_insert_admin" on public.teams;
create policy "teams_insert_admin"
  on public.teams for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "teams_update_admin" on public.teams;
create policy "teams_update_admin"
  on public.teams for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "teams_delete_admin" on public.teams;
create policy "teams_delete_admin"
  on public.teams for delete
  to authenticated
  using (public.is_admin());

-- =========================================================================
-- audit_log — a new entity_type for team-level actions (create/rename/
-- delete a team, change its lead, move a manager between teams).
-- =========================================================================

alter table public.audit_log drop constraint if exists audit_log_entity_type_check;
alter table public.audit_log add constraint audit_log_entity_type_check
  check (entity_type in ('trader', 'profile', 'task', 'report', 'dashboard', 'team'));

-- =========================================================================
-- notifications — a new kind for team-structure changes (moved to/from a
-- team, promoted/demoted as a team's lead).
-- =========================================================================

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (
    kind in (
      'report_returned',
      'report_approved',
      'task_assigned',
      'portfolio_transferred',
      'trader_high_risk',
      'team_changed'
    )
  );
