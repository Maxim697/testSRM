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
        <span className="glass backdrop-blur-lg pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-control p-2 text-xs font-normal normal-case text-text-secondary">
          {text}
        </span>
      )}
    </span>
  );
}
