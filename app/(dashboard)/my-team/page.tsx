import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import { MyTeamView } from "@/components/my-team/my-team-view";
import { getCurrentProfile } from "@/lib/current-user";
import { getMyTeamData, type MyTeamData } from "@/lib/my-team";
import { createClient } from "@/lib/supabase/server";

export default async function MyTeamPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Моя команда" description="Огляд команди: менеджери, показники, що потребує уваги" />
        <EmptyState
          icon={<ShieldIcon />}
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const isAdmin = current.profile.role === "admin";

  // Admin doesn't belong to any team — rather than making them pick one
  // team at a time from a selector, show every team at once, each as its
  // own block headed by its own lead. A lead only ever has the one team,
  // so this list is always length 1 for them — same content as before,
  // just expressed as "a list of one" instead of a special case.
  let teamIds: string[];
  if (isAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.from("teams").select("id").order("name");
    teamIds = (data ?? []).map((t) => t.id);
  } else {
    teamIds = current.profile.team_id ? [current.profile.team_id] : [];
  }

  if (teamIds.length === 0) {
    return (
      <>
        <PageHeader title="Моя команда" description="Огляд команди: менеджери, показники, що потребує уваги" />
        <EmptyState
          icon={<ShieldIcon />}
          title={isAdmin ? "Команд ще немає" : "Ви не належите до жодної команди"}
          description={
            isAdmin
              ? "У системі поки не створено жодної команди."
              : "Зверніться до адміністратора, щоб вас додали до команди."
          }
        />
      </>
    );
  }

  const teams = (await Promise.all(teamIds.map((id) => getMyTeamData(id)))).filter(
    (t): t is MyTeamData => t !== null,
  );

  return (
    <>
      <PageHeader title="Моя команда" description="Огляд команди: менеджери, показники, що потребує уваги" />
      <MyTeamView teams={teams} currentUserId={current.userId} />
    </>
  );
}
