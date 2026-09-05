import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function WeeklyReportPage() {
  return (
    <>
      <PageHeader title="Тижневий звіт" description="Підсумки роботи за тиждень" />
      <EmptyState
        title="Тижневий звіт"
        description="Розділ у розробці. Дані з'являться на наступному етапі."
      />
    </>
  );
}
