import { createClient } from "@/lib/supabase/server";
import { buildDrilldownData } from "@/lib/weekly-report-drilldown-core";
import { addDays } from "@/lib/week-range";
import { ACTIVITY_METRIC_KEYS } from "@/lib/weekly-report-constants";
import type { WeeklyReport, WeeklyReportRow } from "@/lib/types";

type TraderDynamicsEntry = {
  code: string;
  score_delta: number | null;
  turnover_delta: number | null;
  status_from: string | null;
  status_to: string | null;
};

export type ReportDraftContext = {
  week_start: string;
  week_end: string;
  metrics: { metric_key: string; metric_label: string; value: string | null; delta: string | null }[];
  activity: { metric_key: string; metric_label: string; value: string | null }[];
  trader_dynamics: {
    grew: TraderDynamicsEntry[];
    fell: TraderDynamicsEntry[];
    status_changed: TraderDynamicsEntry[];
  };
  no_contact_traders: string[];
  overdue_tasks: { title: string; due_date: string | null }[];
  previous_report: {
    week_start: string;
    work_done: string | null;
    blockers: string | null;
    next_week_plan: string | null;
    reviewer_comment: string | null;
  } | null;
};

export async function buildReportDraftContext(
  authorId: string,
  report: WeeklyReport,
  rows: WeeklyReportRow[],
): Promise<ReportDraftContext> {
  const supabase = await createClient();
  const activityKeys: readonly string[] = ACTIVITY_METRIC_KEYS;
  const weekEnd = addDays(report.week_start, 6);
  const prevWeekStart = addDays(report.week_start, -7);

  const [drilldown, tradersRes, currentWeeklyRes, prevWeeklyRes, previousReportRes] = await Promise.all([
    buildDrilldownData(supabase, authorId, report.week_start),
    supabase.from("traders").select("id, code").eq("manager_id", authorId),
    supabase.from("trader_weekly").select("trader_id, score, turnover, status").eq("week_start", report.week_start),
    supabase.from("trader_weekly").select("trader_id, score, turnover, status").eq("week_start", prevWeekStart),
    supabase
      .from("weekly_reports")
      .select("week_start, work_done, blockers, next_week_plan, reviewer_comment")
      .eq("author_id", authorId)
      .lt("week_start", report.week_start)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const traders = (tradersRes.data ?? []) as { id: string; code: string }[];
  const traderIds = new Set(traders.map((t) => t.id));
  const codeById = new Map(traders.map((t) => [t.id, t.code]));

  type WeeklyRow = { trader_id: string; score: number | null; turnover: number | null; status: string | null };
  const currentByTrader = new Map(
    ((currentWeeklyRes.data ?? []) as WeeklyRow[]).filter((r) => traderIds.has(r.trader_id)).map((r) => [r.trader_id, r]),
  );
  const prevByTrader = new Map(
    ((prevWeeklyRes.data ?? []) as WeeklyRow[]).filter((r) => traderIds.has(r.trader_id)).map((r) => [r.trader_id, r]),
  );

  const grew: TraderDynamicsEntry[] = [];
  const fell: TraderDynamicsEntry[] = [];
  const statusChanged: TraderDynamicsEntry[] = [];

  for (const traderId of new Set([...currentByTrader.keys(), ...prevByTrader.keys()])) {
    const current = currentByTrader.get(traderId);
    const prev = prevByTrader.get(traderId);
    const code = codeById.get(traderId) ?? traderId;
    const scoreDelta =
      current?.score != null && prev?.score != null ? current.score - prev.score : null;
    const turnoverDelta =
      current?.turnover != null && prev?.turnover != null ? current.turnover - prev.turnover : null;
    const entry: TraderDynamicsEntry = {
      code,
      score_delta: scoreDelta,
      turnover_delta: turnoverDelta,
      status_from: prev?.status ?? null,
      status_to: current?.status ?? null,
    };

    if (scoreDelta !== null && scoreDelta > 0) grew.push(entry);
    if (scoreDelta !== null && scoreDelta < 0) fell.push(entry);
    if (prev?.status && current?.status && prev.status !== current.status) statusChanged.push(entry);
  }

  grew.sort((a, b) => (b.score_delta ?? 0) - (a.score_delta ?? 0));
  fell.sort((a, b) => (a.score_delta ?? 0) - (b.score_delta ?? 0));

  const previousReportRow = previousReportRes.data as {
    week_start: string;
    work_done: string | null;
    blockers: string | null;
    next_week_plan: string | null;
    reviewer_comment: string | null;
  } | null;

  return {
    week_start: report.week_start,
    week_end: weekEnd,
    metrics: rows
      .filter((r) => !activityKeys.includes(r.metric_key))
      .map((r) => ({ metric_key: r.metric_key, metric_label: r.metric_label, value: r.value, delta: r.delta })),
    activity: rows
      .filter((r) => activityKeys.includes(r.metric_key))
      .map((r) => ({ metric_key: r.metric_key, metric_label: r.metric_label, value: r.value })),
    trader_dynamics: {
      grew: grew.slice(0, 8),
      fell: fell.slice(0, 8),
      status_changed: statusChanged,
    },
    no_contact_traders: (drilldown.no_contact_5d ?? []).map((item) => item.label),
    overdue_tasks: (drilldown.overdue_tasks ?? []).map((item) => ({ title: item.label, due_date: item.meta ?? null })),
    previous_report: previousReportRow
      ? {
          week_start: previousReportRow.week_start,
          work_done: previousReportRow.work_done,
          blockers: previousReportRow.blockers,
          next_week_plan: previousReportRow.next_week_plan,
          reviewer_comment: previousReportRow.reviewer_comment,
        }
      : null,
  };
}
