import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function TraderDetailedPage() {
  return (
    <>
      <PageHeader title="Trader Detailed" description="Детальна аналітика по трейдерах" />
      <EmptyState
        title="Trader Detailed"
        description="Розділ у розробці. Дані з'являться на наступному етапі."
      />
    </>
  );
}
