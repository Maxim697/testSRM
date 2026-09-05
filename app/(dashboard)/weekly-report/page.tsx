import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WeeklyReportView } from "@/components/weekly-report/weekly-report-view";
import { getWeeklyAggregates } from "@/lib/weekly-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { getOrCreateWeeklyReport, getWeeklyTasksWithNotes } from "@/lib/weekly-reports";
import { buildDrilldown } from "@/lib/weekly-report-drilldown";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyReport } from "@/lib/types";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const current = await getCurrentProfile();
  if (!current) return null;

  const weeks = await getWeeklyAggregates();

  if (weeks.length === 0) {
    return (
      <>
        <PageHeader title="Тижневий звіт" description="Підсумки роботи за тиждень" />
        <EmptyState title="Даних поки немає" description="Історія по тижнях ще не накопичилась." />
      </>
    );
  }

  const { week: weekParam } = await searchParams;
  let weekIndex = weeks.length - 1;
  if (weekParam) {
    const found = weeks.findIndex((w) => w.weekStart === weekParam);
    if (found !== -1) weekIndex = found;
  }
  const weekStart = weeks[weekIndex]!.weekStart;

  const { report, rows } = await getOrCreateWeeklyReport(current.userId, weekStart, weekIndex, weeks);

  const supabase = await createClient();
  const [historyRes, portfolioCountRes, weeklyTasks, drilldown] = await Promise.all([
    supabase
      .from("weekly_reports")
      .select("*")
      .eq("author_id", current.userId)
      .order("week_start", { ascending: false }),
    supabase.from("traders").select("*", { count: "exact", head: true }),
    getWeeklyTasksWithNotes(current.userId, weekStart, report.id),
    buildDrilldown(current.userId, weekStart),
  ]);

  return (
    <>
      <PageHeader title="Тижневий звіт" description="Підсумки роботи за тиждень" />
      <WeeklyReportView
        weeks={weeks.map((w) => w.weekStart)}
        selectedWeekStart={weekStart}
        report={report}
        rows={rows}
        history={(historyRes.data ?? []) as WeeklyReport[]}
        portfolioCount={portfolioCountRes.count ?? 0}
        tasks={weeklyTasks}
        drilldown={drilldown}
      />
    </>
  );
}
