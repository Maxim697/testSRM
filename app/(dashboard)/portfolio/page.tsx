import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { getEnrichedTraders } from "@/lib/trader-metrics";

export default async function PortfolioPage() {
  const traders = await getEnrichedTraders();

  return (
    <>
      <PageHeader title="Портфель" description="Клієнтський портфель менеджера" />
      {traders.length === 0 ? (
        <EmptyState
          title="Портфель порожній"
          description="У вашому портфелі поки немає трейдерів."
        />
      ) : (
        <PortfolioTable traders={traders} />
      )}
    </>
  );
}
