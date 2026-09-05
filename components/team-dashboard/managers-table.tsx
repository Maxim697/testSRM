"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ManagerTradersModal } from "@/components/team-dashboard/manager-traders-modal";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ManagerSummary } from "@/lib/team-dashboard";
import type { WeeklyReportStatus } from "@/lib/types";

const REPORT_STATUS_LABELS: Record<WeeklyReportStatus | "none", string> = {
  draft: "Чернетка",
  submitted: "Надіслано",
  approved: "Прийнято",
  returned: "Повернено",
  none: "Немає звіту",
};
const REPORT_STATUS_BADGE: Record<WeeklyReportStatus | "none", "neutral" | "amber" | "green" | "red"> = {
  draft: "neutral",
  submitted: "amber",
  approved: "green",
  returned: "red",
  none: "red",
};

const LOW_CONTACTS_THRESHOLD = 3;
const HIGH_RISK_THRESHOLD = 3;

function flagsFor(m: ManagerSummary): string[] {
  const flags: string[] = [];
  if (m.reportStatus === "none") flags.push("Немає звіту");
  if (m.riskCount >= HIGH_RISK_THRESHOLD) flags.push("Багато ризику");
  if (m.contactsThisWeek < LOW_CONTACTS_THRESHOLD) flags.push("Мало контактів");
  return flags;
}

export function ManagersTable({ managers }: { managers: ManagerSummary[] }) {
  const [selected, setSelected] = useState<ManagerSummary | null>(null);

  const columns: DataTableColumn<ManagerSummary>[] = [
    {
      key: "name",
      header: "Менеджер",
      accessor: (m) => {
        const flags = flagsFor(m);
        return (
          <button type="button" onClick={() => setSelected(m)} className="text-left">
            <div className="font-medium text-info hover:underline">{m.name}</div>
            {flags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {flags.map((f) => (
                  <Badge key={f} variant="red">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </button>
        );
      },
      sortValue: (m) => m.name,
    },
    {
      key: "traderCount",
      header: "Трейдерів",
      accessor: (m) => <span className="tabular-nums">{m.traderCount}</span>,
      sortValue: (m) => m.traderCount,
      align: "right",
    },
    {
      key: "turnoverTotal",
      header: "Оборот",
      accessor: (m) => <span className="tabular-nums">{formatNumber(m.turnoverTotal)}</span>,
      sortValue: (m) => m.turnoverTotal,
      align: "right",
    },
    {
      key: "crAvg",
      header: "Середній CR",
      accessor: (m) => <span className="tabular-nums">{formatPercent(m.crAvg, 1)}</span>,
      sortValue: (m) => m.crAvg,
      align: "right",
    },
    {
      key: "scoreAvg",
      header: "Середній score",
      accessor: (m) => <span className="tabular-nums">{m.scoreAvg}</span>,
      sortValue: (m) => m.scoreAvg,
      align: "right",
    },
    {
      key: "riskCount",
      header: "У ризику",
      accessor: (m) => (
        <span className={cn("tabular-nums", m.riskCount >= HIGH_RISK_THRESHOLD && "font-medium text-negative")}>
          {m.riskCount}
        </span>
      ),
      sortValue: (m) => m.riskCount,
      align: "right",
    },
    {
      key: "contactsThisWeek",
      header: "Контактів за тиждень",
      accessor: (m) => (
        <span className={cn("tabular-nums", m.contactsThisWeek < LOW_CONTACTS_THRESHOLD && "font-medium text-negative")}>
          {m.contactsThisWeek}
        </span>
      ),
      sortValue: (m) => m.contactsThisWeek,
      align: "right",
    },
    {
      key: "tasks",
      header: "Завдань відкрито / прострочено",
      accessor: (m) => (
        <span className="tabular-nums">
          {m.tasksOpen} / <span className={m.tasksOverdue > 0 ? "font-medium text-negative" : ""}>{m.tasksOverdue}</span>
        </span>
      ),
      sortValue: (m) => m.tasksOverdue,
      align: "right",
    },
    {
      key: "reportStatus",
      header: "Тижневий звіт",
      accessor: (m) => <Badge variant={REPORT_STATUS_BADGE[m.reportStatus]}>{REPORT_STATUS_LABELS[m.reportStatus]}</Badge>,
      sortValue: (m) => m.reportStatus,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={managers}
        rowKey={(m) => m.id}
        rowClassName={(m) => (flagsFor(m).length > 0 ? "bg-warning-bg" : undefined)}
      />
      <ManagerTradersModal manager={selected} onClose={() => setSelected(null)} />
    </>
  );
}
