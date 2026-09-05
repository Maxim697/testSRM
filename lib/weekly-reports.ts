import { createClient } from "@/lib/supabase/server";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { buildActivityRows, buildMetricRows } from "@/lib/weekly-report-metrics";
import { computeActivityMetrics } from "@/lib/weekly-report-activity";
import { getWeeklyTasksWithNotesData } from "@/lib/weekly-report-tasks-core";
import type { WeeklyAggregate } from "@/lib/weekly-metrics";
import type { WeeklyReport, WeeklyReportRow } from "@/lib/types";

export type { WeeklyTaskWithNote } from "@/lib/weekly-report-tasks-core";

export async function getWeeklyTasksWithNotes(
  authorId: string,
  weekStart: string,
  reportId: string,
) {
  const supabase = await createClient();
  return getWeeklyTasksWithNotesData(supabase, authorId, weekStart, reportId);
}

export async function getOrCreateWeeklyReport(
  userId: string,
  weekStart: string,
  weekIndex: number,
  weeks: WeeklyAggregate[],
): Promise<{ report: WeeklyReport; rows: WeeklyReportRow[] }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("author_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existing) {
    const { data: rows } = await supabase
      .from("weekly_report_rows")
      .select("*")
      .eq("report_id", existing.id);
    return { report: existing as WeeklyReport, rows: (rows ?? []) as WeeklyReportRow[] };
  }

  const [traders, tasksRes, activity] = await Promise.all([
    getEnrichedTraders(),
    supabase.from("tasks").select("id, status, due_date"),
    computeActivityMetrics(userId, weekStart),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const tasks = tasksRes.data ?? [];
  const overdueTasksCount = tasks.filter(
    (t) => t.status === "overdue" || (t.status !== "done" && t.due_date && t.due_date < today),
  ).length;
  const noContactCount = traders.filter(
    (t) => t.daysSinceContact !== null && t.daysSinceContact >= 5,
  ).length;

  const computedRows = [
    ...buildMetricRows(weeks, weekIndex, { overdueTasksCount, noContactCount }),
    ...buildActivityRows(activity),
  ];

  const { data: created, error: createError } = await supabase
    .from("weekly_reports")
    .insert({ author_id: userId, week_start: weekStart, status: "draft" })
    .select("*")
    .single();

  if (createError || !created) {
    // Most likely a race against the unique (author_id, week_start)
    // constraint — someone/something else created it first. Re-fetch.
    const { data: retry } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("author_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (retry) {
      const { data: rows } = await supabase
        .from("weekly_report_rows")
        .select("*")
        .eq("report_id", retry.id);
      return { report: retry as WeeklyReport, rows: (rows ?? []) as WeeklyReportRow[] };
    }
    throw createError ?? new Error("Failed to create weekly report");
  }

  const { data: insertedRows } = await supabase
    .from("weekly_report_rows")
    .insert(computedRows.map((r) => ({ ...r, report_id: created.id, comment: "" })))
    .select("*");

  return { report: created as WeeklyReport, rows: (insertedRows ?? []) as WeeklyReportRow[] };
}
