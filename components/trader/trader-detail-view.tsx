"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@/components/ui/tier";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Tabs } from "@/components/ui/tabs";
import { ScoreTrendChart } from "@/components/ui/score-trend-chart";
import { HistoryTab } from "@/components/trader/history-tab";
import { TasksTab } from "@/components/trader/tasks-tab";
import { MetricsTab } from "@/components/trader/metrics-tab";
import { daysSince, formatNumber, formatPercent, percentDelta, scoreDelta } from "@/lib/format";
import type {
  InteractionWithAuthor,
  TaskWithRelations,
  TraderWeekly,
  TraderWithManager,
} from "@/lib/types";

const STATUS_LABELS: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<string, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

export function TraderDetailView({
  trader,
  weekly,
  interactions: initialInteractions,
  tasks: initialTasks,
  currentUserId,
}: {
  trader: TraderWithManager;
  weekly: TraderWeekly[];
  interactions: InteractionWithAuthor[];
  tasks: TaskWithRelations[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState("history");
  const [interactions, setInteractions] = useState(initialInteractions);
  const [tasks, setTasks] = useState(initialTasks);

  const daysSinceContact = useMemo(() => {
    const last = interactions[0]?.created_at;
    return daysSince(last);
  }, [interactions]);

  const crDelta = useMemo(() => {
    const sorted = [...weekly].sort((a, b) => a.week_start.localeCompare(b.week_start));
    const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    if (!prev || prev.cr === null || trader.cr === null) return null;
    return Math.round((trader.cr - prev.cr) * 10) / 10;
  }, [weekly, trader.cr]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold text-text-primary">{trader.code}</h1>
          {trader.tier && <Tier variant={trader.tier} />}
          {trader.status && (
            <Badge variant={STATUS_BADGE[trader.status]}>{STATUS_LABELS[trader.status]}</Badge>
          )}
          <span className="text-base text-text-secondary">
            Депозит: <span className="tabular-nums text-text-primary">{formatNumber(trader.deposit)}</span>
          </span>
          <span className="text-base text-text-secondary">
            Менеджер: <span className="text-text-primary">{trader.manager?.full_name ?? "—"}</span>
          </span>
          <span
            className={`text-base ${daysSinceContact !== null && daysSinceContact >= 5 ? "text-negative font-medium" : "text-text-secondary"}`}
          >
            Днів без контакту: <span className="tabular-nums">{daysSinceContact ?? "—"}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => setTab("history")}>
            Додати нотатку
          </Button>
          <Button variant="primary" onClick={() => setTab("tasks")}>
            Створити завдання
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          label="Оборот за тиждень"
          value={formatNumber(trader.turnover_week)}
          delta={percentDelta(trader.turnover_delta)}
        />
        <KpiCard
          label="CR"
          value={formatPercent(trader.cr)}
          delta={
            crDelta === null
              ? undefined
              : { value: `${crDelta > 0 ? "+" : ""}${crDelta}пп`, direction: crDelta > 0 ? "up" : crDelta < 0 ? "down" : "flat" }
          }
        />
        <KpiCard label="Score" value={trader.score?.toString() ?? "—"} delta={scoreDelta(trader.score_delta)} />
        <KpiCard label="SLA IN" value={trader.sla_in ?? "—"} />
        <KpiCard label="SLA OUT" value={trader.sla_out ?? "—"} />
      </div>

      <div className="rounded-card border border-border bg-surface-2 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Динаміка Score за 12 тижнів
        </div>
        <ScoreTrendChart points={weekly.map((w) => ({ weekStart: w.week_start, score: w.score }))} />
      </div>

      <Tabs
        items={[
          { label: "Історія", value: "history" },
          { label: "Завдання", value: "tasks" },
          { label: "Показники", value: "metrics" },
        ]}
        value={tab}
        onValueChange={setTab}
      />

      {tab === "history" && (
        <HistoryTab
          traderId={trader.id}
          currentUserId={currentUserId}
          interactions={interactions}
          onCreated={(row) => setInteractions((prev) => [row, ...prev])}
        />
      )}
      {tab === "tasks" && (
        <TasksTab
          traderId={trader.id}
          traderCode={trader.code}
          tasks={tasks}
          onCreated={(row) => setTasks((prev) => [...prev, row])}
          onUpdated={(row) => setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)))}
        />
      )}
      {tab === "metrics" && <MetricsTab weekly={weekly} />}
    </div>
  );
}
