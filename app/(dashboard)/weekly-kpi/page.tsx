import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { StackedBarChart } from "@/components/ui/stacked-bar-chart";
import { WeeklyKpiTable } from "@/components/weekly-kpi/weekly-kpi-table";
import { getWeeklyAggregates } from "@/lib/weekly-metrics";
import { formatNumber, formatPercent } from "@/lib/format";

function delta(current: number, previous: number | undefined) {
  if (previous === undefined) return null;
  return Math.round((current - previous) * 10) / 10;
}

function deltaBadge(
  value: number | null,
  suffix = "",
): { value: string; direction: "up" | "down" | "flat" } {
  if (value === null) return { value: "—", direction: "flat" };
  const direction: "up" | "down" | "flat" = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return { value: `${value > 0 ? "+" : ""}${value}${suffix}`, direction };
}

export default async function WeeklyKpiPage() {
  const weeks = await getWeeklyAggregates();

  if (weeks.length === 0) {
    return (
      <>
        <PageHeader title="Weekly KPI" description="Ключові показники за тиждень" />
        <EmptyState title="Даних поки немає" description="Історія по тижнях ще не накопичилась." />
      </>
    );
  }

  const last = weeks[weeks.length - 1]!;
  const prev = weeks.length >= 2 ? weeks[weeks.length - 2] : undefined;

  const turnoverDelta = delta(last.turnoverTotal, prev?.turnoverTotal);
  const crDelta = delta(last.crAvg, prev?.crAvg);
  const scoreDelta = delta(last.scoreAvg, prev?.scoreAvg);
  const activeDelta = delta(last.activeCount, prev?.activeCount);

  return (
    <>
      <PageHeader title="Weekly KPI" description="Ключові показники за тиждень" />

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Сумарний оборот" value={formatNumber(last.turnoverTotal)} delta={deltaBadge(turnoverDelta)} />
        <KpiCard label="Середній CR" value={formatPercent(last.crAvg, 1)} delta={deltaBadge(crDelta, "пп")} />
        <KpiCard label="Середній score" value={last.scoreAvg.toString()} delta={deltaBadge(scoreDelta)} />
        <KpiCard label="Активних трейдерів" value={last.activeCount.toString()} delta={deltaBadge(activeDelta)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Сумарний оборот за 12 тижнів
          </div>
          <TrendChart
            points={weeks.map((w) => ({ weekStart: w.weekStart, value: w.turnoverTotal }))}
            variant="area"
            format="number"
          />
        </Card>
        <Card>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Середній CR за 12 тижнів
          </div>
          <TrendChart
            points={weeks.map((w) => ({ weekStart: w.weekStart, value: w.crAvg }))}
            variant="line"
            color="var(--color-series-2)"
            format="percent"
          />
        </Card>
      </div>

      <Card>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Розподіл трейдерів за статусами по тижнях
        </div>
        <StackedBarChart
          points={weeks.map((w) => ({ weekStart: w.weekStart, green: w.greenCount, amber: w.amberCount, red: w.redCount }))}
        />
      </Card>

      <WeeklyKpiTable weeks={weeks} />
    </>
  );
}
