import type { WeeklyAggregate } from "@/lib/weekly-metrics";
import { formatNumber, formatPercent } from "@/lib/format";

export type ComputedMetricRow = {
  metric_key: string;
  metric_label: string;
  value: string;
  delta: string;
};

function deltaText(current: number, previous: number | undefined, suffix = ""): string {
  if (previous === undefined) return "—";
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return "0" + suffix;
  return `${diff > 0 ? "+" : ""}${diff}${suffix}`;
}

export function buildMetricRows(
  weeks: WeeklyAggregate[],
  weekIndex: number,
  liveMetrics: { overdueTasksCount: number; noContactCount: number },
): ComputedMetricRow[] {
  const week = weeks[weekIndex]!;
  const prevWeek = weekIndex > 0 ? weeks[weekIndex - 1] : undefined;

  return [
    {
      metric_key: "active_traders",
      metric_label: "Середня кількість активних трейдерів / день",
      value: week.activeCount.toString(),
      delta: deltaText(week.activeCount, prevWeek?.activeCount),
    },
    {
      metric_key: "turnover",
      metric_label: "Сумарний оборот за тиждень",
      value: formatNumber(week.turnoverTotal),
      delta: deltaText(week.turnoverTotal, prevWeek?.turnoverTotal),
    },
    {
      metric_key: "cr",
      metric_label: "Середній CR за тиждень",
      value: formatPercent(week.crAvg, 1),
      delta: deltaText(week.crAvg, prevWeek?.crAvg, "пп"),
    },
    {
      metric_key: "score",
      metric_label: "Середній score по портфелю",
      value: week.scoreAvg.toString(),
      delta: deltaText(week.scoreAvg, prevWeek?.scoreAvg),
    },
    {
      metric_key: "green",
      metric_label: "Кількість трейдерів у статусі Green",
      value: week.greenCount.toString(),
      delta: deltaText(week.greenCount, prevWeek?.greenCount),
    },
    {
      metric_key: "amber",
      metric_label: "Кількість трейдерів у статусі Amber",
      value: week.amberCount.toString(),
      delta: deltaText(week.amberCount, prevWeek?.amberCount),
    },
    {
      metric_key: "red",
      metric_label: "Кількість трейдерів у статусі Red",
      value: week.redCount.toString(),
      delta: deltaText(week.redCount, prevWeek?.redCount),
    },
    {
      metric_key: "no_contact_5d",
      metric_label: "Кількість трейдерів без контакту 5+ днів",
      value: liveMetrics.noContactCount.toString(),
      delta: "—",
    },
    {
      metric_key: "overdue_tasks",
      metric_label: "Кількість прострочених завдань",
      value: liveMetrics.overdueTasksCount.toString(),
      delta: "—",
    },
  ];
}
