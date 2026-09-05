"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import type { EnrichedTrader } from "@/lib/trader-metrics";

export function TopRiskTable({ traders }: { traders: EnrichedTrader[] }) {
  const columns: DataTableColumn<EnrichedTrader>[] = [
    {
      key: "code",
      header: "Trader",
      accessor: (t) => (
        <Link href={`/trader/${t.id}`} className="font-medium text-info hover:underline">
          {t.code}
        </Link>
      ),
    },
    {
      key: "manager",
      header: "Менеджер",
      accessor: (t) => t.manager?.full_name ?? "—",
    },
    {
      key: "risk",
      header: "Ризик",
      accessor: (t) => <RiskBadge risk={t.risk} showBreakdown={false} />,
      align: "right",
    },
    {
      key: "factors",
      header: "Фактори",
      accessor: (t) => <RiskFactorList factors={t.risk.factors} />,
      width: "360px",
    },
    {
      key: "action",
      header: "",
      accessor: (t) => (
        <Button href={`/trader/${t.id}`} variant="ghost" className="h-7 px-2 text-xs">
          Відкрити
        </Button>
      ),
      width: "90px",
    },
  ];

  return <DataTable columns={columns} data={traders} rowKey={(t) => t.id} />;
}
