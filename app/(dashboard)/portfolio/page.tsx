import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function PortfolioPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const [traders, managersRes] = await Promise.all([
    getEnrichedTraders(),
    supabase.from("profiles").select("id, full_name, telegram, role").eq("role", "manager"),
  ]);

  const canReassign = current.profile.role === "admin" || current.profile.role === "lead";

  return (
    <>
      <PageHeader title="Портфель" description="Клієнтський портфель менеджера" />
      {traders.length === 0 ? (
        <EmptyState
          title="Портфель порожній"
          description="У вашому портфелі поки немає трейдерів."
        />
      ) : (
        <PortfolioTable
          traders={traders}
          allManagers={(managersRes.data ?? []) as Profile[]}
          canReassign={canReassign}
        />
      )}
    </>
  );
}
