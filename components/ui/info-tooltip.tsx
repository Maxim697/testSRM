"use client";

import { useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] leading-none text-text-muted"
        aria-label={text}
      >
        i
      </span>
      {open && (
        // Positioning (centering via -translate-x-1/2) lives on this outer,
        // unanimated span; the entrance scale animation goes on the inner
        // one instead — both would fight over the `transform` property
        // (the animation's keyframes fully own it while playing) if they
        // were on the same element, popping the tooltip off-center for the
        // 140ms the animation runs.
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2">
          <span className="popover-surface backdrop-blur-lg popover-enter block rounded-control p-2 text-xs font-normal normal-case text-text-secondary">
            {text}
          </span>
        </span>
      )}
    </span>
  );
}
