"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_LABELS, type RiskScore } from "@/lib/risk-score";

const LEVEL_CLASSES: Record<RiskScore["level"], string> = {
  low: "bg-positive-bg text-positive",
  medium: "bg-warning-bg text-warning",
  high: "bg-negative-bg text-negative",
  critical: "bg-negative text-white",
};

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-1 text-sm",
  lg: "px-3 py-1.5 text-xl",
};

export function RiskBadge({
  risk,
  size = "md",
  showBreakdown = true,
  className,
}: {
  risk: RiskScore;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-control font-semibold tabular-nums leading-none",
          LEVEL_CLASSES[risk.level],
          SIZE_CLASSES[size],
          className,
        )}
      >
        {risk.score}
      </span>
      {showBreakdown && open && (
        <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-64 -translate-x-1/2 rounded-control border border-border bg-surface-3 p-2 text-xs font-normal normal-case text-text-secondary shadow-lg">
          <div className="mb-1 font-medium text-text-primary">
            {RISK_LEVEL_LABELS[risk.level]} ризик · {risk.score}/100
          </div>
          {risk.factors.length === 0 ? (
            <div>Факторів ризику не виявлено.</div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {risk.factors.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-2">
                  <span>
                    {f.label} ({f.detail})
                  </span>
                  <span className="font-medium text-text-primary">+{f.points}</span>
                </li>
              ))}
            </ul>
          )}
        </span>
      )}
    </span>
  );
}
