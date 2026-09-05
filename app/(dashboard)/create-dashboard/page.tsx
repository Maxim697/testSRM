import { PageHeader } from "@/components/ui/page-header";
import { CreateDashboardView } from "@/components/create-dashboard/create-dashboard-view";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getWeeklyAggregates } from "@/lib/weekly-metrics";
import { createClient } from "@/lib/supabase/server";

export default async function CreateDashboardPage() {
  const supabase = await createClient();

  const [tradersRes, weeklyRes, tasksRes, interactionsRes, traders, weeks] = await Promise.all([
    supabase.from("traders").select("*", { count: "exact", head: true }),
    supabase.from("trader_weekly").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("interactions").select("*", { count: "exact", head: true }),
    getEnrichedTraders(),
    getWeeklyAggregates(),
  ]);

  const dataSources = [
    { value: "traders", label: "traders", count: tradersRes.count ?? 0 },
    { value: "trader_weekly", label: "trader_weekly", count: weeklyRes.count ?? 0 },
    { value: "tasks", label: "tasks", count: tasksRes.count ?? 0 },
    { value: "interactions", label: "interactions", count: interactionsRes.count ?? 0 },
  ];

  const avgScore = traders.length
    ? Math.round(traders.reduce((sum, t) => sum + (t.score ?? 0), 0) / traders.length)
    : 0;
  const lastWeek = weeks[weeks.length - 1];
  const tierCounts = {
    gold: traders.filter((t) => t.tier === "gold").length,
    silver: traders.filter((t) => t.tier === "silver").length,
    bronze: traders.filter((t) => t.tier === "bronze").length,
  };
  const topTraders = [...traders].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
  const scoreTrend = weeks.map((w) => ({ weekStart: w.weekStart, score: w.scoreAvg }));

  return (
    <>
      <PageHeader title="Створити дашборд" description="Конструктор власних дашбордів" />
      <CreateDashboardView
        dataSources={dataSources}
        demoData={{
          avgScore,
          lastWeekTurnover: lastWeek?.turnoverTotal ?? 0,
          tierCounts,
          topTraders: topTraders.map((t) => ({ id: t.id, code: t.code, score: t.score, tier: t.tier })),
          scoreTrend,
        }}
      />
    </>
  );
}
