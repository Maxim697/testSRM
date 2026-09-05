"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import { formatNumber, formatPercent } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

function deltaText(value: number | null, suffix = "") {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function deltaClass(value: number | null) {
  if (value === null || value === undefined || value === 0) return "text-text-muted";
  return value > 0 ? "text-positive" : "text-negative";
}

export function PortfolioTable({ traders }: { traders: EnrichedTrader[] }) {
  const [managerFilter, setManagerFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const managers = useMemo(() => {
    const set = new Map<string, string>();
    for (const t of traders) {
      if (t.manager_id && t.manager?.full_name) set.set(t.manager_id, t.manager.full_name);
    }
    return [...set.entries()];
  }, [traders]);

  const filtered = useMemo(() => {
    return traders.filter((t) => {
      if (managerFilter && t.manager_id !== managerFilter) return false;
      if (tierFilter && t.tier !== tierFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (search && !t.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [traders, managerFilter, tierFilter, statusFilter, search]);

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
      key: "deposit",
      header: "Депозит",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.deposit)}</span>,
      sortValue: (t) => t.deposit ?? 0,
      align: "right",
    },
    {
      key: "turnover_week",
      header: "Оборот за тиждень",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.turnover_week)}</span>,
      sortValue: (t) => t.turnover_week ?? 0,
      align: "right",
    },
    {
      key: "turnover_delta",
      header: "Δ Оборот",
      accessor: (t) => (
        <span className={`tabular-nums ${deltaClass(t.turnover_delta)}`}>
          {deltaText(t.turnover_delta, "%")}
        </span>
      ),
      sortValue: (t) => t.turnover_delta ?? 0,
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
      key: "cr_delta",
      header: "Δ CR",
      accessor: (t) => (
        <span className={`tabular-nums ${deltaClass(t.crDelta)}`}>
          {deltaText(t.crDelta, "пп")}
        </span>
      ),
      sortValue: (t) => t.crDelta ?? 0,
      align: "right",
    },
    {
      key: "sla_in",
      header: "SLA IN",
      accessor: (t) => <span className="tabular-nums">{t.sla_in ?? "—"}</span>,
      sortValue: (t) => t.sla_in ?? "",
    },
    {
      key: "sla_out",
      header: "SLA OUT",
      accessor: (t) => <span className="tabular-nums">{t.sla_out ?? "—"}</span>,
      sortValue: (t) => t.sla_out ?? "",
    },
    {
      key: "score",
      header: "Score",
      accessor: (t) => <span className="tabular-nums">{t.score ?? "—"}</span>,
      sortValue: (t) => t.score ?? 0,
      align: "right",
    },
    {
      key: "score_delta",
      header: "Δ Score",
      accessor: (t) => (
        <span className={`tabular-nums ${deltaClass(t.score_delta)}`}>
          {deltaText(t.score_delta)}
        </span>
      ),
      sortValue: (t) => t.score_delta ?? 0,
      align: "right",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (t) =>
        t.status ? <Badge variant={STATUS_BADGE[t.status]}>{STATUS_LABELS[t.status]}</Badge> : "—",
      sortValue: (t) => t.status ?? "",
    },
    {
      key: "days_since_contact",
      header: "Днів без контакту",
      accessor: (t) => (
        <span
          className={`tabular-nums ${
            t.daysSinceContact !== null && t.daysSinceContact >= 5 ? "text-negative font-medium" : ""
          }`}
        >
          {t.daysSinceContact ?? "—"}
        </span>
      ),
      sortValue: (t) => t.daysSinceContact ?? -1,
      align: "right",
    },
    {
      key: "manager",
      header: "Менеджер",
      accessor: (t) => t.manager?.full_name ?? "—",
      sortValue: (t) => t.manager?.full_name ?? "",
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
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Усі статуси</option>
          <option value="green">Green</option>
          <option value="amber">Amber</option>
          <option value="red">Red</option>
        </Select>
        <Input
          placeholder="Пошук за іменем"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(t) => t.id}
        rowClassName={(t) =>
          t.status === "red" || (t.daysSinceContact !== null && t.daysSinceContact >= 5)
            ? "bg-negative-bg"
            : undefined
        }
      />
    </div>
  );
}
