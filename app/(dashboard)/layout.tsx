import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SectionAccentScope } from "@/components/layout/section-accent-scope";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { findNavItem } from "@/lib/nav";
import { PageTitleProvider } from "@/lib/page-title";
import type { NotificationEntry } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentProfile();

  if (!current) redirect("/login");
  if (!current.profile.is_active) redirect("/login?deactivated=1");

  const supabase = await createClient();
  const { data: notificationsData } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", current.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (notificationsData ?? []) as NotificationEntry[];

  const unreadHrefs = new Set<string>();
  for (const n of notifications) {
    if (n.is_read || !n.link) continue;
    const match = findNavItem(n.link);
    if (match) unreadHrefs.add(match.item.href);
  }

  return (
    <PageTitleProvider>
      <SectionAccentScope>
        <div className="flex h-full">
          <Sidebar profile={current.profile} unreadHrefs={unreadHrefs} />
          {/* This column is the scroll container (not <main>), so the sticky
              glass header can stay pinned while content scrolls up behind it,
              visible through the blur. */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <Header profile={current.profile} notifications={notifications} />
            <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">{children}</main>
          </div>
        </div>
      </SectionAccentScope>
    </PageTitleProvider>
  );
}
