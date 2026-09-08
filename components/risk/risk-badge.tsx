"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_LABELS, type RiskScore } from "@/lib/risk-score";

const LEVEL_CLASSES: Record<RiskScore["level"], string> = {
  low: "term-pulse text-positive [--pulse-color:var(--positive)] [--pulse-duration:3.4s]",
  medium: "term-pulse text-warning [--pulse-color:var(--warning)] [--pulse-duration:2.4s]",
  high: "term-pulse text-negative [--pulse-color:var(--negative)] [--pulse-duration:1.6s]",
  critical: "term-pulse text-negative font-bold [--pulse-color:var(--negative)] [--pulse-duration:0.9s]",
};

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-xl",
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
          "inline-flex items-center gap-1 font-semibold tabular-nums leading-none",
          LEVEL_CLASSES[risk.level],
          SIZE_CLASSES[size],
          className,
        )}
      >
        [{risk.score}]
      </span>
      {showBreakdown && open && (
        <span className="glass term-corners backdrop-blur-lg pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-64 -translate-x-1/2 p-2 text-xs font-normal normal-case text-text-secondary">
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
