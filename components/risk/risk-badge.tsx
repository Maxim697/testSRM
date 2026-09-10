"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_LABELS, RISK_LEVEL_TEXT_CLASS, type RiskScore } from "@/lib/risk-score";

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
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
          "inline-flex items-center gap-1 font-bold tabular-nums leading-none",
          RISK_LEVEL_TEXT_CLASS[risk.level],
          SIZE_CLASSES[size],
          className,
        )}
      >
        {risk.score}
      </span>
      {showBreakdown && open && (
        // See info-tooltip.tsx for why the animated element is nested
        // inside the (unanimated) positioning/centering one.
        <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 w-64 -translate-x-1/2">
          <span className="popover-surface backdrop-blur-lg popover-enter block rounded-card p-2 text-xs font-normal text-text-secondary">
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
        </span>
      )}
    </span>
  );
}
