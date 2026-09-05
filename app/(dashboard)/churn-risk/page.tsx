import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import { KpiRow } from "@/components/ui/kpi-row";
import { RiskList } from "@/components/churn/risk-list";
import { InactiveTradersTable } from "@/components/churn/inactive-traders-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { RISK_LEVEL_LABELS, type RiskLevel } from "@/lib/risk-score";
import { formatNumber } from "@/lib/format";

export default async function ChurnRiskPage() {
  const [traders, current] = await Promise.all([getEnrichedTraders(), getCurrentProfile()]);
  if (!current) return null;

  const levelCounts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let depositAtRisk = 0;
  for (const t of traders) {
    levelCounts[t.risk.level] += 1;
    if (t.risk.level !== "low") depositAtRisk += t.deposit ?? 0;
  }

  const inactiveTraders = traders.filter(
    (t) => t.daysSinceContact === null || t.daysSinceContact >= 3,
  );

  return (
    <>
      <PageHeader title="Churn / Ризик" description="Скоринг ризику відтоку по портфелю" />

      <KpiRow
        items={[
          {
            label: "Депозит під ризиком",
            value: formatNumber(depositAtRisk),
            status: depositAtRisk > 0 ? "negative" : "neutral",
          },
          {
            label: `${RISK_LEVEL_LABELS.critical} ризик`,
            value: levelCounts.critical.toString(),
            status: "negative",
          },
          { label: `${RISK_LEVEL_LABELS.high} ризик`, value: levelCounts.high.toString(), status: "negative" },
          { label: `${RISK_LEVEL_LABELS.medium} ризик`, value: levelCounts.medium.toString(), status: "warning" },
          { label: `${RISK_LEVEL_LABELS.low} ризик`, value: levelCounts.low.toString(), status: "positive" },
        ]}
      />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Трейдери за рівнем ризику</h2>
        <RiskList traders={traders} currentUserId={current.userId} />
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Неактивні 3+ дні</h2>
        {inactiveTraders.length === 0 ? (
          <EmptyState icon={<ShieldIcon />} title="Немає неактивних" description="Усі трейдери на зв'язку." />
        ) : (
          <InactiveTradersTable traders={inactiveTraders} currentUserId={current.userId} />
        )}
      </div>
    </>
  );
}
