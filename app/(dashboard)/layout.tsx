import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getCurrentProfile } from "@/lib/current-user";
import { PageTitleProvider } from "@/lib/page-title";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentProfile();

  if (!current) redirect("/login");

  return (
    <PageTitleProvider>
      <div className="flex h-full">
        <Sidebar profile={current.profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header profile={current.profile} />
          <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </PageTitleProvider>
  );
}
