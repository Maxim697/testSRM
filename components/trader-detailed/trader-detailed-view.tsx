"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DualLineChart } from "@/components/ui/dual-line-chart";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, formatPercent, percentDelta, scoreDelta } from "@/lib/format";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { TraderWeekly, TraderStatus } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

export function TraderDetailedView({
  traders,
  weeklyByTrader,
}: {
  traders: EnrichedTrader[];
  weeklyByTrader: Record<string, TraderWeekly[]>;
}) {
  const [selectedId, setSelectedId] = useState("");

  const selected = useMemo(() => traders.find((t) => t.id === selectedId) ?? null, [traders, selectedId]);
  const weekly = selectedId ? weeklyByTrader[selectedId] ?? [] : [];
  const sorted = [...weekly].sort((a, b) => a.week_start.localeCompare(b.week_start));

  const columns: DataTableColumn<TraderWeekly>[] = [
    { key: "week", header: "Тиждень", accessor: (w) => formatDate(w.week_start), sortValue: (w) => w.week_start },
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
      accessor: (w) =>
        w.status ? <Badge variant={STATUS_BADGE[w.status as TraderStatus]}>{STATUS_LABELS[w.status]}</Badge> : "—",
      sortValue: (w) => w.status ?? "",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card>
        <label className="mb-1.5 block text-xs text-text-secondary">Трейдер</label>
        <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="max-w-sm">
          <option value="">Оберіть трейдера</option>
          {traders.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code}
            </option>
          ))}
        </Select>
      </Card>

      {!selected ? (
        <EmptyState
          title="Оберіть трейдера"
          description="Виберіть трейдера зі списку вище, щоб побачити детальну аналітику."
        />
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3">
            <KpiCard label="Score" value={selected.score?.toString() ?? "—"} delta={scoreDelta(selected.score_delta)} />
            <KpiCard label="CR" value={formatPercent(selected.cr)} delta={percentDelta(selected.crDelta)} />
            <KpiCard
              label="Оборот за тиждень"
              value={formatNumber(selected.turnover_week)}
              delta={percentDelta(selected.turnover_delta)}
            />
            <KpiCard label="SLA IN" value={selected.sla_in ?? "—"} />
            <KpiCard label="SLA OUT" value={selected.sla_out ?? "—"} />
          </div>

          <Card>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Score та CR за 12 тижнів
            </div>
            {sorted.length === 0 ? (
              <EmptyState title="Немає історії" description="Дані по тижнях ще не накопичились." />
            ) : (
              <DualLineChart
                points={sorted.map((w) => ({ weekStart: w.week_start, a: w.score, b: w.cr }))}
                labelA="Score"
                labelB="CR"
              />
            )}
          </Card>

          <DataTable columns={columns} data={[...sorted].reverse()} rowKey={(w) => w.id} />
        </>
      )}
    </div>
  );
}
