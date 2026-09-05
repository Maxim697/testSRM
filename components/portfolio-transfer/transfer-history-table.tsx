"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/format";
import type { PortfolioTransferWithNames } from "@/lib/types";

export function TransferHistoryTable({ history }: { history: PortfolioTransferWithNames[] }) {
  const columns: DataTableColumn<PortfolioTransferWithNames>[] = [
    {
      key: "created_at",
      header: "Дата",
      accessor: (t) => formatDateTime(t.created_at),
      sortValue: (t) => t.created_at,
    },
    {
      key: "from",
      header: "Від кого",
      accessor: (t) => t.from_manager?.full_name ?? "—",
    },
    {
      key: "to",
      header: "Кому",
      accessor: (t) => t.to_manager?.full_name ?? "—",
    },
    {
      key: "count",
      header: "Трейдерів",
      accessor: (t) => <span className="tabular-nums">{t.traders_count}</span>,
      sortValue: (t) => t.traders_count,
      align: "right",
    },
    {
      key: "initiator",
      header: "Хто ініціював",
      accessor: (t) => t.initiator?.full_name ?? "—",
    },
    {
      key: "reason",
      header: "Причина",
      accessor: (t) => <span className="text-text-secondary">{t.reason ?? "—"}</span>,
    },
  ];

  return <DataTable columns={columns} data={history} rowKey={(t) => t.id} />;
}
