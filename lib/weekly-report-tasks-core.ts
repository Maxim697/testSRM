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
  created_by: string | null;
  creator_name: string | null;
  result_comment: string | null;
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
      // tasks has two FKs into profiles (assignee_id, created_by) — needs an
      // explicit constraint-name hint or the embed is ambiguous (PGRST201)
      .select(
        "id, title, kind, status, due_date, trader_id, created_by, result_comment, trader:traders(code), creator:profiles!tasks_created_by_fkey(full_name)",
      )
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

  type TaskRow = Omit<WeeklyTaskWithNote, "trader_code" | "creator_name" | "comment"> & {
    trader: { code: string } | null;
    creator: { full_name: string | null } | null;
  };

  return ((tasksRes.data ?? []) as unknown as TaskRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    kind: t.kind,
    status: t.status,
    due_date: t.due_date,
    trader_id: t.trader_id,
    trader_code: t.trader?.code ?? null,
    created_by: t.created_by,
    creator_name: t.creator?.full_name ?? null,
    result_comment: t.result_comment,
    comment: noteByTask.get(t.id) ?? "",
  }));
}
