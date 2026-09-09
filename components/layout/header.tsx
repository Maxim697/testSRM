"use client";

import { usePathname } from "next/navigation";
import { findNavItem } from "@/lib/nav";
import { roleLabel } from "@/lib/roles";
import { usePageTitle } from "@/lib/page-title";
import { Badge } from "@/components/ui/badge";
import { Typewriter } from "@/components/ui/typewriter";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { NotificationEntry, Profile } from "@/lib/types";

export function Header({ profile, notifications }: { profile: Profile; notifications: NotificationEntry[] }) {
  const pathname = usePathname();
  const match = findNavItem(pathname);
  const overrideTitle = usePageTitle();

  return (
    <header className="glass backdrop-blur-lg sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2.5">
        {match && (
          <span
            className="h-2 w-2 "
            style={{ background: `var(--accent-${match.section.key})` }}
          />
        )}
        <Typewriter
          key={pathname}
          as="h2"
          text={overrideTitle ?? match?.item.label ?? "CRM"}
          className="term-heading whitespace-nowrap text-lg font-medium text-text-primary"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="neutral" className="whitespace-nowrap">
          {roleLabel(profile.role)}
        </Badge>
        <NotificationBell notifications={notifications} />
        <ThemeToggle />
      </div>
    </header>
  );
}
