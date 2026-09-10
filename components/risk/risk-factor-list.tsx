import { cn } from "@/lib/utils";
import type { RiskFactor } from "@/lib/risk-score";

export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  if (factors.length === 0) {
    return <span className="text-xs text-text-muted">Факторів ризику немає</span>;
  }

  return (
    <ul className="flex flex-wrap items-center gap-y-1 text-xs">
      {factors.map((f, i) => (
        <li key={f.key} className="inline-flex items-center whitespace-nowrap">
          <span className="text-text-muted">
            {f.label} ({f.detail})
          </span>
          <span className={cn("ml-1 font-medium", f.points >= 15 ? "text-negative" : "text-warning")}>
            +{f.points}
          </span>
          {i < factors.length - 1 && (
            <span aria-hidden="true" className="mx-2 h-3.5 w-px shrink-0 bg-border-strong" />
          )}
        </li>
      ))}
    </ul>
  );
}
