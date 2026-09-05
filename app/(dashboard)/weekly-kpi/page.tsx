import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function WeeklyKpiPage() {
  return (
    <>
      <PageHeader title="Weekly KPI" description="Ключові показники за тиждень" />
      <EmptyState
        title="Weekly KPI"
        description="Розділ у розробці. Дані з'являться на наступному етапі."
      />
    </>
  );
}
