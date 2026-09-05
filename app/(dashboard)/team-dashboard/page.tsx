import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiRow } from "@/components/ui/kpi-row";
import { Card } from "@/components/ui/card";
import { TrendChart } from "@/components/ui/trend-chart";
import { ManagersTable } from "@/components/team-dashboard/managers-table";
import { StatusByManagerChart } from "@/components/team-dashboard/status-by-manager-chart";
import { RiskDistributionChart } from "@/components/team-dashboard/risk-distribution-chart";
import { TopRiskTable } from "@/components/team-dashboard/top-risk-table";
import { getCurrentProfile } from "@/lib/current-user";
import { getTeamDashboardData } from "@/lib/team-dashboard";
import { formatNumber, formatPercent } from "@/lib/format";

function deltaBadge(value: number | null, suffix = ""): { value: string; direction: "up" | "down" | "flat" } {
  if (value === null) return { value: "—", direction: "flat" };
  const direction: "up" | "down" | "flat" = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return { value: `${value > 0 ? "+" : ""}${formatNumber(value)}${suffix}`, direction };
}

export default async function TeamDashboardPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Дашборд команди" description="Загальна картина по всій команді" />
        <EmptyState
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const data = await getTeamDashboardData();

  return (
    <>
      <PageHeader title="Дашборд команди" description="Загальна картина по всій команді" />

      <KpiRow
        items={[
          {
            label: "Оборот за тиждень",
            value: formatNumber(data.kpi.turnoverTotal),
            delta: deltaBadge(data.kpi.turnoverDelta),
          },
          { label: "Трейдерів у роботі", value: data.kpi.tradersInWork.toString() },
          { label: "Середній CR", value: formatPercent(data.kpi.crAvg, 1) },
          {
            label: "У зоні ризику",
            value: data.kpi.riskCount.toString(),
            status: data.kpi.riskCount > 0 ? "warning" : "neutral",
          },
          {
            label: "Звітів на розгляді",
            value: data.kpi.reportsPending.toString(),
            status: data.kpi.reportsPending > 0 ? "warning" : "neutral",
          },
          {
            label: "Прострочених завдань",
            value: data.kpi.overdueTasks.toString(),
            status: data.kpi.overdueTasks > 0 ? "negative" : "neutral",
          },
        ]}
      />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Менеджери</h2>
        {data.managers.length === 0 ? (
          <EmptyState title="Немає менеджерів" description="У системі ще немає жодного менеджера." />
        ) : (
          <ManagersTable managers={data.managers} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Розподіл портфеля</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Статуси трейдерів по менеджерах
            </div>
            <StatusByManagerChart points={data.statusByManager} />
          </Card>
          <Card>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Розподіл за рівнями ризику
            </div>
            <RiskDistributionChart counts={data.riskDistribution} />
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Динаміка команди</h2>
        {data.weeklyTrend.length === 0 ? (
          <EmptyState title="Даних поки немає" description="Історія по тижнях ще не накопичилась." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                Сумарний оборот за 12 тижнів
              </div>
              <TrendChart
                points={data.weeklyTrend.map((w) => ({ weekStart: w.weekStart, value: w.turnoverTotal }))}
                variant="area"
                format="number"
              />
            </Card>
            <Card>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                Середній CR за 12 тижнів
              </div>
              <TrendChart
                points={data.weeklyTrend.map((w) => ({ weekStart: w.weekStart, value: w.crAvg }))}
                variant="line"
                color="var(--color-series-2)"
                format="percent"
              />
            </Card>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Потребує уваги</h2>
        {data.topRisk.length === 0 ? (
          <EmptyState title="Ризиків не виявлено" description="Немає трейдерів у зоні ризику." />
        ) : (
          <TopRiskTable traders={data.topRisk} />
        )}
      </div>
    </>
  );
}
