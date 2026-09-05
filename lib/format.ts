export type Delta = { value: string; direction: "up" | "down" | "flat" };

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("uk-UA").format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}%`;
}

export function scoreDelta(value: number | null | undefined): Delta {
  if (value === null || value === undefined || value === 0) {
    return { value: "0", direction: "flat" };
  }
  const direction = value > 0 ? "up" : "down";
  return { value: `${value > 0 ? "+" : ""}${value}`, direction };
}

export function percentDelta(value: number | null | undefined): Delta {
  if (value === null || value === undefined || value === 0) {
    return { value: "0%", direction: "flat" };
  }
  const direction = value > 0 ? "up" : "down";
  return { value: `${value > 0 ? "+" : ""}${value}%`, direction };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
