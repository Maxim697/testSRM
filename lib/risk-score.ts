import type { TraderStatus } from "@/lib/types";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
  critical: "Критичний",
};

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export type RiskFactor = {
  key: string;
  label: string;
  points: number;
  detail: string;
};

export type RiskScore = {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
};

export type RiskScoreInput = {
  daysSinceContact: number | null;
  /** this week's score minus last week's, from trader_weekly */
  scoreDelta: number | null;
  /** % change in turnover week over week, from trader_weekly */
  turnoverDeltaPct: number | null;
  /** percentage-point change in CR week over week, from trader_weekly */
  crDeltaPp: number | null;
  status: TraderStatus | null;
  overdueTaskCount: number;
};

export function computeRiskScore(input: RiskScoreInput): RiskScore {
  const factors: RiskFactor[] = [];

  const days = input.daysSinceContact;
  if (days !== null) {
    if (days >= 15) factors.push({ key: "contact", label: "Днів без контакту", points: 40, detail: `${days} дн.` });
    else if (days >= 8) factors.push({ key: "contact", label: "Днів без контакту", points: 30, detail: `${days} дн.` });
    else if (days >= 5) factors.push({ key: "contact", label: "Днів без контакту", points: 20, detail: `${days} дн.` });
    else if (days >= 3) factors.push({ key: "contact", label: "Днів без контакту", points: 10, detail: `${days} дн.` });
  }

  const scoreDrop = input.scoreDelta;
  if (scoreDrop !== null) {
    if (scoreDrop <= -20) factors.push({ key: "score_drop", label: "Падіння score", points: 30, detail: `${scoreDrop}` });
    else if (scoreDrop <= -10) factors.push({ key: "score_drop", label: "Падіння score", points: 20, detail: `${scoreDrop}` });
    else if (scoreDrop <= -5) factors.push({ key: "score_drop", label: "Падіння score", points: 10, detail: `${scoreDrop}` });
  }

  const turnoverDrop = input.turnoverDeltaPct;
  if (turnoverDrop !== null) {
    if (turnoverDrop <= -80) factors.push({ key: "turnover_drop", label: "Падіння обороту", points: 30, detail: `${turnoverDrop}%` });
    else if (turnoverDrop <= -50) factors.push({ key: "turnover_drop", label: "Падіння обороту", points: 20, detail: `${turnoverDrop}%` });
    else if (turnoverDrop <= -20) factors.push({ key: "turnover_drop", label: "Падіння обороту", points: 10, detail: `${turnoverDrop}%` });
  }

  const crDrop = input.crDeltaPp;
  if (crDrop !== null) {
    if (crDrop <= -10) factors.push({ key: "cr_drop", label: "Падіння CR", points: 15, detail: `${crDrop}пп` });
    else if (crDrop <= -5) factors.push({ key: "cr_drop", label: "Падіння CR", points: 5, detail: `${crDrop}пп` });
  }

  if (input.status === "red") factors.push({ key: "status", label: "Поточний статус", points: 25, detail: "Red" });
  else if (input.status === "amber") factors.push({ key: "status", label: "Поточний статус", points: 10, detail: "Amber" });

  if (input.overdueTaskCount >= 2) {
    factors.push({ key: "overdue_tasks", label: "Прострочені завдання", points: 10, detail: `${input.overdueTaskCount}` });
  } else if (input.overdueTaskCount === 1) {
    factors.push({ key: "overdue_tasks", label: "Прострочені завдання", points: 5, detail: "1" });
  }

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));

  return { score, level: riskLevel(score), factors };
}

export type WeeklySnapshot = {
  week_start: string;
  score: number | null;
  cr: number | null;
  turnover: number | null;
};

/** Expects weeks sorted ascending by week_start; compares the last two entries. */
export function computeWeeklyDeltas(weeksSortedAsc: WeeklySnapshot[]): {
  scoreDelta: number | null;
  turnoverDeltaPct: number | null;
  crDeltaPp: number | null;
} {
  const current = weeksSortedAsc.length >= 1 ? weeksSortedAsc[weeksSortedAsc.length - 1]! : null;
  const prev = weeksSortedAsc.length >= 2 ? weeksSortedAsc[weeksSortedAsc.length - 2]! : null;

  const scoreDelta =
    current && prev && current.score !== null && prev.score !== null ? current.score - prev.score : null;
  const crDeltaPp =
    current && prev && current.cr !== null && prev.cr !== null
      ? Math.round((current.cr - prev.cr) * 10) / 10
      : null;
  const turnoverDeltaPct =
    current && prev && current.turnover !== null && prev.turnover !== null && prev.turnover !== 0
      ? Math.round(((current.turnover - prev.turnover) / prev.turnover) * 1000) / 10
      : null;

  return { scoreDelta, turnoverDeltaPct, crDeltaPp };
}

export function isTaskOverdue(status: string, dueDate: string | null, today: string): boolean {
  return status === "overdue" || (status !== "done" && !!dueDate && dueDate < today);
}
