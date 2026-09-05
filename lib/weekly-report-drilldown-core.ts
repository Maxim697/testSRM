import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeekRange } from "@/lib/week-range";
import { daysSince, formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { DrilldownItem } from "@/components/weekly-report/metric-drilldown-modal";

type TaskRow = { id: string; title: string; due_date: string | null; trader_id: string | null };

/**
 * Builds the "what makes up this number" lists for every metric row,
 * scoped explicitly to `authorId`'s portfolio — this runs both from the
 * manager's own session (server) and from a lead/admin's session (client,
 * via the review modal), so it can't rely on RLS self-scoping the way
 * report *creation* does; every query filters by the author's
 * traders/assignments directly. Takes the Supabase client as a parameter
 * (rather than constructing one) so this same logic works from both a
 * Server Component and a Client Component without pulling server-only
 * cookie APIs into the client bundle.
 */
export async function buildDrilldownData(
  supabase: SupabaseClient,
  authorId: string,
  weekStart: string,
): Promise<Record<string, DrilldownItem[]>> {
  const { start, end, endDate } = getWeekRange(weekStart);

  const { data: tradersData } = await supabase
    .from("traders")
    .select("id, code")
    .eq("manager_id", authorId);
  const traders = (tradersData ?? []) as { id: string; code: string }[];
  const traderIds = traders.map((t) => t.id);
  const codeById = new Map(traders.map((t) => [t.id, t.code]));

  const [weeklyRes, interactionsThisWeekRes, allInteractionsRes, tasksCreatedRes, tasksClosedRes, overdueByTraderRes, overdueGeneralRes] =
    await Promise.all([
      traderIds.length
        ? supabase
            .from("trader_weekly")
            .select("trader_id, score, cr, turnover, status")
            .eq("week_start", weekStart)
            .in("trader_id", traderIds)
        : Promise.resolve({ data: [] as { trader_id: string; score: number | null; cr: number | null; turnover: number | null; status: string | null }[] }),
      supabase
        .from("interactions")
        .select("trader_id, created_at")
        .eq("author_id", authorId)
        .gte("created_at", start)
        .lt("created_at", end),
      traderIds.length
        ? supabase.from("interactions").select("trader_id, created_at").in("trader_id", traderIds)
        : Promise.resolve({ data: [] as { trader_id: string; created_at: string }[] }),
      supabase
        .from("tasks")
        .select("id, title, due_date, trader_id")
        .eq("assignee_id", authorId)
        .gte("created_at", start)
        .lt("created_at", end),
      supabase
        .from("tasks")
        .select("id, title, due_date, trader_id")
        .eq("assignee_id", authorId)
        .eq("status", "done")
        .gte("due_date", weekStart)
        .lte("due_date", endDate),
      traderIds.length
        ? supabase.from("tasks").select("id, title, due_date, trader_id").eq("status", "overdue").in("trader_id", traderIds)
        : Promise.resolve({ data: [] as TaskRow[] }),
      supabase
        .from("tasks")
        .select("id, title, due_date, trader_id")
        .eq("status", "overdue")
        .is("trader_id", null)
        .eq("assignee_id", authorId),
    ]);

  const weekly = (weeklyRes.data ?? []) as { trader_id: string; score: number | null; cr: number | null; turnover: number | null; status: string | null }[];
  const traderItem = (traderId: string, meta?: string): DrilldownItem => ({
    id: traderId,
    label: codeById.get(traderId) ?? traderId,
    meta,
    href: `/trader/${traderId}`,
  });
  const taskItem = (t: TaskRow): DrilldownItem => ({
    id: t.id,
    label: t.title,
    meta: t.due_date ? formatDate(t.due_date) : undefined,
    href: t.trader_id ? `/trader/${t.trader_id}` : undefined,
  });

  const overdueTasks = [
    ...((overdueByTraderRes.data ?? []) as TaskRow[]),
    ...((overdueGeneralRes.data ?? []) as TaskRow[]),
  ];

  const interactionsThisWeek = (interactionsThisWeekRes.data ?? []) as { trader_id: string; created_at: string }[];
  const contactedThisWeek = new Set(interactionsThisWeek.map((i) => i.trader_id));
  const zeroContactThisWeek = traders.filter((t) => !contactedThisWeek.has(t.id));

  const lastContactByTrader = new Map<string, string>();
  for (const row of (allInteractionsRes.data ?? []) as { trader_id: string; created_at: string }[]) {
    const cur = lastContactByTrader.get(row.trader_id);
    if (!cur || row.created_at > cur) lastContactByTrader.set(row.trader_id, row.created_at);
  }
  const noContact5d = traders.filter((t) => {
    const last = lastContactByTrader.get(t.id);
    const days = daysSince(last ?? null);
    return days === null || days >= 5;
  });

  return {
    active_traders: weekly.map((w) => traderItem(w.trader_id)),
    turnover: [...weekly]
      .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0))
      .map((w) => traderItem(w.trader_id, formatNumber(w.turnover))),
    cr: [...weekly].sort((a, b) => (b.cr ?? 0) - (a.cr ?? 0)).map((w) => traderItem(w.trader_id, formatPercent(w.cr))),
    score: [...weekly]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((w) => traderItem(w.trader_id, w.score?.toString())),
    green: weekly.filter((w) => w.status === "green").map((w) => traderItem(w.trader_id)),
    amber: weekly.filter((w) => w.status === "amber").map((w) => traderItem(w.trader_id)),
    red: weekly.filter((w) => w.status === "red").map((w) => traderItem(w.trader_id)),
    no_contact_5d: noContact5d.map((t) => traderItem(t.id)),
    overdue_tasks: overdueTasks.map(taskItem),
    contacts_count: interactionsThisWeek.map((i, idx) => ({
      id: `${i.trader_id}-${idx}`,
      label: codeById.get(i.trader_id) ?? i.trader_id,
      meta: formatDate(i.created_at),
      href: `/trader/${i.trader_id}`,
    })),
    tasks_created: ((tasksCreatedRes.data ?? []) as TaskRow[]).map(taskItem),
    tasks_closed: ((tasksClosedRes.data ?? []) as TaskRow[]).map(taskItem),
    zero_contact_traders: zeroContactThisWeek.map((t) => traderItem(t.id)),
  };
}
