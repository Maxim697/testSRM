import { createClient } from "@/lib/supabase/server";
import { computeRiskScore, computeWeeklyDeltas, isTaskOverdue, type RiskLevel } from "@/lib/risk-score";
import { getWeekRange, addDays } from "@/lib/week-range";
import { daysSince } from "@/lib/format";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { Profile, TraderWithManager, WeeklyReportStatus } from "@/lib/types";

// "draft" is deliberately not a possible value here — a started-but-
// never-submitted report reads as "none" from the lead's side, nothing
// has actually come in for them to look at yet (see the coalescing
// below, right after weekly_reports is fetched).
export type ReportCardStatus = Exclude<WeeklyReportStatus, "draft"> | "none";

export type ManagerCard = {
  id: string;
  fullName: string;
  telegram: string | null;
  traderCount: number;
  turnoverTotal: number;
  turnoverDelta: number | null;
  crAvg: number;
  scoreAvg: number;
  riskCount: number;
  contactsThisWeek: number;
  tasksOpen: number;
  tasksOverdue: number;
  reportStatus: ReportCardStatus;
  lastActiveAt: string | null;
  sparkline: (number | null)[];
  traders: EnrichedTrader[];
};

export type MyTeamData = {
  team: { id: string; name: string; leadName: string | null };
  managerCount: number;
  traderCount: number;
  kpi: {
    turnoverTotal: number;
    turnoverDelta: number | null;
    crAvg: number;
    crDelta: number | null;
    scoreAvg: number;
    scoreDelta: number | null;
    riskCount: number;
    riskDelta: number | null;
    contactsThisWeek: number;
    contactsDelta: number | null;
    overdueTasks: number;
    overdueDelta: number | null;
  };
  managers: ManagerCard[];
  /** The same managers, as plain Profile rows — for handing straight to
   * CreateTaskModal's assignee picker without an adapter. */
  managerProfiles: Profile[];
};

type WeeklyRow = {
  trader_id: string;
  week_start: string;
  score: number | null;
  cr: number | null;
  turnover: number | null;
  status: string | null;
};

function countDelta(current: number, prev: number): number {
  return current - prev;
}

/** Everything the "Моя команда" page needs for one team, explicitly
 * scoped to `teamId` at the query level rather than leaning on RLS —
 * for a lead that's redundant with RLS (harmless), but for an admin
 * picking an arbitrary team from the selector, RLS doesn't restrict
 * anything (admin sees every row), so this is the only thing that
 * actually narrows the data down to the chosen team. */
