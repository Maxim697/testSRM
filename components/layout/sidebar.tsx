"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { UserCard } from "@/components/layout/user-card";
import type { Profile } from "@/lib/types";

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col border-r border-border bg-surface-1">
      <div className="flex h-12 shrink-0 items-center px-4">
        <span className="text-lg font-semibold text-text-primary">CRM</span>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 pb-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.key}>
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
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                        style={{ background: `var(--accent-${section.key})` }}
                      />
                    )}
                    <Link
                      href={item.href}
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
                      {item.label}
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
