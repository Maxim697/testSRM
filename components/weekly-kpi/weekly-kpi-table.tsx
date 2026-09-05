"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { WeeklyAggregate } from "@/lib/weekly-metrics";

export function WeeklyKpiTable({ weeks }: { weeks: WeeklyAggregate[] }) {
  const columns: DataTableColumn<WeeklyAggregate>[] = [
    { key: "week", header: "Тиждень", accessor: (w) => formatDate(w.weekStart), sortValue: (w) => w.weekStart },
    {
      key: "turnover",
      header: "Оборот",
      accessor: (w) => <span className="tabular-nums">{formatNumber(w.turnoverTotal)}</span>,
      sortValue: (w) => w.turnoverTotal,
      align: "right",
    },
    {
      key: "cr",
      header: "CR",
      accessor: (w) => <span className="tabular-nums">{formatPercent(w.crAvg, 1)}</span>,
      sortValue: (w) => w.crAvg,
      align: "right",
    },
    {
      key: "score",
      header: "Середній score",
      accessor: (w) => <span className="tabular-nums">{w.scoreAvg}</span>,
      sortValue: (w) => w.scoreAvg,
      align: "right",
    },
    {
      key: "active",
      header: "Активних трейдерів",
      accessor: (w) => <span className="tabular-nums">{w.activeCount}</span>,
      sortValue: (w) => w.activeCount,
      align: "right",
    },
  ];

  return <DataTable columns={columns} data={[...weeks].reverse()} rowKey={(w) => w.weekStart} />;
}
