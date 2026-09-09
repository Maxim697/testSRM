import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import { TeamSelector } from "@/components/my-team/team-selector";
import { MyTeamView } from "@/components/my-team/my-team-view";
import { getCurrentProfile } from "@/lib/current-user";
import { getMyTeamData } from "@/lib/my-team";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export default async function MyTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
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
  const supabase = await createClient();

  let teams: Team[] = [];
  let teamId: string | null;

  if (isAdmin) {
    const { data } = await supabase.from("teams").select("id, name, lead_id, created_at").order("name");
    teams = (data ?? []) as Team[];
    const { team: requestedTeamId } = await searchParams;
    teamId = (requestedTeamId && teams.some((t) => t.id === requestedTeamId) ? requestedTeamId : teams[0]?.id) ?? null;
  } else {
    teamId = current.profile.team_id;
  }

  if (!teamId) {
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

  const data = await getMyTeamData(teamId);
  if (!data) {
    return (
      <>
        <PageHeader title="Моя команда" description="Огляд команди: менеджери, показники, що потребує уваги" />
        <EmptyState icon={<ShieldIcon />} title="Команду не знайдено" description="Можливо, її було видалено." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Моя команда"
        description="Огляд команди: менеджери, показники, що потребує уваги"
        actions={isAdmin ? <TeamSelector teams={teams} selectedTeamId={teamId} /> : undefined}
      />
      <MyTeamView data={data} currentUserId={current.userId} />
    </>
  );
}