export async function getMyTeamData(teamId: string): Promise<MyTeamData | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const teamRes = await supabase.from("teams").select("id, name, lead_id").eq("id", teamId).maybeSingle();
  if (!teamRes.data) return null;

  const managersRes = await supabase
    .from("profiles")
    .select("id, full_name, telegram, role, is_active, team_id")
    .eq("team_id", teamId)
    .eq("role", "manager")
    .order("full_name");
  const managers = managersRes.data ?? [];
  const managerIds = managers.map((m) => m.id);
  const managerProfiles = managers as unknown as Profile[];

  const leadName = teamRes.data.lead_id
    ? ((await supabase.from("profiles").select("full_name").eq("id", teamRes.data.lead_id).maybeSingle()).data
        ?.full_name ?? null)
    : null;

  if (managerIds.length === 0) {
    return {
      team: { id: teamRes.data.id, name: teamRes.data.name, leadName },
      managerCount: 0,
      traderCount: 0,
      kpi: {
        turnoverTotal: 0,
        turnoverDelta: null,
        crAvg: 0,
        crDelta: null,
        scoreAvg: 0,
        scoreDelta: null,
        riskCount: 0,
        riskDelta: null,
        contactsThisWeek: 0,
        contactsDelta: null,
        overdueTasks: 0,
        overdueDelta: null,
      },
      managers: [],
      managerProfiles: [],
    };
  }

  const [tradersRes, tasksRes] = await Promise.all([
    supabase
      .from("traders")
      .select("*, manager:profiles!traders_manager_id_fkey(full_name)")
      .in("manager_id", managerIds)
      .order("code"),
    supabase.from("tasks").select("trader_id, assignee_id, status, due_date").in("assignee_id", managerIds),
  ]);

  const traders = (tradersRes.data ?? []) as unknown as TraderWithManager[];
  const traderIds = traders.map((t) => t.id);

  const [interactionsRes, weeklyRes] = await Promise.all([
    traderIds.length
      ? supabase.from("interactions").select("trader_id, author_id, created_at").in("trader_id", traderIds)
      : Promise.resolve({ data: [] as { trader_id: string; author_id: string | null; created_at: string }[] }),
    traderIds.length
      ? supabase
          .from("trader_weekly")
          .select("trader_id, week_start, score, cr, turnover, status")
          .in("trader_id", traderIds)
          .order("week_start", { ascending: true })
      : Promise.resolve({ data: [] as WeeklyRow[] }),
  ]);

  const weeklyByTrader = new Map<string, WeeklyRow[]>();
  const allWeekStarts = new Set<string>();
  for (const row of (weeklyRes.data ?? []) as WeeklyRow[]) {
    const list = weeklyByTrader.get(row.trader_id) ?? [];
    list.push(row);
    weeklyByTrader.set(row.trader_id, list);
    allWeekStarts.add(row.week_start);
  }
  const sortedWeeks = [...allWeekStarts].sort((a, b) => a.localeCompare(b));
  const currentWeekStart = sortedWeeks[sortedWeeks.length - 1] ?? null;
  const prevWeekStart = sortedWeeks[sortedWeeks.length - 2] ?? null;
  const last8Weeks = sortedWeeks.slice(-8);

  const lastContactByTrader = new Map<string, string>();
  const lastActiveByManager = new Map<string, string>();
  for (const row of interactionsRes.data ?? []) {
    const existing = lastContactByTrader.get(row.trader_id);
    if (!existing || row.created_at > existing) lastContactByTrader.set(row.trader_id, row.created_at);
    if (row.author_id) {
      const existingByAuthor = lastActiveByManager.get(row.author_id);
      if (!existingByAuthor || row.created_at > existingByAuthor) lastActiveByManager.set(row.author_id, row.created_at);
    }
  }

  const overdueByTrader = new Map<string, number>();
  const overdueByManagerNow = new Map<string, number>();
  const overdueByManagerWeekAgo = new Map<string, number>();
  const openByManager = new Map<string, number>();
  const weekAgoCutoff = addDays(today, -7);
  for (const t of tasksRes.data ?? []) {
    if (t.trader_id && isTaskOverdue(t.status, t.due_date, today)) {
      overdueByTrader.set(t.trader_id, (overdueByTrader.get(t.trader_id) ?? 0) + 1);
    }
    if (!t.assignee_id) continue;
    if (t.status === "in_progress") {
      openByManager.set(t.assignee_id, (openByManager.get(t.assignee_id) ?? 0) + 1);
    }
    if (isTaskOverdue(t.status, t.due_date, today)) {
      overdueByManagerNow.set(t.assignee_id, (overdueByManagerNow.get(t.assignee_id) ?? 0) + 1);
    }
    // Same overdue rule, evaluated as of a week ago: still counts a task
    // that's meanwhile been closed, since what we want here is "how many
    // of today's long-standing problems were already a problem a week
    // ago" — not a literal historical snapshot (tasks don't keep one),
    // but a real, honestly-derivable comparison from the data we do have.
    if (t.status !== "done" && t.due_date && t.due_date < weekAgoCutoff) {
      overdueByManagerWeekAgo.set(t.assignee_id, (overdueByManagerWeekAgo.get(t.assignee_id) ?? 0) + 1);
    }
  }

  // Interactions this week / last week, by author — same real-timestamp
  // window used everywhere else in the app (see lib/team-dashboard.ts).
  const contactsByManagerThisWeek = new Map<string, number>();
  const contactsByManagerPrevWeek = new Map<string, number>();
  if (currentWeekStart) {
    const { start, end } = getWeekRange(currentWeekStart);
    for (const row of interactionsRes.data ?? []) {
      if (!row.author_id) continue;
      if (row.created_at >= start && row.created_at < end) {
        contactsByManagerThisWeek.set(row.author_id, (contactsByManagerThisWeek.get(row.author_id) ?? 0) + 1);
      }
    }
  }
  if (prevWeekStart) {
    const { start, end } = getWeekRange(prevWeekStart);
    for (const row of interactionsRes.data ?? []) {
      if (!row.author_id) continue;
      if (row.created_at >= start && row.created_at < end) {
        contactsByManagerPrevWeek.set(row.author_id, (contactsByManagerPrevWeek.get(row.author_id) ?? 0) + 1);
      }
    }
  }

  // Enrich every trader once (risk score "now"), same shape/logic as
  // getEnrichedTraders() but scoped to this team's traders only.
  function enrichTrader(trader: TraderWithManager): EnrichedTrader {
    const lastContactAt = lastContactByTrader.get(trader.id) ?? null;
    const daysSinceContact = daysSince(lastContactAt);
    const weeks = (weeklyByTrader.get(trader.id) ?? []).slice().sort((a, b) => a.week_start.localeCompare(b.week_start));
    const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
    const crDelta =
      prevWeek && trader.cr !== null && prevWeek.cr !== null ? Math.round((trader.cr - prevWeek.cr) * 10) / 10 : null;
    const deltas = computeWeeklyDeltas(weeks);
    const risk = computeRiskScore({
      daysSinceContact,
      scoreDelta: deltas.scoreDelta,
      turnoverDeltaPct: deltas.turnoverDeltaPct,
      crDeltaPp: deltas.crDeltaPp,
      status: trader.status,
      overdueTaskCount: overdueByTrader.get(trader.id) ?? 0,
    });
    return { ...trader, lastContactAt, daysSinceContact, crDelta, risk };
  }

  // Risk "a week ago" — same computation, but fed each trader's weekly
  // deltas as of one week earlier in their own history (week[-2] vs
  // week[-3]), so the comparison is genuinely derived from real
  // snapshots rather than guessed at. A trader without enough history
  // yet just contributes "low" for that earlier point, same default the
  // real computation already falls back to.
  function riskLevelAWeekAgo(trader: TraderWithManager): RiskLevel {
    const weeks = (weeklyByTrader.get(trader.id) ?? []).slice().sort((a, b) => a.week_start.localeCompare(b.week_start));
    const weeksBeforeLast = weeks.slice(0, -1);
    const deltas = computeWeeklyDeltas(weeksBeforeLast);
    const priorWeek = weeksBeforeLast.length >= 1 ? weeksBeforeLast[weeksBeforeLast.length - 1] : null;
    const risk = computeRiskScore({
      daysSinceContact: null, // not reconstructable historically; omitted rather than guessed
      scoreDelta: deltas.scoreDelta,
      turnoverDeltaPct: deltas.turnoverDeltaPct,
      crDeltaPp: deltas.crDeltaPp,
      status: (priorWeek?.status as TraderWithManager["status"]) ?? trader.status,
      overdueTaskCount: 0,
    });
    return risk.level;
  }

  const enrichedTraders = traders.map(enrichTrader);
  const tradersByManager = new Map<string, EnrichedTrader[]>();
  for (const t of enrichedTraders) {
    if (!t.manager_id) continue;
    const list = tradersByManager.get(t.manager_id) ?? [];
    list.push(t);
    tradersByManager.set(t.manager_id, list);
  }

  const managerCards: ManagerCard[] = managers.map((m) => {
    const list = tradersByManager.get(m.id) ?? [];
    const turnoverTotal = list.reduce((sum, t) => sum + (t.turnover_week ?? 0), 0);
    const crValues = list.map((t) => t.cr).filter((v): v is number => v !== null);
    const scoreValues = list.map((t) => t.score).filter((v): v is number => v !== null);
    const riskCount = list.filter((t) => t.risk.level !== "low").length;

    let turnoverPrevWeek = 0;
    const sparkline = last8Weeks.map((week) => {
      let sum = 0;
      let any = false;
      for (const t of list) {
        const row = (weeklyByTrader.get(t.id) ?? []).find((w) => w.week_start === week);
        if (row?.turnover !== null && row?.turnover !== undefined) {
          sum += row.turnover;
          any = true;
        }
      }
      if (week === prevWeekStart) turnoverPrevWeek = sum;
      return any ? Math.round(sum) : null;
    });

    return {
      id: m.id,
      fullName: m.full_name ?? "Без імені",
      telegram: m.telegram,
      traderCount: list.length,
      turnoverTotal,
      turnoverDelta: prevWeekStart ? countDelta(turnoverTotal, turnoverPrevWeek) : null,
      crAvg: crValues.length ? Math.round((crValues.reduce((a, b) => a + b, 0) / crValues.length) * 10) / 10 : 0,
      scoreAvg: scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0,
      riskCount,
      contactsThisWeek: contactsByManagerThisWeek.get(m.id) ?? 0,
      tasksOpen: openByManager.get(m.id) ?? 0,
      tasksOverdue: overdueByManagerNow.get(m.id) ?? 0,
      reportStatus: "none", // filled in below once weekly_reports is fetched
      lastActiveAt: lastActiveByManager.get(m.id) ?? null,
      sparkline,
      traders: list,
    };
  });

  // Weekly report status per manager, current week only.
  if (currentWeekStart) {
    const reportsRes = await supabase
      .from("weekly_reports")
      .select("author_id, status")
      .in("author_id", managerIds)
      .eq("week_start", currentWeekStart);
    const statusByManager = new Map<string, WeeklyReportStatus>();
    for (const r of reportsRes.data ?? []) {
      statusByManager.set(r.author_id, r.status as WeeklyReportStatus);
    }
    for (const card of managerCards) {
      const status = statusByManager.get(card.id);
      // A "draft" that was never submitted reads the same as no report at
      // all from the lead's point of view — nothing has actually come in.
      card.reportStatus = !status || status === "draft" ? "none" : status;
    }
  }

  // Team-level KPIs
  const teamTurnoverTotal = enrichedTraders.reduce((sum, t) => sum + (t.turnover_week ?? 0), 0);
  const teamCrValues = enrichedTraders.map((t) => t.cr).filter((v): v is number => v !== null);
  const teamScoreValues = enrichedTraders.map((t) => t.score).filter((v): v is number => v !== null);
  const teamCrAvg = teamCrValues.length ? Math.round((teamCrValues.reduce((a, b) => a + b, 0) / teamCrValues.length) * 10) / 10 : 0;
  const teamScoreAvg = teamScoreValues.length
    ? Math.round(teamScoreValues.reduce((a, b) => a + b, 0) / teamScoreValues.length)
    : 0;
  const teamRiskCount = enrichedTraders.filter((t) => t.risk.level !== "low").length;
  const teamContactsThisWeek = [...contactsByManagerThisWeek.values()].reduce((a, b) => a + b, 0);
  const teamContactsPrevWeek = [...contactsByManagerPrevWeek.values()].reduce((a, b) => a + b, 0);
  const teamOverdueNow = [...overdueByManagerNow.values()].reduce((a, b) => a + b, 0);
  const teamOverdueWeekAgo = [...overdueByManagerWeekAgo.values()].reduce((a, b) => a + b, 0);

  let teamTurnoverPrevWeek = 0;
  let teamCrPrevAvg: number | null = null;
  let teamScorePrevAvg: number | null = null;
  let teamRiskCountWeekAgo = 0;
  if (prevWeekStart) {
    const prevCrValues: number[] = [];
    const prevScoreValues: number[] = [];
    for (const t of enrichedTraders) {
      const row = (weeklyByTrader.get(t.id) ?? []).find((w) => w.week_start === prevWeekStart);
      if (row?.turnover !== null && row?.turnover !== undefined) teamTurnoverPrevWeek += row.turnover;
      if (row?.cr !== null && row?.cr !== undefined) prevCrValues.push(row.cr);
      if (row?.score !== null && row?.score !== undefined) prevScoreValues.push(row.score);
      if (riskLevelAWeekAgo(t) !== "low") teamRiskCountWeekAgo += 1;
    }
    teamCrPrevAvg = prevCrValues.length ? Math.round((prevCrValues.reduce((a, b) => a + b, 0) / prevCrValues.length) * 10) / 10 : 0;
    teamScorePrevAvg = prevScoreValues.length
      ? Math.round(prevScoreValues.reduce((a, b) => a + b, 0) / prevScoreValues.length)
      : 0;
  }

  return {
    team: { id: teamRes.data.id, name: teamRes.data.name, leadName },
    managerCount: managers.length,
    traderCount: traders.length,
    kpi: {
      turnoverTotal: teamTurnoverTotal,
      turnoverDelta: prevWeekStart ? countDelta(teamTurnoverTotal, teamTurnoverPrevWeek) : null,
      crAvg: teamCrAvg,
      crDelta: teamCrPrevAvg !== null ? Math.round((teamCrAvg - teamCrPrevAvg) * 10) / 10 : null,
      scoreAvg: teamScoreAvg,
      scoreDelta: teamScorePrevAvg !== null ? teamScoreAvg - teamScorePrevAvg : null,
      riskCount: teamRiskCount,
      riskDelta: prevWeekStart ? countDelta(teamRiskCount, teamRiskCountWeekAgo) : null,
      contactsThisWeek: teamContactsThisWeek,
      contactsDelta: prevWeekStart ? countDelta(teamContactsThisWeek, teamContactsPrevWeek) : null,
      overdueTasks: teamOverdueNow,
      overdueDelta: countDelta(teamOverdueNow, teamOverdueWeekAgo),
    },
    managers: managerCards,
    managerProfiles,
  };
}
