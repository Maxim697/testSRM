"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Terminal-style loading indicator: a label with dots that grow one at a
 * time, and the same blinking block caret used everywhere else — instead of
 * a spinner. */
export function LoadingLine({
  label = "завантаження",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={cn("inline-flex items-center text-text-secondary", className)} role="status">
      <span className="relative inline-block">
        {label}
        {".".repeat(dots)}
        <span className="term-caret term-caret-abs" aria-hidden="true" />
      </span>
    </span>
  );
}
