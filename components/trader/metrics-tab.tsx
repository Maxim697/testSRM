"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { TraderWeekly } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

export function MetricsTab({ weekly }: { weekly: TraderWeekly[] }) {
  if (weekly.length === 0) {
    return <EmptyState title="Немає історії" description="Дані по тижнях ще не накопичились." />;
  }

  const sorted = [...weekly].sort((a, b) => b.week_start.localeCompare(a.week_start));

  const columns: DataTableColumn<TraderWeekly>[] = [
    { key: "week_start", header: "Тиждень", accessor: (w) => formatDate(w.week_start), sortValue: (w) => w.week_start },
    {
      key: "score",
      header: "Score",
      accessor: (w) => <span className="tabular-nums">{w.score ?? "—"}</span>,
      sortValue: (w) => w.score ?? 0,
      align: "right",
    },
    {
      key: "cr",
      header: "CR",
      accessor: (w) => <span className="tabular-nums">{formatPercent(w.cr)}</span>,
      sortValue: (w) => w.cr ?? 0,
      align: "right",
    },
    {
      key: "turnover",
      header: "Оборот",
      accessor: (w) => <span className="tabular-nums">{formatNumber(w.turnover)}</span>,
      sortValue: (w) => w.turnover ?? 0,
      align: "right",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (w) => (w.status ? <Badge variant={STATUS_BADGE[w.status]}>{STATUS_LABELS[w.status]}</Badge> : "—"),
      sortValue: (w) => w.status ?? "",
    },
  ];

  return <DataTable columns={columns} data={sorted} rowKey={(w) => w.id} />;
}
