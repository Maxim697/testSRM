import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";
import { getAuthUser, getProfileForUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { findNavItem } from "@/lib/nav";
import { PageTitleProvider } from "@/lib/page-title";
import type { NotificationEntry } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // This layout wraps every single page, so its data fetching sets a
  // floor on how fast *any* navigation can feel. It used to be 4 fully
  // sequential Supabase round trips (getUser → profile → is_active →
  // notifications) before the page below even started rendering — now
  // it's 2 stages: resolve the user id, then fetch the profile and
  // notifications in parallel (both only ever needed that id, not each
  // other). getProfileForUser is called with the exact same arguments
  // getCurrentProfile() uses internally, so React's cache() treats this
  // as the same call — any page below that also calls getCurrentProfile()
  // (most do) reuses this result instead of re-querying.
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [profile, { data: notificationsData }] = await Promise.all([
    getProfileForUser(user.id, user.email),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!profile.is_active) redirect("/login?deactivated=1");

  const current = { userId: user.id, profile };
  const notifications = (notificationsData ?? []) as NotificationEntry[];

  const unreadHrefs = new Set<string>();
  for (const n of notifications) {
    if (n.is_read || !n.link) continue;
    const match = findNavItem(n.link);
    if (match) unreadHrefs.add(match.item.href);
  }

  return (
    <PageTitleProvider>
      <div className="flex h-full">
        <Sidebar profile={current.profile} unreadHrefs={unreadHrefs} />
        {/* This column is the scroll container (not <main>), so the sticky
            header can stay pinned while content scrolls up behind it. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header profile={current.profile} notifications={notifications} />
          <main className="min-h-0 flex-1 p-4">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </PageTitleProvider>
  );
}
