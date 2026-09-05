import { createClient } from "@/lib/supabase/server";
import { getWeekRange } from "@/lib/week-range";

export type ActivityMetrics = {
  contacts_count: number;
  tasks_created: number;
  tasks_closed: number;
  zero_contact_traders: number;
};

/**
 * Computed at report-creation time, running in the author's own session —
 * RLS naturally scopes "traders"/"tasks" to their own portfolio, so no
 * explicit manager_id filtering is needed here (unlike the drilldown
 * builder, which may run in a lead's session looking at someone else's
 * report and has to filter explicitly).
 */
export async function computeActivityMetrics(
  authorId: string,
  weekStart: string,
): Promise<ActivityMetrics> {
  const supabase = await createClient();
  const { start, end } = getWeekRange(weekStart);

  const [interactionsRes, tasksCreatedRes, tasksClosedRes, tradersRes] = await Promise.all([
    supabase
      .from("interactions")
      .select("trader_id")
      .eq("author_id", authorId)
      .gte("created_at", start)
      .lt("created_at", end),
    // tasks *created by* this manager this week (their own act of planning),
    // as opposed to tasks assigned to them by someone else
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("created_by", authorId)
      .gte("created_at", start)
      .lt("created_at", end),
    // tasks this manager executed and closed this week, by actual
    // completion time rather than the due date
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", authorId)
      .eq("status", "done")
      .gte("completed_at", start)
      .lt("completed_at", end),
    supabase.from("traders").select("id"),
  ]);

  const contactedTraderIds = new Set((interactionsRes.data ?? []).map((i) => i.trader_id));
  const portfolioIds = (tradersRes.data ?? []).map((t) => t.id);
  const zeroContact = portfolioIds.filter((id) => !contactedTraderIds.has(id)).length;

  return {
    contacts_count: interactionsRes.data?.length ?? 0,
    tasks_created: tasksCreatedRes.count ?? 0,
    tasks_closed: tasksClosedRes.count ?? 0,
    zero_contact_traders: zeroContact,
  };
}
