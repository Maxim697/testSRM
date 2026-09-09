import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldIcon } from "@/components/ui/empty-icons";
import { TransferForm } from "@/components/portfolio-transfer/transfer-form";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getScopedManagers } from "@/lib/team-scope";
import type { PortfolioTransferWithNames } from "@/lib/types";

export default async function PortfolioTransferPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  if (current.profile.role === "manager") {
    return (
      <>
        <PageHeader title="Передача портфеля" description="Перерозподіл трейдерів між менеджерами" />
        <EmptyState
          icon={<ShieldIcon />}
          title="Немає доступу"
          description="Цей розділ доступний тільки тім-лідам та адміністраторам."
        />
      </>
    );
  }

  const supabase = await createClient();
  const [traders, managers, historyRes] = await Promise.all([
    getEnrichedTraders(),
    getScopedManagers(supabase, current.profile),
    supabase
      .from("portfolio_transfers")
      .select(
        "*, from_manager:profiles!portfolio_transfers_from_manager_id_fkey(full_name), to_manager:profiles!portfolio_transfers_to_manager_id_fkey(full_name), initiator:profiles!portfolio_transfers_initiated_by_fkey(full_name)",
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Передача портфеля" description="Перерозподіл трейдерів між менеджерами" />
      <TransferForm
        traders={traders}
        managers={managers}
        history={(historyRes.data ?? []) as unknown as PortfolioTransferWithNames[]}
        currentUserId={current.userId}
      />
    </>
  );
}
