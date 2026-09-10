"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { findNavItem } from "@/lib/nav";

/** Repoints --accent (and its hover/bg friends) to whichever nav section
 * the current page belongs to, via inline style on a wrapping element —
 * every descendant that reads var(--accent) (Tailwind's bg-accent/
 * text-accent/etc. all compile down to that) picks up the change for
 * free, no per-component logic needed. Falls back to the CRM hue (the
 * tokens.css default) for routes with no matching nav item, e.g. login. */
export function SectionAccentScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const key = match?.section.key;

  const style: CSSProperties | undefined = key
    ? ({
        "--accent": `var(--accent-${key})`,
        "--accent-hover": `var(--accent-${key}-hover)`,
        "--accent-bg": `var(--accent-${key}-bg)`,
      } as CSSProperties)
    : undefined;

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
