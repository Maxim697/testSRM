"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleNavSections } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { UserCard } from "@/components/layout/user-card";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import type { Profile } from "@/lib/types";

export function Sidebar({
  profile,
  unreadHrefs,
}: {
  profile: Profile;
  unreadHrefs?: Set<string>;
}) {
  const pathname = usePathname();
  const sections = getVisibleNavSections(profile.role);

  // Highlights the clicked item the instant it's clicked, not once the
  // destination page has actually finished loading. usePathname() only
  // reflects the *committed* route, and with real data-fetching pages
  // that commit can lag a click by a beat — this local, synchronous bit
  // of state closes that gap. It's cleared as soon as the pathname
  // genuinely catches up (or the user navigates some other way, e.g.
  // back/forward), so it never gets stuck pointing at a stale item.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => {
    // Clears the optimistic click state once the real route has actually
    // caught up to it — also the only thing that resets it after a
    // browser back/forward (which changes pathname without going through
    // the Link's onClick below).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived UI state in response to the pathname actually changing, not mirroring a prop
    setPendingHref(null);
  }, [pathname]);

  const activePath = pendingHref ?? pathname;

  return (
    <aside className="glass backdrop-blur-lg flex h-full w-sidebar shrink-0 flex-col overflow-y-auto border-r border-border">
      <div className="flex h-12 shrink-0 items-center px-4">
        <span className="text-lg font-semibold text-text-primary">CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {sections.map((section, i) => (
          <div key={section.key}>
            {i > 0 && <div className="my-2 h-px bg-border" aria-hidden="true" />}
            <div className="section-caption px-2" style={{ color: `var(--accent-${section.key})` }}>
              {section.title}
            </div>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);
                const Icon = NAV_ICONS[item.href];
                return (
                  <li key={item.href} className="relative">
                    {isActive && (
                      <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setPendingHref(item.href)}
                      // Prefetch is back on now that app/(dashboard)/loading.tsx
                      // exists: with a loading boundary in place, Next only
                      // prefetches the fast static shell for these ~14 fixed
                      // links, not a full server-rendered page per link (that
                      // full-page flood — from these plus every per-row
                      // trader link — was the real cause of the original
                      // "switching sections hangs" report; those per-row
                      // links stay prefetch={false}, this fixed, small set
                      // doesn't have that scaling problem).
                      className={cn(
                        "flex h-menu-item items-center gap-2 rounded-control px-2 text-base",
                        isActive
                          ? "bg-accent-bg font-medium"
                          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                      )}
                      // Inline style, not a text-{color} utility: this has to
                      // resolve var(--accent) live, at this element, to pick
                      // up whichever section SectionAccentScope has repointed
                      // it to. A custom property declared once at the theme
                      // root (:root/[data-theme]) and referenced from a
                      // Tailwind class would instead freeze at --accent's
                      // *default* value there, never actually tracking the
                      // section — see --nav-active-mix in tokens.css for why.
                      // --nav-active-mix itself is just a percentage (100%
                      // everywhere except Молочна's 65%), so it's in no
                      // danger of freezing at a stale color.
                      style={
                        isActive
                          ? { color: "color-mix(in srgb, var(--accent) var(--nav-active-mix), var(--text-primary))" }
                          : undefined
                      }
                    >
                      {Icon && (
                        <Icon className={cn("shrink-0", isActive ? "text-accent" : "text-text-muted")} aria-hidden="true" />
                      )}
                      <span className="truncate">{item.label}</span>
                      {unreadHrefs?.has(item.href) && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <UserCard profile={profile} />
    </aside>
  );
}
