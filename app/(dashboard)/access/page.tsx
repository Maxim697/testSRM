import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import { AccessTabs } from "@/components/access/access-tabs";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Team } from "@/lib/types";

export default async function AccessPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
        <EmptyState
          icon={<ShieldIcon />}
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [usersRes, tradersRes, teamsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, telegram, role, is_active, team_id").order("full_name"),
    supabase.from("traders").select("manager_id"),
    supabase.from("teams").select("id, name, lead_id, created_at").order("name"),
  ]);

  const users = (usersRes.data ?? []) as Profile[];
  const teams = (teamsRes.data ?? []) as Team[];

  const traderCountByManager = new Map<string, number>();
  for (const row of tradersRes.data ?? []) {
    if (!row.manager_id) continue;
    traderCountByManager.set(row.manager_id, (traderCountByManager.get(row.manager_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
      <AccessTabs
        teams={teams}
        profiles={users}
        traderCounts={Object.fromEntries(traderCountByManager)}
        currentUserId={current.userId}
        currentUserRole={current.profile.role}
      />
    </>
  );
}
