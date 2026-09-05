"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { Sparkline } from "@/components/ui/sparkline";
import type { EnrichedTrader } from "@/lib/trader-metrics";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

type Row = { trader: EnrichedTrader; rank: number; sparkline: (number | null)[] };

function deltaClass(value: number | null) {
  if (value === null || value === undefined || value === 0) return "text-text-muted";
  return value > 0 ? "text-positive" : "text-negative";
}

export function ScoreboardTable({ rows }: { rows: Row[] }) {
  const [managerFilter, setManagerFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  const managers = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.trader.manager_id && r.trader.manager?.full_name) {
        map.set(r.trader.manager_id, r.trader.manager.full_name);
      }
    }
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (managerFilter && r.trader.manager_id !== managerFilter) return false;
      if (tierFilter && r.trader.tier !== tierFilter) return false;
      return true;
    });
  }, [rows, managerFilter, tierFilter]);

  const columns: DataTableColumn<Row>[] = [
    {
      key: "rank",
      header: "#",
      accessor: (r) => <span className="tabular-nums text-text-secondary">{r.rank}</span>,
      sortValue: (r) => r.rank,
      width: "48px",
    },
    {
      key: "code",
      header: "Trader",
      accessor: (r) => (
        <Link href={`/trader/${r.trader.id}`} className="font-medium text-info hover:underline">
          {r.trader.code}
        </Link>
      ),
      sortValue: (r) => r.trader.code,
    },
    {
      key: "tier",
      header: "Tier",
      accessor: (r) => (r.trader.tier ? <Tier variant={r.trader.tier} /> : "—"),
      sortValue: (r) => r.trader.tier ?? "",
    },
    {
      key: "score",
      header: "Score",
      accessor: (r) => <span className="tabular-nums font-medium">{r.trader.score ?? "—"}</span>,
      sortValue: (r) => r.trader.score ?? 0,
      align: "right",
    },
    {
      key: "score_delta",
      header: "Δ Score",
      accessor: (r) => (
        <span className={`tabular-nums ${deltaClass(r.trader.score_delta)}`}>
          {r.trader.score_delta === null
            ? "—"
            : `${r.trader.score_delta > 0 ? "+" : ""}${r.trader.score_delta}`}
        </span>
      ),
      sortValue: (r) => r.trader.score_delta ?? 0,
      align: "right",
    },
    {
      key: "sparkline",
      header: "Динаміка 12 тижнів",
      accessor: (r) => <Sparkline values={r.sparkline} />,
    },
    {
      key: "status",
      header: "Статус",
      accessor: (r) =>
        r.trader.status ? (
          <Badge variant={STATUS_BADGE[r.trader.status]}>{STATUS_LABELS[r.trader.status]}</Badge>
        ) : (
          "—"
        ),
      sortValue: (r) => r.trader.status ?? "",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-4 gap-3">
        <Select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
          <option value="">Усі менеджери</option>
          {managers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          <option value="">Усі tier</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.trader.id}
        rowClassName={(r) => (r.rank <= 3 ? "bg-positive-bg" : undefined)}
      />
    </div>
  );
}
