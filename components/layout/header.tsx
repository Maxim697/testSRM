"use client";

import { usePathname } from "next/navigation";
import { findNavItem } from "@/lib/nav";
import { roleLabel } from "@/lib/roles";
import { usePageTitle } from "@/lib/page-title";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Profile } from "@/lib/types";

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const overrideTitle = usePageTitle();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
      <div className="flex items-center gap-2.5">
        {match && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: `var(--accent-${match.section.key})` }}
          />
        )}
        <h2 className="whitespace-nowrap text-lg font-medium text-text-primary">
          {overrideTitle ?? match?.item.label ?? "CRM"}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="neutral" className="whitespace-nowrap">
          {roleLabel(profile.role)}
        </Badge>
        <ThemeToggle />
      </div>
    </header>
  );
}
