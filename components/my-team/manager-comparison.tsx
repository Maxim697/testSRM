"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ManagerCard } from "@/lib/my-team";

type MetricKey = "turnover" | "cr" | "score" | "contacts" | "risk";

const METRICS: { value: MetricKey; label: string }[] = [
  { value: "turnover", label: "Оборот" },
  { value: "cr", label: "CR" },
  { value: "score", label: "Score" },
  { value: "contacts", label: "Контакти" },
  { value: "risk", label: "Трейдери в ризику" },
];

function metricValue(m: ManagerCard, metric: MetricKey): number {
  switch (metric) {
    case "turnover":
      return m.turnoverTotal;
    case "cr":
      return m.crAvg;
    case "score":
      return m.scoreAvg;
    case "contacts":
      return m.contactsThisWeek;
    case "risk":
      return m.riskCount;
  }
}

function formatMetric(value: number, metric: MetricKey): string {
  if (metric === "cr") return formatPercent(value, 1);
  return formatNumber(value);
}

/** Horizontal bars, longest first — the point is to spot an outlier at a
 * glance, which a sorted horizontal layout does better than a table of
 * numbers or a dense vertical chart with 8-10 categories. */
export function ManagerComparison({ managers }: { managers: ManagerCard[] }) {
  const [metric, setMetric] = useState<MetricKey>("turnover");

  const sorted = [...managers].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  const max = Math.max(...sorted.map((m) => metricValue(m, metric)), 1);
  const isRiskMetric = metric === "risk";

  return (
    <div className="flex flex-col gap-3">
      <Tabs items={METRICS} value={metric} onValueChange={(v) => setMetric(v as MetricKey)} />
      <div className="fade-enter flex flex-col gap-1.5" key={metric}>
        {sorted.map((m) => {
          const value = metricValue(m, metric);
          const widthPct = Math.max((value / max) * 100, value > 0 ? 2 : 0);
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className="w-32 shrink-0 truncate text-xs text-text-secondary">{m.fullName}</div>
              <div className="h-5 flex-1 overflow-hidden rounded-control bg-surface-3">
                <div
                  className="h-full rounded-control"
                  style={{
                    width: `${widthPct}%`,
                    background: isRiskMetric && value > 0 ? "var(--color-negative)" : "var(--color-accent)",
                  }}
                />
              </div>
              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-text-primary">
                {formatMetric(value, metric)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
