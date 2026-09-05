"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { findNavItem } from "@/lib/nav";

/**
 * Retints the "info" token (links, primary buttons, focus rings, active tab
 * underlines — everything that already used --info) to the current nav
 * section's accent color. Works via plain CSS variable cascading: --color-info
 * is declared once as `var(--info)`, so overriding --info here is enough for
 * every existing text-info/bg-info/border-info usage to follow, with zero
 * changes at any of those call sites.
 */
export function SectionAccentScope({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const key = match?.section.key;

  const style: CSSProperties | undefined = key
    ? ({
        ["--info" as string]: `var(--accent-${key})`,
        ["--info-bg" as string]: `var(--accent-${key}-bg)`,
      } as CSSProperties)
    : undefined;

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
