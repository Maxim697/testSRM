import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AccessMatrix } from "@/components/access/access-matrix";
import { UsersTable } from "@/components/access/users-table";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AccessPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
        <EmptyState
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [usersRes, tradersRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, telegram, role").order("full_name"),
    supabase.from("traders").select("manager_id"),
  ]);

  const users = (usersRes.data ?? []) as Profile[];

  const traderCountByManager = new Map<string, number>();
  for (const row of tradersRes.data ?? []) {
    if (!row.manager_id) continue;
    traderCountByManager.set(row.manager_id, (traderCountByManager.get(row.manager_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
      <AccessMatrix />
      <UsersTable
        users={users}
        traderCounts={Object.fromEntries(traderCountByManager)}
        currentUserId={current.userId}
        currentUserRole={current.profile.role}
      />
    </>
  );
}
