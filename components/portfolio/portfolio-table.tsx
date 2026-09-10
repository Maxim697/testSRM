"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RISK_LEVEL_COLOR_VAR } from "@/lib/risk-score";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { Profile } from "@/lib/types";
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

export function PortfolioTable({
  traders: initialTraders,
  allManagers,
  canReassign,
  currentUserId,
}: {
  traders: EnrichedTrader[];
  allManagers: Profile[];
  canReassign: boolean;
  currentUserId: string;
}) {
  const [traders, setTraders] = useState(initialTraders);
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

  async function handleManagerChange(traderId: string, managerId: string) {
    const trader = traders.find((t) => t.id === traderId);
    const previousManagerId = trader?.manager_id ?? null;
    const newManager = allManagers.find((m) => m.id === managerId) ?? null;
    setTraders((prev) =>
      prev.map((t) =>
        t.id === traderId ? { ...t, manager_id: managerId, manager: { full_name: newManager?.full_name ?? null } } : t,
      ),
    );

    const supabase = createClient();
    await supabase
      .from("traders")
      .update({ manager_id: managerId, previous_manager_id: previousManagerId })
      .eq("id", traderId);

    if (trader) {
      await logAudit(supabase, {
        actorId: currentUserId,
        action: AUDIT_ACTIONS.MANAGER_CHANGE,
        entityType: "trader",
        entityId: traderId,
        entityLabel: trader.code,
        oldValue: trader.manager?.full_name ?? "—",
        newValue: newManager?.full_name ?? "—",
      });
    }
  }

  const columns: DataTableColumn<EnrichedTrader>[] = [
    {
      key: "code",
      header: "Trader",
      // Wide enough for the longest real trader code ("RE[P2P] Vikram
      // Patel", 22 chars) without ellipsis — only genuinely long outliers
      // should ever truncate, not the routine case.
      width: "210px",
      accessor: (t) => (
        <Link
          href={`/trader/${t.id}`}
          prefetch={false}
          className="font-medium text-text-primary hover:text-accent hover:underline"
        >
          {t.code}
        </Link>
      ),
      sortValue: (t) => t.code,
    },
    {
      key: "tier",
      header: "Tier",
      width: "90px",
      accessor: (t) => (t.tier ? <Tier variant={t.tier} /> : "—"),
      sortValue: (t) => t.tier ?? "",
    },
    {
      key: "deposit",
      header: "Депозит",
      width: "100px",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.deposit)}</span>,
      sortValue: (t) => t.deposit ?? 0,
      align: "right",
    },
    {
      key: "turnover_week",
      header: "Оборот за тиждень",
      width: "130px",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.turnover_week)}</span>,
      sortValue: (t) => t.turnover_week ?? 0,
      align: "right",
    },
    {
      key: "turnover_delta",
      header: "Δ Оборот",
      width: "100px",
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
      width: "80px",
      accessor: (t) => <span className="tabular-nums">{formatPercent(t.cr)}</span>,
      sortValue: (t) => t.cr ?? 0,
      align: "right",
    },
    {
      key: "cr_delta",
      header: "Δ CR",
      width: "100px",
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
      width: "90px",
      accessor: (t) => <span className="tabular-nums">{t.sla_in ?? "—"}</span>,
      sortValue: (t) => t.sla_in ?? "",
    },
    {
      key: "sla_out",
      header: "SLA OUT",
      width: "90px",
      accessor: (t) => <span className="tabular-nums">{t.sla_out ?? "—"}</span>,
      sortValue: (t) => t.sla_out ?? "",
    },
    {
      key: "score",
      header: "Score",
      width: "80px",
      accessor: (t) => <span className="tabular-nums">{t.score ?? "—"}</span>,
      sortValue: (t) => t.score ?? 0,
      align: "right",
    },
    {
      key: "score_delta",
      header: "Δ Score",
      width: "90px",
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
      width: "100px",
      accessor: (t) =>
        t.status ? <Badge variant={STATUS_BADGE[t.status]}>{STATUS_LABELS[t.status]}</Badge> : "—",
      sortValue: (t) => t.status ?? "",
    },
    {
      key: "risk",
      header: "Ризик",
      width: "100px",
      accessor: (t) => <RiskBadge risk={t.risk} size="sm" />,
      sortValue: (t) => t.risk.score,
      align: "right",
    },
    {
      key: "days_since_contact",
      header: "Днів без контакту",
      width: "100px",
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
      width: "170px",
      accessor: (t) =>
        canReassign ? (
          <Select
            value={t.manager_id ?? ""}
            onChange={(e) => handleManagerChange(t.id, e.target.value)}
            className="w-40"
          >
            <option value="" disabled>
              Без менеджера
            </option>
            {allManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Без імені"}
              </option>
            ))}
          </Select>
        ) : (
          (t.manager?.full_name ?? "—")
        ),
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
        // Only the top two risk bands get a stripe — red for critical
        // (75-100), orange for high (50-74). Medium (25-49) is common
        // enough that striping it flags most of the table; that level is
        // still shown in the "Ризик" column and on the trader card, just
        // not as a row stripe.
        rowAccent={(t) =>
          t.risk.level === "critical" || t.risk.level === "high"
            ? RISK_LEVEL_COLOR_VAR[t.risk.level]
            : undefined
        }
      />
    </div>
  );
}
