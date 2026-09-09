"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleNavSections } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { UserCard } from "@/components/layout/user-card";
import { useEffectsIntensity } from "@/components/effects-provider";
import type { Profile } from "@/lib/types";

export function Sidebar({
  profile,
  unreadHrefs,
}: {
  profile: Profile;
  unreadHrefs?: Set<string>;
}) {
  const pathname = usePathname();
  const { intensity } = useEffectsIntensity();
  const sections = getVisibleNavSections(profile.role);

  return (
    <aside className="glass term-corners backdrop-blur-lg flex h-full w-sidebar shrink-0 flex-col overflow-y-auto border-r border-border">
      <div className="flex h-12 shrink-0 items-center px-4">
        <span className="text-lg font-semibold text-text-primary">CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {sections.map((section, i) => (
          <div key={section.key}>
            {i > 0 && <div className="term-divider my-2" aria-hidden="true" />}
            <div
              className="px-2 text-xs font-medium uppercase tracking-wide"
              style={{ color: `var(--accent-${section.key})` }}
            >
              {section.title}
            </div>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href} className="relative">
                    {isActive && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-0.5 "
                        style={{ background: `var(--accent-${section.key})` }}
                      />
                    )}
                    <Link
                      href={item.href}
                      // prefetch={false}: every one of these ~14 links sits
                      // in the viewport on every single page load (the
                      // sidebar never scrolls out of view), and none of
                      // these routes has a loading.tsx boundary — so
                      // Next.js's default prefetch was firing a *full*
                      // server-rendered RSC request (real Supabase queries
                      // and all) for every nav item, on every page, all the
                      // time. That flood was competing with the actual
                      // click the user just made, which is what made
                      // switching sections feel like it hung for a second.
                      // A real click still fetches immediately — it's just
                      // the sole request now instead of one of 30+.
                      prefetch={false}
                      style={{
                        ["--item-accent" as string]: `var(--accent-${section.key})`,
                        ...(isActive
                          ? {
                              backgroundColor: `var(--accent-${section.key}-bg)`,
                              color: `var(--accent-${section.key})`,
                            }
                          : undefined),
                      }}
                      className={cn(
                        "nav-link flex h-7 items-center rounded-control pl-3 pr-2 text-base outline-none transition-colors",
                        isActive
                          ? "font-medium"
                          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {unreadHrefs?.has(item.href) && (
                        <span
                          className="ml-auto h-1.5 w-1.5 shrink-0 "
                          style={{ background: `var(--accent-${section.key})` }}
                        />
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
      {intensity !== "off" && (
        <div
          aria-hidden="true"
          className="shrink-0 border-t border-border px-2 py-1 font-mono text-[10px] tracking-wide text-[#33ff66] opacity-35"
        >
          SESSION: ACTIVE · UID: {profile.id.slice(0, 4).toLowerCase()}
        </div>
      )}
    </aside>
  );
}
