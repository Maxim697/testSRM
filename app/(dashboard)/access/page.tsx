import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AccessPage() {
  return (
    <>
      <PageHeader title="Доступи" description="Керування ролями та правами доступу" />
      <EmptyState
        title="Доступи"
        description="Розділ у розробці. Функціонал з'явиться на наступному етапі."
      />
    </>
  );
}
