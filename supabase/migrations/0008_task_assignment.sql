-- CRM platform — task assignment from lead to manager (step 8).
-- Run this in the Supabase SQL Editor after 0001-0007.

-- =========================================================================
-- SCHEMA
-- =========================================================================

alter table public.tasks
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  add column if not exists result_comment text,
  add column if not exists completed_at timestamptz,
  -- not explicitly requested in the schema list, but the "Поставити завдання"
  -- form needs somewhere to put the description field it asks for
  add column if not exists description text;

-- existing tasks were all self-assigned by their author before this step
update public.tasks set created_by = assignee_id where created_by is null;

create index if not exists tasks_created_by_idx on public.tasks (created_by);

-- =========================================================================
-- RLS — who can create / update a task
-- =========================================================================

-- insert: lead/admin may create a task for anyone; a manager may only
-- create a task for themselves. Whoever inserts the row is always its
-- creator (created_by can't be spoofed as someone else).
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_lead_or_admin() or assignee_id = auth.uid())
  );

-- update: visible to lead/admin (any task), the assignee (to work it), or
-- the creator (to edit what they set up). Which columns may actually change
-- is enforced below by a trigger, since RLS only ever works at row level.
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (
    public.is_lead_or_admin()
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.is_lead_or_admin()
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  );

-- =========================================================================
-- Column-level guard + auto-bookkeeping (BEFORE UPDATE trigger)
--
--   - completed_at is managed automatically from status transitions, not
--     client-supplied
--   - closing (status -> 'done') a task assigned by someone else requires
--     a non-empty result_comment
--   - an executor who is neither the task's creator nor lead/admin may only
--     change status / result_comment (completed_at is auto-managed) —
--     everything else (title, description, kind, trader, due date,
--     priority, assignee, creator) is frozen for them
-- =========================================================================

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

  if not public.is_lead_or_admin()
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

drop trigger if exists tasks_before_update on public.tasks;
create trigger tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();
