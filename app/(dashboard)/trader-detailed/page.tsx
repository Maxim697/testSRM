import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TraderDetailedView } from "@/components/trader-detailed/trader-detailed-view";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { createClient } from "@/lib/supabase/server";
import type { TraderWeekly } from "@/lib/types";

export default async function TraderDetailedPage() {
  const supabase = await createClient();
  const [traders, weeklyRes] = await Promise.all([
    getEnrichedTraders(),
    supabase.from("trader_weekly").select("*").order("week_start", { ascending: true }),
  ]);

  const weeklyByTrader = new Map<string, TraderWeekly[]>();
  for (const row of (weeklyRes.data ?? []) as TraderWeekly[]) {
    const list = weeklyByTrader.get(row.trader_id) ?? [];
    list.push(row);
    weeklyByTrader.set(row.trader_id, list);
  }

  return (
    <>
      <PageHeader title="Trader Detailed" description="Детальна аналітика по трейдерах" />
      {traders.length === 0 ? (
        <EmptyState title="Даних поки немає" description="У портфелі ще немає трейдерів." />
      ) : (
        <TraderDetailedView
          traders={traders}
          weeklyByTrader={Object.fromEntries(weeklyByTrader)}
        />
      )}
    </>
  );
}
