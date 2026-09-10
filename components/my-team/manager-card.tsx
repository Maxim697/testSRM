"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { getInitials } from "@/lib/roles";
import { formatNumber, formatPercent, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ManagerCard as ManagerCardData, ReportCardStatus } from "@/lib/my-team";

const REPORT_LABELS: Record<ReportCardStatus, string> = {
  none: "Не подано",
  submitted: "На розгляді",
  approved: "Прийнято",
  returned: "Повернуто",
};
const REPORT_BADGE: Record<ReportCardStatus, "neutral" | "amber" | "green" | "red"> = {
  none: "neutral",
  submitted: "amber",
  approved: "green",
  returned: "red",
};

function turnoverDeltaText(value: number | null): { text: string; className: string } {
  if (value === null || value === 0) return { text: "0", className: "text-text-muted" };
  const sign = value > 0 ? "+" : "";
  return { text: `${sign}${formatNumber(value)}`, className: value > 0 ? "text-positive" : "text-negative" };
}

/** A problem card is anything a lead would want to notice at a glance
 * without reading every number: no report in yet, an overdue task, or
 * more than a couple of traders already at risk. */
function isProblemCard(m: ManagerCardData): boolean {
  return m.reportStatus === "none" || m.tasksOverdue > 0 || m.riskCount > 2;
}

export function ManagerCard({
  manager,
  onOpenTraders,
  onAssignTask,
  onViewReport,
}: {
  manager: ManagerCardData;
  onOpenTraders: () => void;
  onAssignTask: () => void;
  onViewReport: () => void;
}) {
  const problem = isProblemCard(manager);
  const turnoverDelta = turnoverDeltaText(manager.turnoverDelta);

  return (
    <div
      className={cn(
        "panel flex cursor-pointer flex-col gap-3 rounded-card border p-4",
        problem ? "border-negative" : "border-transparent hover:border-border-strong",
      )}
      onClick={onOpenTraders}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenTraders();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-medium text-text-primary">
            {getInitials(manager.fullName)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-text-primary">{manager.fullName}</div>
            <div className="truncate text-xs text-text-muted">{manager.telegram ?? "—"}</div>
          </div>
        </div>
        <Badge variant={REPORT_BADGE[manager.reportStatus]} className="shrink-0">
          {REPORT_LABELS[manager.reportStatus]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <div className="field-label">Трейдерів</div>
          <div className="tabular-nums text-text-primary">{manager.traderCount}</div>
        </div>
        <div>
          <div className="field-label">Оборот за тиждень</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular-nums text-text-primary">{formatNumber(manager.turnoverTotal)}</span>
            <span className={cn("tabular-nums text-xs", turnoverDelta.className)}>{turnoverDelta.text}</span>
          </div>
        </div>
        <div>
          <div className="field-label">Середній CR</div>
          <div className="tabular-nums text-text-primary">{formatPercent(manager.crAvg, 1)}</div>
        </div>
        <div>
          <div className="field-label">Середній score</div>
          <div className="tabular-nums text-text-primary">{manager.scoreAvg}</div>
        </div>
        <div>
          <div className="field-label">У ризику</div>
          <div className={cn("tabular-nums", manager.riskCount > 0 ? "font-medium text-negative" : "text-text-primary")}>
            {manager.riskCount}
          </div>
        </div>
        <div>
          <div className="field-label">Контактів за тиждень</div>
          <div className="tabular-nums text-text-primary">{manager.contactsThisWeek}</div>
        </div>
        <div>
          <div className="field-label">Завдань відкрито / прострочено</div>
          <div className="tabular-nums text-text-primary">
            {manager.tasksOpen} /{" "}
            <span className={manager.tasksOverdue > 0 ? "font-medium text-negative" : undefined}>
              {manager.tasksOverdue}
            </span>
          </div>
        </div>
        <div>
          <div className="field-label">Остання активність</div>
          <div className="text-text-primary">{manager.lastActiveAt ? formatDateTime(manager.lastActiveAt) : "—"}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <Sparkline values={manager.sparkline} />
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onAssignTask}
          >
            Поставити завдання
          </Button>
          <Button
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onViewReport}
          >
            Переглянути звіт
          </Button>
        </div>
      </div>
    </div>
  );
}
