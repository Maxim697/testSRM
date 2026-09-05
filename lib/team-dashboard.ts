import { createClient } from "@/lib/supabase/server";
import { getEnrichedTraders, type EnrichedTrader } from "@/lib/trader-metrics";
import { getWeeklyAggregates, type WeeklyAggregate } from "@/lib/weekly-metrics";
import { getWeekRange } from "@/lib/week-range";
import { isTaskOverdue, type RiskLevel } from "@/lib/risk-score";
import type { WeeklyReportStatus } from "@/lib/types";

export type ManagerSummary = {
  id: string;
  name: string;
  traderCount: number;
  turnoverTotal: number;
  crAvg: number;
  scoreAvg: number;
  riskCount: number;
  contactsThisWeek: number;
  tasksOpen: number;
  tasksOverdue: number;
  reportStatus: WeeklyReportStatus | "none";
  traders: EnrichedTrader[];
};

export type TeamDashboardData = {
  kpi: {
    tradersInWork: number;
    turnoverTotal: number;
    turnoverDelta: number | null;
    crAvg: number;
    riskCount: number;
    reportsPending: number;
    overdueTasks: number;
  };
  managers: ManagerSummary[];
  statusByManager: { label: string; managerId: string; green: number; amber: number; red: number }[];
  riskDistribution: Record<RiskLevel, number>;
  weeklyTrend: WeeklyAggregate[];
  topRisk: EnrichedTrader[];
};

export async function getTeamDashboardData(): Promise<TeamDashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [traders, weeks, managersRes, reportsRes, tasksRes] = await Promise.all([
    getEnrichedTraders(),
    getWeeklyAggregates(),
    supabase.from("profiles").select("id, full_name").eq("role", "manager").order("full_name"),
    supabase.from("weekly_reports").select("author_id, week_start, status"),
    supabase.from("tasks").select("assignee_id, status, due_date"),
  ]);

  const managers = (managersRes.data ?? []) as { id: string; full_name: string | null }[];
  const lastWeek = weeks.length ? weeks[weeks.length - 1]! : null;
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2]! : null;
  const weekStart = lastWeek?.weekStart ?? null;

  const contactsByManager = new Map<string, number>();
  if (weekStart) {
    const { start, end } = getWeekRange(weekStart);
    const { data: interactionsData } = await supabase
      .from("interactions")
      .select("author_id, created_at")
      .gte("created_at", start)
      .lt("created_at", end);
    for (const row of (interactionsData ?? []) as { author_id: string | null; created_at: string }[]) {
      if (!row.author_id) continue;
      contactsByManager.set(row.author_id, (contactsByManager.get(row.author_id) ?? 0) + 1);
    }
  }

  const tasksOpenByManager = new Map<string, number>();
  const tasksOverdueByManager = new Map<string, number>();
  let overdueTasksTotal = 0;
  for (const t of (tasksRes.data ?? []) as { assignee_id: string | null; status: string; due_date: string | null }[]) {
    if (!t.assignee_id) continue;
    if (t.status === "in_progress") {
      tasksOpenByManager.set(t.assignee_id, (tasksOpenByManager.get(t.assignee_id) ?? 0) + 1);
    }
    if (isTaskOverdue(t.status, t.due_date, today)) {
      tasksOverdueByManager.set(t.assignee_id, (tasksOverdueByManager.get(t.assignee_id) ?? 0) + 1);
      overdueTasksTotal += 1;
    }
  }

  const reportByManager = new Map<string, WeeklyReportStatus>();
  for (const r of (reportsRes.data ?? []) as { author_id: string; week_start: string; status: WeeklyReportStatus }[]) {
    if (weekStart && r.week_start === weekStart) reportByManager.set(r.author_id, r.status);
  }
  const reportsPending = [...reportByManager.values()].filter((s) => s === "submitted").length;

  const tradersByManager = new Map<string, EnrichedTrader[]>();
  for (const t of traders) {
    if (!t.manager_id) continue;
    const list = tradersByManager.get(t.manager_id) ?? [];
    list.push(t);
    tradersByManager.set(t.manager_id, list);
  }

  const managerSummaries: ManagerSummary[] = managers.map((m) => {
    const list = tradersByManager.get(m.id) ?? [];
    const turnoverTotal = list.reduce((sum, t) => sum + (t.turnover_week ?? 0), 0);
    const crValues = list.map((t) => t.cr).filter((v): v is number => v !== null);
    const scoreValues = list.map((t) => t.score).filter((v): v is number => v !== null);
    const riskCount = list.filter((t) => t.risk.level !== "low").length;

    return {
      id: m.id,
      name: m.full_name ?? "Без імені",
      traderCount: list.length,
      turnoverTotal,
      crAvg: crValues.length ? Math.round((crValues.reduce((a, b) => a + b, 0) / crValues.length) * 10) / 10 : 0,
      scoreAvg: scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0,
      riskCount,
      contactsThisWeek: contactsByManager.get(m.id) ?? 0,
      tasksOpen: tasksOpenByManager.get(m.id) ?? 0,
      tasksOverdue: tasksOverdueByManager.get(m.id) ?? 0,
      reportStatus: reportByManager.get(m.id) ?? "none",
      traders: list,
    };
  });

  const riskDistribution: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const t of traders) riskDistribution[t.risk.level] += 1;

  const statusByManager = managerSummaries.map((m) => ({
    label: m.name,
    managerId: m.id,
    green: m.traders.filter((t) => t.status === "green").length,
    amber: m.traders.filter((t) => t.status === "amber").length,
    red: m.traders.filter((t) => t.status === "red").length,
  }));

  const topRisk = [...traders].sort((a, b) => b.risk.score - a.risk.score).slice(0, 10);

  const crValuesAll = traders.map((t) => t.cr).filter((v): v is number => v !== null);
  const crAvgAll = crValuesAll.length ? Math.round((crValuesAll.reduce((a, b) => a + b, 0) / crValuesAll.length) * 10) / 10 : 0;

  return {
    kpi: {
      tradersInWork: traders.length,
      turnoverTotal: lastWeek?.turnoverTotal ?? 0,
      turnoverDelta: lastWeek && prevWeek ? lastWeek.turnoverTotal - prevWeek.turnoverTotal : null,
      crAvg: crAvgAll,
      riskCount: riskDistribution.medium + riskDistribution.high + riskDistribution.critical,
      reportsPending,
      overdueTasks: overdueTasksTotal,
    },
    managers: managerSummaries,
    statusByManager,
    riskDistribution,
    weeklyTrend: weeks,
    topRisk,
  };
}
