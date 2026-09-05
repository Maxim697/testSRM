import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SectionAccentScope } from "@/components/layout/section-accent-scope";
import { getCurrentProfile } from "@/lib/current-user";
import { PageTitleProvider } from "@/lib/page-title";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentProfile();

  if (!current) redirect("/login");

  return (
    <PageTitleProvider>
      <SectionAccentScope>
        <div className="flex h-full">
          <Sidebar profile={current.profile} />
          {/* This column is the scroll container (not <main>), so the sticky
              glass header can stay pinned while content scrolls up behind it,
              visible through the blur. */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <Header profile={current.profile} />
            <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">{children}</main>
          </div>
        </div>
      </SectionAccentScope>
    </PageTitleProvider>
  );
}
