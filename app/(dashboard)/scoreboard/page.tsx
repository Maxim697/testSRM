import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { ScoreboardTable } from "@/components/scoreboard/scoreboard-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { createClient } from "@/lib/supabase/server";

export default async function ScoreboardPage() {
  const supabase = await createClient();
  const [traders, weeklyRes] = await Promise.all([
    getEnrichedTraders(),
    supabase.from("trader_weekly").select("trader_id, week_start, score"),
  ]);

  const sparklineByTrader = new Map<string, { week_start: string; score: number | null }[]>();
  for (const row of weeklyRes.data ?? []) {
    const list = sparklineByTrader.get(row.trader_id) ?? [];
    list.push(row);
    sparklineByTrader.set(row.trader_id, list);
  }
  for (const [id, list] of sparklineByTrader) {
    sparklineByTrader.set(
      id,
      list.slice().sort((a, b) => a.week_start.localeCompare(b.week_start)),
    );
  }

  const avgScore = traders.length
    ? Math.round(traders.reduce((sum, t) => sum + (t.score ?? 0), 0) / traders.length)
    : 0;
  const greenCount = traders.filter((t) => t.status === "green").length;
  const amberCount = traders.filter((t) => t.status === "amber").length;
  const redCount = traders.filter((t) => t.status === "red").length;
  const above50 = traders.filter((t) => (t.score ?? 0) > 50).length;

  const ranked = [...traders]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((t, i) => ({
      trader: t,
      rank: i + 1,
      sparkline: (sparklineByTrader.get(t.id) ?? []).map((w) => w.score),
    }));

  return (
    <>
      <PageHeader title="Scoreboard" description="Рейтинг результативності трейдерів" />

      {traders.length === 0 ? (
        <EmptyState title="Даних поки немає" description="У портфелі ще немає трейдерів." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="Середній score" value={avgScore.toString()} />
            <KpiCard label="Green / Amber / Red" value={`${greenCount} / ${amberCount} / ${redCount}`} />
            <KpiCard label="Вище 50 балів" value={above50.toString()} />
            <KpiCard label="Всього трейдерів" value={traders.length.toString()} />
          </div>

          <ScoreboardTable rows={ranked} />
        </>
      )}
    </>
  );
}
