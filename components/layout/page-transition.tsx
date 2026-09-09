"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Fades the content area in (opacity + a 4px rise, 180ms, transform/
 * opacity only — never triggers layout) each time the route actually
 * changes. `key={pathname}` forces a fresh mount of this wrapper on
 * navigation, which is what makes the CSS animation replay — without it,
 * React would just update the existing node in place and the animation
 * would never re-trigger. Sidebar and header live outside this (in the
 * layout), so they never re-animate, only the page content does. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter flex min-h-0 flex-1 flex-col gap-3">
      {children}
    </div>
  );
}
