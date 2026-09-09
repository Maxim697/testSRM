import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UsersIcon } from "@/components/ui/empty-icons";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { getScopedManagers } from "@/lib/team-scope";

export default async function PortfolioPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const [traders, managers] = await Promise.all([
    getEnrichedTraders(),
    getScopedManagers(supabase, current.profile),
  ]);

  const canReassign = current.profile.role === "admin" || current.profile.role === "lead";

  return (
    <>
      <PageHeader title="Портфель" description="Клієнтський портфель менеджера" />
      {traders.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={canReassign ? "Немає трейдерів" : "Портфель порожній"}
          description={
            canReassign
              ? "У системі поки немає жодного трейдера з призначеним менеджером."
              : "У вашому портфелі поки немає трейдерів. Зверніться до керівника."
          }
          action={canReassign ? <Button href="/portfolio-transfer">Перейти до передачі портфеля</Button> : undefined}
        />
      ) : (
        <PortfolioTable
          traders={traders}
          allManagers={managers}
          canReassign={canReassign}
          currentUserId={current.userId}
        />
      )}
    </>
  );
}
