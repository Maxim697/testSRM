import { createClient } from "@/lib/supabase/server";
import type { TraderStatus } from "@/lib/types";

export type WeeklyAggregate = {
  weekStart: string;
  turnoverTotal: number;
  crAvg: number;
  scoreAvg: number;
  activeCount: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
};

export async function getWeeklyAggregates(): Promise<WeeklyAggregate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trader_weekly")
    .select("week_start, score, cr, turnover, status")
    .order("week_start", { ascending: true });

  const rows = data ?? [];
  const byWeek = new Map<
    string,
    { turnover: number; crSum: number; crCount: number; scoreSum: number; scoreCount: number; active: number; statuses: Record<TraderStatus, number> }
  >();

  for (const row of rows) {
    const bucket = byWeek.get(row.week_start) ?? {
      turnover: 0,
      crSum: 0,
      crCount: 0,
      scoreSum: 0,
      scoreCount: 0,
      active: 0,
      statuses: { green: 0, amber: 0, red: 0 },
    };
    bucket.active += 1;
    if (row.turnover !== null) bucket.turnover += row.turnover;
    if (row.cr !== null) {
      bucket.crSum += row.cr;
      bucket.crCount += 1;
    }
    if (row.score !== null) {
      bucket.scoreSum += row.score;
      bucket.scoreCount += 1;
    }
    if (row.status && row.status in bucket.statuses) {
      bucket.statuses[row.status as TraderStatus] += 1;
    }
    byWeek.set(row.week_start, bucket);
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, b]) => ({
      weekStart,
      turnoverTotal: Math.round(b.turnover),
      crAvg: b.crCount ? Math.round((b.crSum / b.crCount) * 10) / 10 : 0,
      scoreAvg: b.scoreCount ? Math.round((b.scoreSum / b.scoreCount) * 10) / 10 : 0,
      activeCount: b.active,
      greenCount: b.statuses.green,
      amberCount: b.statuses.amber,
      redCount: b.statuses.red,
    }));
}
