"use client";

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

  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col overflow-y-auto bg-surface-1">
      <div className="flex h-12 shrink-0 items-center px-4">
        <span className="text-lg font-semibold text-text-primary">CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {sections.map((section, i) => (
          <div key={section.key}>
            {i > 0 && <div className="my-2 h-px bg-border" aria-hidden="true" />}
            <div className="section-caption px-2">{section.title}</div>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = NAV_ICONS[item.href];
                return (
                  <li key={item.href}>
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
                      className={cn(
                        "flex h-[30px] items-center gap-2 rounded-control px-2 text-base outline-none",
                        isActive
                          ? "bg-surface-3 font-medium text-text-primary"
                          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                      )}
                    >
                      {Icon && <Icon className="shrink-0 text-text-muted" aria-hidden="true" />}
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
