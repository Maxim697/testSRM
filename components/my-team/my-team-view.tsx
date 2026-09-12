"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KpiRow } from "@/components/ui/kpi-row";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/empty-icons";
import { ManagerCard } from "@/components/my-team/manager-card";
import { StaggerItem } from "@/components/motion/stagger-item";
import { ManagerComparison } from "@/components/my-team/manager-comparison";
import { AttentionList } from "@/components/my-team/attention-list";
import { ManagerTradersModal } from "@/components/team-dashboard/manager-traders-modal";
import { CreateTaskModal } from "@/components/team-tasks/create-task-modal";
import { formatNumber, formatPercent } from "@/lib/format";
import type { MyTeamData, ManagerCard as ManagerCardData } from "@/lib/my-team";
import type { Profile } from "@/lib/types";

function delta(value: number | null, suffix = ""): { value: string; direction: "up" | "down" | "flat" } {
  if (value === null) return { value: "—", direction: "flat" };
  if (value === 0) return { value: `0${suffix}`, direction: "flat" };
  const direction = value > 0 ? "up" : "down";
  return { value: `${value > 0 ? "+" : ""}${value}${suffix}`, direction };
}

/** One team's manager roster — the part that's genuinely per-team no
 * matter who's looking (a manager belongs to exactly one team, so
 * grouping them any other way wouldn't mean anything). */
function ManagerGrid({
  data,
  onOpenTraders,
  onAssignTask,
}: {
  data: MyTeamData;
  onOpenTraders: (m: ManagerCardData) => void;
  onAssignTask: (data: MyTeamData, managerId: string) => void;
}) {
  const router = useRouter();

  if (data.managers.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="Немає менеджерів"
        description="У цій команді поки немає жодного менеджера."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.managers.map((m, i) => (
        <StaggerItem key={m.id} index={i} id={`manager-${m.id}`}>
          <ManagerCard
            manager={m}
            onOpenTraders={() => onOpenTraders(m)}
            onAssignTask={() => onAssignTask(data, m.id)}
            onViewReport={() => router.push("/reports-review")}
          />
        </StaggerItem>
      ))}
    </div>
  );
}

export function MyTeamView({ teams, currentUserId }: { teams: MyTeamData[]; currentUserId: string }) {
  const [openTradersFor, setOpenTradersFor] = useState<ManagerCardData | null>(null);
  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    assigneeId?: string;
    managers: Profile[];
    traders: { id: string; code: string; manager_id: string | null; tier: ManagerCardData["traders"][number]["tier"] }[];
  }>({ open: false, managers: [], traders: [] });

  const allManagers = teams.flatMap((t) => t.managers);
  const allTraders = allManagers.flatMap((m) => m.traders);
  const criticalTraders = allTraders.filter((t) => t.risk.level === "critical");

  function openTaskModal(data: MyTeamData, managerId: string) {
    setTaskModal({
      open: true,
      assigneeId: managerId,
      managers: data.managerProfiles,
      traders: data.managers.flatMap((m) => m.traders).map((t) => ({ id: t.id, code: t.code, manager_id: t.manager_id, tier: t.tier })),
    });
  }

  // A single team (always true for a lead — they only ever have the one)
  // keeps the full single-team layout: its own KPI row front and center.
  // Several teams (an admin looking at everyone) skips repeating that KPI
  // row per team — three near-identical rows of cards would be more
  // noise than signal — and instead pools the comparison and attention
  // blocks across every team, which is the more useful view for someone
  // whose job is comparing across teams in the first place.
  const singleTeam = teams.length === 1 ? teams[0] : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {singleTeam ? (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-text-primary">{singleTeam.team.name}</div>
              <div className="mt-0.5 text-sm text-text-secondary">
                Лід: {singleTeam.team.leadName ?? "—"} · Менеджерів: {singleTeam.managerCount} · Трейдерів:{" "}
                {singleTeam.traderCount}
              </div>
            </div>
          </Card>

          <KpiRow
            items={[
              { label: "Сумарний оборот", value: formatNumber(singleTeam.kpi.turnoverTotal), delta: delta(singleTeam.kpi.turnoverDelta) },
              { label: "Середній CR", value: formatPercent(singleTeam.kpi.crAvg, 1), delta: delta(singleTeam.kpi.crDelta, "пп") },
              { label: "Середній score", value: singleTeam.kpi.scoreAvg.toString(), delta: delta(singleTeam.kpi.scoreDelta) },
              {
                label: "У зоні ризику",
                value: singleTeam.kpi.riskCount.toString(),
                delta: delta(singleTeam.kpi.riskDelta),
                status: singleTeam.kpi.riskCount > 0 ? "warning" : "positive",
              },
              { label: "Контактів за тиждень", value: singleTeam.kpi.contactsThisWeek.toString(), delta: delta(singleTeam.kpi.contactsDelta) },
              {
                label: "Прострочених завдань",
                value: singleTeam.kpi.overdueTasks.toString(),
                delta: delta(singleTeam.kpi.overdueDelta),
                status: singleTeam.kpi.overdueTasks > 0 ? "negative" : "positive",
              },
            ]}
          />

          <div>
            <h2 className="mb-2 text-base font-medium text-text-primary">Менеджери</h2>
            <ManagerGrid data={singleTeam} onOpenTraders={setOpenTradersFor} onAssignTask={openTaskModal} />
          </div>
        </>
      ) : (
        teams.map((data) => (
          <div key={data.team.id}>
            <h2 className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-medium text-text-primary">
              {data.team.name}
              <span className="text-sm font-normal text-text-secondary">
                · Лід: {data.team.leadName ?? "—"} · Менеджерів: {data.managerCount} · Трейдерів: {data.traderCount}
              </span>
            </h2>
            <ManagerGrid data={data} onOpenTraders={setOpenTradersFor} onAssignTask={openTaskModal} />
          </div>
        ))
      )}

      {allManagers.length > 1 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-text-primary">
            {singleTeam ? "Порівняння менеджерів" : "Порівняння менеджерів (усі команди)"}
          </h2>
          <Card>
            <ManagerComparison managers={allManagers} />
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">
          {singleTeam ? "Потребує уваги" : "Потребує уваги (усі команди)"}
        </h2>
        <AttentionList managers={allManagers} criticalTraders={criticalTraders} />
      </div>

      <ManagerTradersModal
        manager={openTradersFor ? { name: openTradersFor.fullName, traders: openTradersFor.traders } : null}
        onClose={() => setOpenTradersFor(null)}
      />

      <CreateTaskModal
        open={taskModal.open}
        onClose={() => setTaskModal((prev) => ({ ...prev, open: false }))}
        managers={taskModal.managers}
        traders={taskModal.traders}
        currentUserId={currentUserId}
        onCreated={() => setTaskModal((prev) => ({ ...prev, open: false }))}
        initialAssigneeId={taskModal.assigneeId}
      />
    </div>
  );
}
