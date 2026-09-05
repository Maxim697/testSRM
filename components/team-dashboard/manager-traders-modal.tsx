"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { RiskBadge } from "@/components/risk/risk-badge";
import { formatNumber, formatPercent } from "@/lib/format";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { ManagerSummary } from "@/lib/team-dashboard";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = { green: "green", amber: "amber", red: "red" };

export function ManagerTradersModal({
  manager,
  onClose,
}: {
  manager: ManagerSummary | null;
  onClose: () => void;
}) {
  const columns: DataTableColumn<EnrichedTrader>[] = [
    {
      key: "code",
      header: "Trader",
      accessor: (t) => (
        <Link href={`/trader/${t.id}`} className="font-medium text-info hover:underline">
          {t.code}
        </Link>
      ),
      sortValue: (t) => t.code,
    },
    {
      key: "tier",
      header: "Tier",
      accessor: (t) => (t.tier ? <Tier variant={t.tier} /> : "—"),
      sortValue: (t) => t.tier ?? "",
    },
    {
      key: "score",
      header: "Score",
      accessor: (t) => <span className="tabular-nums">{t.score ?? "—"}</span>,
      sortValue: (t) => t.score ?? 0,
      align: "right",
    },
    {
      key: "cr",
      header: "CR",
      accessor: (t) => <span className="tabular-nums">{formatPercent(t.cr)}</span>,
      sortValue: (t) => t.cr ?? 0,
      align: "right",
    },
    {
      key: "turnover_week",
      header: "Оборот",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.turnover_week)}</span>,
      sortValue: (t) => t.turnover_week ?? 0,
      align: "right",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (t) => (t.status ? <Badge variant={STATUS_BADGE[t.status]}>{STATUS_LABELS[t.status]}</Badge> : "—"),
      sortValue: (t) => t.status ?? "",
    },
    {
      key: "risk",
      header: "Ризик",
      accessor: (t) => <RiskBadge risk={t.risk} size="sm" />,
      sortValue: (t) => t.risk.score,
      align: "right",
    },
  ];

  return (
    <Modal open={!!manager} onClose={onClose} title={manager ? `Трейдери: ${manager.name}` : ""} className="max-w-3xl">
      {manager && (
        <div className="max-h-[60vh] overflow-y-auto">
          <DataTable
            columns={columns}
            data={[...manager.traders].sort((a, b) => b.risk.score - a.risk.score)}
            rowKey={(t) => t.id}
          />
        </div>
      )}
    </Modal>
  );
}
