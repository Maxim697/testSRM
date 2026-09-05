-- CRM platform — write policies for the data-entry screens (step 4).
-- Run this in the Supabase SQL Editor AFTER 0001 and 0002.
--
-- 0001 only defined SELECT policies (deliberately — see the note at the
-- bottom of that file). This adds the INSERT/UPDATE policies needed by:
--   - trader card: add note (interactions), create task (tasks)
--   - trader card / tasks tab: change task status (tasks)
--   - churn page: change trader status + save a comment (traders, interactions)

-- ---- interactions: insert a note/call/status_change/task_closed record ---
-- allowed if the author is the current user and the trader is one they
-- can already see (same visibility rule as interactions_select)
create policy "interactions_insert"
  on public.interactions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.traders t where t.id = interactions.trader_id)
  );

-- ---- tasks: create a task (trader-linked or general) ---------------------
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    (
      trader_id is not null
      and exists (select 1 from public.traders t where t.id = tasks.trader_id)
    )
    or (
      trader_id is null
      and (assignee_id = auth.uid() or public.is_lead_or_admin())
    )
  );

-- ---- tasks: change status / edit a task you can see -----------------------
create policy "tasks_update"
  on public.tasks for update
  to authenticated
  using (
    (
      trader_id is not null
      and exists (select 1 from public.traders t where t.id = tasks.trader_id)
    )
    or (
      trader_id is null
      and (assignee_id = auth.uid() or public.is_lead_or_admin())
    )
  )
  with check (
    (
      trader_id is not null
      and exists (select 1 from public.traders t where t.id = tasks.trader_id)
    )
    or (
      trader_id is null
      and (assignee_id = auth.uid() or public.is_lead_or_admin())
    )
  );

-- ---- traders: change status (churn page) ----------------------------------
-- same rule as traders_select: manager can update their own traders,
-- lead/admin can update any
create policy "traders_update"
  on public.traders for update
  to authenticated
  using (manager_id = auth.uid() or public.is_lead_or_admin())
  with check (manager_id = auth.uid() or public.is_lead_or_admin());
