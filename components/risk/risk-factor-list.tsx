import type { RiskFactor } from "@/lib/risk-score";

export function RiskFactorList({ factors }: { factors: RiskFactor[] }) {
  if (factors.length === 0) {
    return <span className="text-xs text-text-muted">Факторів ризику немає</span>;
  }

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
      {factors.map((f) => (
        <li key={f.key} className="whitespace-nowrap">
          {f.label} ({f.detail}) <span className="font-medium text-text-primary">+{f.points}</span>
        </li>
      ))}
    </ul>
  );
}
