import { cn } from "@/lib/utils";
import type { RiskFactor } from "@/lib/risk-score";

export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  if (factors.length === 0) {
    return <span className="text-xs text-text-muted">Факторів ризику немає</span>;
  }

  return (
    <ul className="flex flex-wrap items-center gap-y-0.5 text-xs">
      {factors.map((f, i) => (
        <li
          key={f.key}
          className={cn(
            "whitespace-nowrap px-3 first:pl-0",
            i > 0 && "border-l border-border",
          )}
        >
          <span className="text-text-muted">
            {f.label} ({f.detail})
          </span>{" "}
          <span className={cn("font-medium", f.points >= 15 ? "text-negative" : "text-warning")}>+{f.points}</span>
        </li>
      ))}
    </ul>
  );
}
