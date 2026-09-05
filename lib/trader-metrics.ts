import { createClient } from "@/lib/supabase/server";
import { daysSince } from "@/lib/format";
import type { TraderWithManager } from "@/lib/types";

export type EnrichedTrader = TraderWithManager & {
  lastContactAt: string | null;
  daysSinceContact: number | null;
  crDelta: number | null;
};

export async function getEnrichedTraders(): Promise<EnrichedTrader[]> {
  const supabase = await createClient();

  const [tradersRes, interactionsRes, weeklyRes] = await Promise.all([
    supabase.from("traders").select("*, manager:profiles(full_name)").order("code"),
    supabase.from("interactions").select("trader_id, created_at"),
    supabase.from("trader_weekly").select("trader_id, week_start, cr"),
  ]);

  const traders = (tradersRes.data ?? []) as unknown as TraderWithManager[];

  const lastContactMap = new Map<string, string>();
  for (const row of interactionsRes.data ?? []) {
    const existing = lastContactMap.get(row.trader_id);
    if (!existing || row.created_at > existing) lastContactMap.set(row.trader_id, row.created_at);
  }

  const weeklyByTrader = new Map<string, { week_start: string; cr: number | null }[]>();
  for (const row of weeklyRes.data ?? []) {
    const list = weeklyByTrader.get(row.trader_id) ?? [];
    list.push(row);
    weeklyByTrader.set(row.trader_id, list);
  }

  return traders.map((trader) => {
    const lastContactAt = lastContactMap.get(trader.id) ?? null;
    const weeks = (weeklyByTrader.get(trader.id) ?? []).slice().sort((a, b) =>
      a.week_start.localeCompare(b.week_start),
    );
    const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
    const crDelta =
      prevWeek && trader.cr !== null && prevWeek.cr !== null
        ? Math.round((trader.cr - prevWeek.cr) * 10) / 10
        : null;

    return {
      ...trader,
      lastContactAt,
      daysSinceContact: daysSince(lastContactAt),
      crDelta,
    };
  });
}
