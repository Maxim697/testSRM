import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamTasksView } from "@/components/team-tasks/team-tasks-view";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_WITH_RELATIONS_SELECT } from "@/lib/task-actions";
import type { Profile, TaskWithRelations, Trader } from "@/lib/types";

export default async function TeamTasksPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Завдання команді" description="Постановка та контроль завдань менеджерам" />
        <EmptyState
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [tasksRes, managersRes, tradersRes] = await Promise.all([
    supabase.from("tasks").select(TASK_WITH_RELATIONS_SELECT).order("due_date", { ascending: true }),
    supabase.from("profiles").select("id, full_name, telegram, role").eq("role", "manager"),
    supabase.from("traders").select("id, code, manager_id, tier").order("code"),
  ]);

  const tasks = (tasksRes.data ?? []) as unknown as TaskWithRelations[];
  const managers = (managersRes.data ?? []) as Profile[];
  const traders = (tradersRes.data ?? []) as Pick<Trader, "id" | "code" | "manager_id" | "tier">[];

  return (
    <>
      <PageHeader title="Завдання команді" description="Постановка та контроль завдань менеджерам" />
      <TeamTasksView tasks={tasks} managers={managers} traders={traders} currentUserId={current.userId} />
    </>
  );
}
