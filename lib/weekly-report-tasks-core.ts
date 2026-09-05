import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeekRange } from "@/lib/week-range";
import type { TaskKind, TaskStatus } from "@/lib/types";

export type WeeklyTaskWithNote = {
  id: string;
  title: string;
  kind: TaskKind | null;
  status: TaskStatus;
  due_date: string | null;
  trader_id: string | null;
  trader_code: string | null;
  comment: string;
};

export async function getWeeklyTasksWithNotesData(
  supabase: SupabaseClient,
  authorId: string,
  weekStart: string,
  reportId: string,
): Promise<WeeklyTaskWithNote[]> {
  const { endDate } = getWeekRange(weekStart);

  const [tasksRes, notesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, kind, status, due_date, trader_id, trader:traders(code)")
      .eq("assignee_id", authorId)
      .gte("due_date", weekStart)
      .lte("due_date", endDate)
      .order("due_date"),
    supabase.from("weekly_report_task_notes").select("*").eq("report_id", reportId),
  ]);

  const noteByTask = new Map(
    ((notesRes.data ?? []) as { task_id: string; comment: string | null }[]).map((n) => [
      n.task_id,
      n.comment ?? "",
    ]),
  );

  return ((tasksRes.data ?? []) as unknown as (WeeklyTaskWithNote & { trader: { code: string } | null })[]).map(
    (t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
      status: t.status,
      due_date: t.due_date,
      trader_id: t.trader_id,
      trader_code: t.trader?.code ?? null,
      comment: noteByTask.get(t.id) ?? "",
    }),
  );
}
