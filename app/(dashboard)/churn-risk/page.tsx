import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InactiveTradersTable } from "@/components/churn/inactive-traders-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { isSlaBreached } from "@/lib/sla";

type RiskReason = { text: string; metric: string };

export default async function ChurnRiskPage() {
  const [traders, current] = await Promise.all([getEnrichedTraders(), getCurrentProfile()]);
  if (!current) return null;

  const riskZone = traders
    .map((trader) => {
      const reasons: RiskReason[] = [];

      if (trader.score_delta !== null && trader.score_delta <= -10) {
        reasons.push({ text: "Падіння score", metric: `${trader.score_delta}` });
      }
      if (trader.turnover_delta !== null && trader.turnover_delta <= -20) {
        reasons.push({ text: "Падіння обороту", metric: `${trader.turnover_delta}%` });
      }
      if (isSlaBreached(trader.sla_in, trader.sla_out)) {
        reasons.push({
          text: "SLA вище норми",
          metric: `IN ${trader.sla_in ?? "—"} / OUT ${trader.sla_out ?? "—"}`,
        });
      }
      if (trader.daysSinceContact !== null && trader.daysSinceContact >= 7) {
        reasons.push({ text: "Дні без активності", metric: `${trader.daysSinceContact} дн.` });
      }

      return { trader, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length);

  const inactiveTraders = traders.filter(
    (t) => t.daysSinceContact === null || t.daysSinceContact >= 3,
  );

  return (
    <>
      <PageHeader title="Churn / Ризик" description="Клієнти з ризиком відтоку" />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Зона ризику</h2>
        {riskZone.length === 0 ? (
          <EmptyState title="Ризиків не виявлено" description="Немає трейдерів у зоні ризику відтоку." />
        ) : (
          <div className="flex flex-col gap-2">
            {riskZone.map(({ trader, reasons }) => (
              <Card key={trader.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{trader.code}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {reasons.map((r, i) => (
                      <Badge key={i} variant="red">
                        {r.text} · {r.metric}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button href={`/trader/${trader.id}`} variant="secondary" className="shrink-0">
                  Відкрити
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Неактивні 3+ дні</h2>
        {inactiveTraders.length === 0 ? (
          <EmptyState title="Немає неактивних" description="Усі трейдери на зв'язку." />
        ) : (
          <InactiveTradersTable traders={inactiveTraders} currentUserId={current.userId} />
        )}
      </div>
    </>
  );
}
