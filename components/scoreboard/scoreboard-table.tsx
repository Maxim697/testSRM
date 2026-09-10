"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { Sparkline } from "@/components/ui/sparkline";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIcon } from "@/components/ui/empty-icons";
import { cn } from "@/lib/utils";
import type { EnrichedTrader } from "@/lib/trader-metrics";

// Podium colors for the top 3 ranks — the same metallic tokens the Tier
// pill uses. Applied to the rank number only (no row fill), so the
// sparkline in those rows stays readable.
const RANK_CLASS: Record<number, string> = {
  1: "font-bold text-tier-gold",
  2: "font-bold text-tier-silver",
  3: "font-bold text-tier-bronze",
};

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
      accessor: (r) => (
        <span className={cn("tabular-nums", RANK_CLASS[r.rank] ?? "text-text-secondary")}>{r.rank}</span>
      ),
      sortValue: (r) => r.rank,
      width: "48px",
    },
    {
      key: "code",
      header: "Trader",
      accessor: (r) => (
        <Link href={`/trader/${r.trader.id}`} prefetch={false} className="font-medium text-text-primary hover:text-accent hover:underline">
          {r.trader.code}
        </Link>
      ),
      sortValue: (r) => r.trader.code,
      width: "18%",
    },
    {
      key: "tier",
      header: "Tier",
      accessor: (r) => (r.trader.tier ? <Tier variant={r.trader.tier} /> : "—"),
      sortValue: (r) => r.trader.tier ?? "",
      width: "10%",
    },
    {
      key: "score",
      header: "Score",
      accessor: (r) => <span className="tabular-nums font-medium">{r.trader.score ?? "—"}</span>,
      sortValue: (r) => r.trader.score ?? 0,
      align: "right",
      width: "10%",
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
      width: "10%",
    },
    {
      key: "sparkline",
      header: "Динаміка 12 тижнів",
      accessor: (r) => <Sparkline values={r.sparkline} />,
      width: "22%",
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
      width: "12%",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card label="FILTER" className="grid grid-cols-4 gap-3">
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
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Нічого не знайдено"
          description="Жоден трейдер не відповідає обраним фільтрам. Спробуйте прибрати частину умов."
        />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(r) => r.trader.id} />
      )}
    </div>
  );
}
