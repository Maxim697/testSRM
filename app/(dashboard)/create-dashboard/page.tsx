import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function CreateDashboardPage() {
  return (
    <>
      <PageHeader title="Створити дашборд" description="Конструктор власних дашбордів" />
      <EmptyState
        title="Створити дашборд"
        description="Розділ у розробці. Функціонал з'явиться на наступному етапі."
      />
    </>
  );
}
