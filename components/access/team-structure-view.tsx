"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/empty-icons";
import { TeamBlock, Avatar } from "@/components/access/team-block";
import { CreateTeamModal } from "@/components/access/create-team-modal";
import { RenameTeamModal } from "@/components/access/rename-team-modal";
import { ChangeLeadModal } from "@/components/access/change-lead-modal";
import { DeleteTeamModal } from "@/components/access/delete-team-modal";
import { AddManagerModal } from "@/components/access/add-manager-modal";
import { MoveManagerModal } from "@/components/access/move-manager-modal";
import { ChangeRoleModal } from "@/components/access/change-role-modal";
import { ToggleActiveModal } from "@/components/access/toggle-active-modal";
import { CreateUserModal } from "@/components/access/create-user-modal";
import { StaggerItem } from "@/components/motion/stagger-item";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { Profile, Team } from "@/lib/types";
import type { Role } from "@/lib/roles";

export function TeamStructureView({
  teams: initialTeams,
  profiles: initialProfiles,
  traderCounts,
  currentUserId,
  currentUserRole,
}: {
  teams: Team[];
  profiles: Profile[];
  traderCounts: Record<string, number>;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [profiles, setProfiles] = useState(initialProfiles);

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [renamingTeam, setRenamingTeam] = useState<Team | null>(null);
  const [changingLeadTeam, setChangingLeadTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [addingManagerTeam, setAddingManagerTeam] = useState<Team | null>(null);
  const [movingManager, setMovingManager] = useState<{ manager: Profile; fixedToTeamId?: string } | null>(null);
  const [togglingUser, setTogglingUser] = useState<Profile | null>(null);
  const [changingRoleUser, setChangingRoleUser] = useState<Profile | null>(null);

  const canManage = currentUserRole === "admin";

  const managersByTeam = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const p of profiles) {
      if (p.role !== "manager" || !p.team_id) continue;
      const list = map.get(p.team_id) ?? [];
      list.push(p);
      map.set(p.team_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return map;
  }, [profiles]);

  const leadById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of profiles) if (p.role === "lead") map.set(p.id, p);
    return map;
  }, [profiles]);

  const freeLeads = useMemo(
    () => profiles.filter((p) => p.role === "lead" && !p.team_id).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    [profiles],
  );

  const allManagers = useMemo(
    () => profiles.filter((p) => p.role === "manager").sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    [profiles],
  );

  const noTeamUsers = useMemo(
    () => profiles.filter((p) => p.role !== "admin" && !p.team_id).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    [profiles],
  );

  const admins = useMemo(
    () => profiles.filter((p) => p.role === "admin").sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    [profiles],
  );

  const activeAdminCount = useMemo(() => profiles.filter((p) => p.role === "admin" && p.is_active).length, [profiles]);

  function upsertProfile(id: string, patch: Partial<Profile>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreatingUser(true)}>
            Додати користувача
          </Button>
          <Button variant="primary" onClick={() => setCreatingTeam(true)}>
            Створити команду
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title="Команд ще немає" description="Створіть першу команду, щоб почати." />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <AnimatePresence>
            {teams.map((team, i) => (
              <StaggerItem key={team.id} index={i}>
                <TeamBlock
                  team={team}
                  lead={team.lead_id ? (leadById.get(team.lead_id) ?? null) : null}
                  managers={managersByTeam.get(team.id) ?? []}
                  traderCounts={traderCounts}
                  canManage={canManage}
                  onRename={() => setRenamingTeam(team)}
                  onChangeLead={() => setChangingLeadTeam(team)}
                  onDelete={() => setDeletingTeam(team)}
                  onAddManager={() => setAddingManagerTeam(team)}
                  onMoveManager={(m) => setMovingManager({ manager: m })}
                  onToggleActive={(u) => setTogglingUser(u)}
                />
              </StaggerItem>
            ))}
          </AnimatePresence>
        </div>
      )}

      {noTeamUsers.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-text-primary">Без команди</h2>
          <div className="panel flex flex-col gap-1 rounded-card p-2">
            {noTeamUsers.map((u) => (
              <div key={u.id} className={cn("flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2", !u.is_active && "opacity-50")}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={u.full_name} className="h-7 w-7 text-xs" />
                  <div className="min-w-0">
                    <div className="truncate text-text-primary">{u.full_name ?? "Без імені"}</div>
                    <div className="truncate text-xs text-text-muted">{u.telegram ?? "—"}</div>
                  </div>
                  <Badge variant="neutral">{u.role === "lead" ? "Керівник відділу" : "Менеджер"}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!u.is_active && <Badge variant="neutral">Неактивний</Badge>}
                  {canManage && (
                    <>
                      {u.role === "manager" && (
                        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setMovingManager({ manager: u })}>
                          Додати в команду
                        </Button>
                      )}
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setTogglingUser(u)}>
                        {u.is_active ? "Деактивувати" : "Активувати"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {admins.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-text-primary">Адміністратори</h2>
          <div className="panel flex flex-col gap-1 rounded-card p-2">
            {admins.map((u) => (
              <div key={u.id} className={cn("flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2", !u.is_active && "opacity-50")}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={u.full_name} className="h-7 w-7 text-xs" />
                  <div className="min-w-0">
                    <div className="truncate text-text-primary">{u.full_name ?? "Без імені"}</div>
                    <div className="truncate text-xs text-text-muted">{u.telegram ?? "—"}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!u.is_active && <Badge variant="neutral">Неактивний</Badge>}
                  {canManage && (
                    <>
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setChangingRoleUser(u)}>
                        Змінити роль
                      </Button>
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setTogglingUser(u)}>
                        {u.is_active ? "Деактивувати" : "Активувати"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTeamModal
        open={creatingTeam}
        onClose={() => setCreatingTeam(false)}
        freeLeads={freeLeads}
        managers={allManagers}
        currentUserId={currentUserId}
        onCreated={(team, promotedManagerId, assignedLeadId) => {
          setTeams((prev) => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
          if (promotedManagerId) upsertProfile(promotedManagerId, { role: "lead", team_id: team.id });
          if (assignedLeadId) upsertProfile(assignedLeadId, { team_id: team.id });
        }}
      />

      <CreateUserModal
        open={creatingUser}
        onClose={() => setCreatingUser(false)}
        teams={teams}
        onCreated={(user, team) => {
          setProfiles((prev) => [...prev, user]);
          if (team && !teams.some((t) => t.id === team.id)) {
            setTeams((prev) => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (team && user.role === "lead") {
            // Assigned to an existing teamless team — that team's own
            // lead_id needs to reflect the new lead now too.
            setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, lead_id: user.id } : t)));
          }
        }}
      />

      <RenameTeamModal
        team={renamingTeam}
        currentUserId={currentUserId}
        onClose={() => setRenamingTeam(null)}
        onRenamed={(teamId, name) => setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, name } : t)))}
      />

      <DeleteTeamModal
        team={deletingTeam}
        managerCount={deletingTeam ? (managersByTeam.get(deletingTeam.id)?.length ?? 0) : 0}
        lead={deletingTeam?.lead_id ? (leadById.get(deletingTeam.lead_id) ?? null) : null}
        currentUserId={currentUserId}
        onClose={() => setDeletingTeam(null)}
        onDeleted={(teamId) => {
          setTeams((prev) => prev.filter((t) => t.id !== teamId));
          setProfiles((prev) => prev.map((p) => (p.team_id === teamId ? { ...p, team_id: null } : p)));
        }}
      />

      <ChangeLeadModal
        team={changingLeadTeam}
        currentLead={changingLeadTeam?.lead_id ? (leadById.get(changingLeadTeam.lead_id) ?? null) : null}
        teamManagers={changingLeadTeam ? (managersByTeam.get(changingLeadTeam.id) ?? []) : []}
        freeLeads={freeLeads}
        otherTeams={teams.filter((t) => t.id !== changingLeadTeam?.id)}
        currentUserId={currentUserId}
        onClose={() => setChangingLeadTeam(null)}
        onChanged={({ teamId, newLeadId, oldLeadId, oldLeadDestinationTeamId }) => {
          setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, lead_id: newLeadId } : t)));
          upsertProfile(newLeadId, { role: "lead", team_id: teamId });
          if (oldLeadId && oldLeadId !== newLeadId) {
            upsertProfile(oldLeadId, { role: "manager", team_id: oldLeadDestinationTeamId });
          }
        }}
      />

      <AddManagerModal
        team={addingManagerTeam}
        teams={teams}
        candidates={profiles.filter((p) => p.role === "manager" && p.team_id !== addingManagerTeam?.id)}
        onClose={() => setAddingManagerTeam(null)}
        onPick={(manager) => {
          const toTeamId = addingManagerTeam?.id;
          setAddingManagerTeam(null);
          if (toTeamId) setMovingManager({ manager, fixedToTeamId: toTeamId });
        }}
      />

      <MoveManagerModal
        manager={movingManager?.manager ?? null}
        teams={teams}
        fixedToTeamId={movingManager?.fixedToTeamId}
        currentUserId={currentUserId}
        traderCount={movingManager ? (traderCounts[movingManager.manager.id] ?? 0) : 0}
        onClose={() => setMovingManager(null)}
        onMoved={(managerId, toTeamId) => upsertProfile(managerId, { team_id: toTeamId })}
      />

      <ChangeRoleModal
        user={changingRoleUser}
        teams={teams}
        currentUserId={currentUserId}
        activeAdminCount={activeAdminCount}
        onClose={() => setChangingRoleUser(null)}
        onChanged={(userId, role, teamId) => upsertProfile(userId, { role, team_id: teamId })}
      />

      <ToggleActiveModal
        user={togglingUser}
        currentUserId={currentUserId}
        activeAdminCount={activeAdminCount}
        onClose={() => setTogglingUser(null)}
        onToggled={(userId, nextActive) => upsertProfile(userId, { is_active: nextActive })}
      />
    </div>
  );
}
