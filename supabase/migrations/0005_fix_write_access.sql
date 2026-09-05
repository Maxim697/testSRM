-- CRM platform — fix write access (step 7, block 1).
-- Run this in the Supabase SQL Editor after 0001-0004.
--
-- OPTIONAL — run this first if you want to see what's currently there
-- before the fix replaces it:
--
--   select schemaname, tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('tasks', 'interactions', 'news', 'profiles', 'traders')
--   order by tablename, cmd;
--
-- Everything below is written with "drop policy if exists" first, so it's
-- safe to run regardless of whether 0003_write_policies.sql ever actually
-- ran on this database (that's the most likely reason writes were failing —
-- 0001 only ever created SELECT policies).

-- ---------------------------------------------------------------------------
-- tasks / interactions insert — deliberately as simple as possible:
-- any authenticated user can insert. No role checks, no trader-visibility
-- checks. Tighten later once the basics are confirmed working.
-- ---------------------------------------------------------------------------
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (true);

drop policy if exists "interactions_insert" on public.interactions;
create policy "interactions_insert"
  on public.interactions for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- tasks update — change status / edit a task you can see. Re-issued as-is
-- (not simplified) in case 0003 never ran.
-- ---------------------------------------------------------------------------
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- traders update — needed for churn-page status changes and for admin/lead
-- reassigning a trader's manager. Simplified to "any authenticated user"
-- to match the rest of this pass; revisit once writes are confirmed stable.
-- ---------------------------------------------------------------------------
drop policy if exists "traders_update" on public.traders;
create policy "traders_update"
  on public.traders for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- news insert — kept restricted to lead/admin (not part of the "make it
-- simple" ask, just re-issued so it definitely exists).
-- ---------------------------------------------------------------------------
drop policy if exists "news_insert_lead_admin" on public.news;
create policy "news_insert_lead_admin"
  on public.news for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_lead_or_admin()
  );

-- ---------------------------------------------------------------------------
-- profiles update — needed for the "Доступи" screen's role management.
-- Only an admin can update a profile row (their own or someone else's).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
