import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WeeklyReportTable } from "@/components/weekly-report/weekly-report-table";
import { getWeeklyAggregates } from "@/lib/weekly-metrics";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyReportComment } from "@/lib/types";

export default async function WeeklyReportPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const [weeks, traders, tasksRes, commentsRes] = await Promise.all([
    getWeeklyAggregates(),
    getEnrichedTraders(),
    supabase.from("tasks").select("id, status, due_date"),
    supabase.from("weekly_report_comments").select("*"),
  ]);

  if (weeks.length === 0) {
    return (
      <>
        <PageHeader title="Тижневий звіт" description="Підсумки роботи за тиждень" />
        <EmptyState title="Даних поки немає" description="Історія по тижнях ще не накопичилась." />
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const tasks = tasksRes.data ?? [];
  const overdueTasksCount = tasks.filter(
    (t) => t.status === "overdue" || (t.status !== "done" && t.due_date && t.due_date < today),
  ).length;
  const noContactCount = traders.filter((t) => t.daysSinceContact !== null && t.daysSinceContact >= 5).length;

  return (
    <>
      <PageHeader title="Тижневий звіт" description="Підсумки роботи за тиждень" />
      <WeeklyReportTable
        weeks={weeks}
        liveMetrics={{ overdueTasksCount, noContactCount }}
        comments={(commentsRes.data ?? []) as WeeklyReportComment[]}
        currentUserId={current.userId}
      />
    </>
  );
}
