"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KpiRow } from "@/components/ui/kpi-row";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/empty-icons";
import { ManagerCard } from "@/components/my-team/manager-card";
import { ManagerComparison } from "@/components/my-team/manager-comparison";
import { AttentionList } from "@/components/my-team/attention-list";
import { ManagerTradersModal } from "@/components/team-dashboard/manager-traders-modal";
import { CreateTaskModal } from "@/components/team-tasks/create-task-modal";
import { formatNumber, formatPercent } from "@/lib/format";
import type { MyTeamData, ManagerCard as ManagerCardData } from "@/lib/my-team";

function delta(value: number | null, suffix = ""): { value: string; direction: "up" | "down" | "flat" } {
  if (value === null) return { value: "—", direction: "flat" };
  if (value === 0) return { value: `0${suffix}`, direction: "flat" };
  const direction = value > 0 ? "up" : "down";
  return { value: `${value > 0 ? "+" : ""}${value}${suffix}`, direction };
}

export function MyTeamView({ data, currentUserId }: { data: MyTeamData; currentUserId: string }) {
  const router = useRouter();
  const [openTradersFor, setOpenTradersFor] = useState<ManagerCardData | null>(null);
  const [taskModal, setTaskModal] = useState<{ open: boolean; assigneeId?: string }>({ open: false });

  const allTraders = data.managers.flatMap((m) => m.traders);
  const criticalTraders = allTraders.filter((t) => t.risk.level === "critical");
  const traderPicks = allTraders.map((t) => ({ id: t.id, code: t.code, manager_id: t.manager_id, tier: t.tier }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-text-primary">{data.team.name}</div>
          <div className="mt-0.5 text-sm text-text-secondary">
            Лід: {data.team.leadName ?? "—"} · Менеджерів: {data.managerCount} · Трейдерів: {data.traderCount}
          </div>
        </div>
      </Card>

      <KpiRow
        items={[
          {
            label: "Сумарний оборот",
            value: formatNumber(data.kpi.turnoverTotal),
            delta: delta(data.kpi.turnoverDelta),
          },
          { label: "Середній CR", value: formatPercent(data.kpi.crAvg, 1), delta: delta(data.kpi.crDelta, "пп") },
          { label: "Середній score", value: data.kpi.scoreAvg.toString(), delta: delta(data.kpi.scoreDelta) },
          {
            label: "У зоні ризику",
            value: data.kpi.riskCount.toString(),
            delta: delta(data.kpi.riskDelta),
            status: data.kpi.riskCount > 0 ? "warning" : "neutral",
          },
          {
            label: "Контактів за тиждень",
            value: data.kpi.contactsThisWeek.toString(),
            delta: delta(data.kpi.contactsDelta),
          },
          {
            label: "Прострочених завдань",
            value: data.kpi.overdueTasks.toString(),
            delta: delta(data.kpi.overdueDelta),
            status: data.kpi.overdueTasks > 0 ? "negative" : "neutral",
          },
        ]}
      />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Менеджери</h2>
        {data.managers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon />}
            title="Немає менеджерів"
            description="У цій команді поки немає жодного менеджера."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.managers.map((m) => (
              <div key={m.id} id={`manager-${m.id}`}>
                <ManagerCard
                  manager={m}
                  onOpenTraders={() => setOpenTradersFor(m)}
                  onAssignTask={() => setTaskModal({ open: true, assigneeId: m.id })}
                  onViewReport={() => router.push("/reports-review")}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {data.managers.length > 1 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-text-primary">Порівняння менеджерів</h2>
          <Card>
            <ManagerComparison managers={data.managers} />
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Потребує уваги</h2>
        <AttentionList managers={data.managers} criticalTraders={criticalTraders} />
      </div>

      <ManagerTradersModal
        manager={openTradersFor ? { name: openTradersFor.fullName, traders: openTradersFor.traders } : null}
        onClose={() => setOpenTradersFor(null)}
      />

      <CreateTaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        managers={data.managerProfiles}
        traders={traderPicks}
        currentUserId={currentUserId}
        onCreated={() => setTaskModal({ open: false })}
        initialAssigneeId={taskModal.assigneeId}
      />
    </div>
  );
}
