import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "@/lib/types";

// tasks has two FKs into profiles (assignee_id, created_by) — the shorthand
// embed syntax is ambiguous for PostgREST, so every embed needs an explicit
// constraint-name hint (see the same issue already hit on weekly_reports).
export const TASK_WITH_RELATIONS_SELECT =
  "*, trader:traders(code), assignee:profiles!tasks_assignee_id_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)";

export function taskRequiresCommentToClose(task: {
  created_by: string | null;
  assignee_id: string | null;
}): boolean {
  return !!task.created_by && task.created_by !== task.assignee_id;
}

export async function updateTaskStatus(
  supabase: SupabaseClient,
  currentUserId: string,
  task: { id: string; status: TaskStatus; trader_id: string | null; title: string },
  nextStatus: TaskStatus,
  resultComment: string | null,
) {
  const wasDone = task.status === "done";
  const result = await supabase
    .from("tasks")
    .update({ status: nextStatus, result_comment: resultComment })
    .eq("id", task.id)
    .select(TASK_WITH_RELATIONS_SELECT)
    .single();

  if (!result.error && result.data && nextStatus === "done" && !wasDone && task.trader_id) {
    await supabase.from("interactions").insert({
      trader_id: task.trader_id,
      author_id: currentUserId,
      kind: "task_closed",
      body: task.title,
    });
  }

  return result;
}
