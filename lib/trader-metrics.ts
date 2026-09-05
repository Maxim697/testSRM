import { createClient } from "@/lib/supabase/server";
import { daysSince } from "@/lib/format";
import { computeRiskScore, computeWeeklyDeltas, isTaskOverdue, type RiskScore } from "@/lib/risk-score";
import type { TraderWithManager } from "@/lib/types";

export type EnrichedTrader = TraderWithManager & {
  lastContactAt: string | null;
  daysSinceContact: number | null;
  crDelta: number | null;
  risk: RiskScore;
};

export async function getEnrichedTraders(): Promise<EnrichedTrader[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [tradersRes, interactionsRes, weeklyRes, tasksRes] = await Promise.all([
    supabase.from("traders").select("*, manager:profiles(full_name)").order("code"),
    supabase.from("interactions").select("trader_id, created_at"),
    supabase.from("trader_weekly").select("trader_id, week_start, score, cr, turnover"),
    supabase.from("tasks").select("trader_id, status, due_date"),
  ]);

  const traders = (tradersRes.data ?? []) as unknown as TraderWithManager[];

  const lastContactMap = new Map<string, string>();
  for (const row of interactionsRes.data ?? []) {
    const existing = lastContactMap.get(row.trader_id);
    if (!existing || row.created_at > existing) lastContactMap.set(row.trader_id, row.created_at);
  }

  const weeklyByTrader = new Map<string, { week_start: string; score: number | null; cr: number | null; turnover: number | null }[]>();
  for (const row of weeklyRes.data ?? []) {
    const list = weeklyByTrader.get(row.trader_id) ?? [];
    list.push(row);
    weeklyByTrader.set(row.trader_id, list);
  }

  const overdueCountByTrader = new Map<string, number>();
  for (const row of tasksRes.data ?? []) {
    if (!row.trader_id) continue;
    if (isTaskOverdue(row.status, row.due_date, today)) {
      overdueCountByTrader.set(row.trader_id, (overdueCountByTrader.get(row.trader_id) ?? 0) + 1);
    }
  }

  return traders.map((trader) => {
    const lastContactAt = lastContactMap.get(trader.id) ?? null;
    const daysSinceContact = daysSince(lastContactAt);
    const weeks = (weeklyByTrader.get(trader.id) ?? []).slice().sort((a, b) =>
      a.week_start.localeCompare(b.week_start),
    );
    const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
    const crDelta =
      prevWeek && trader.cr !== null && prevWeek.cr !== null
        ? Math.round((trader.cr - prevWeek.cr) * 10) / 10
        : null;

    const weeklyDeltas = computeWeeklyDeltas(weeks);
    const risk = computeRiskScore({
      daysSinceContact,
      scoreDelta: weeklyDeltas.scoreDelta,
      turnoverDeltaPct: weeklyDeltas.turnoverDeltaPct,
      crDeltaPp: weeklyDeltas.crDeltaPp,
      status: trader.status,
      overdueTaskCount: overdueCountByTrader.get(trader.id) ?? 0,
    });

    return {
      ...trader,
      lastContactAt,
      daysSinceContact,
      crDelta,
      risk,
    };
  });
}
