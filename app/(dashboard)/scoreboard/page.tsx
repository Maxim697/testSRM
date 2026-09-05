import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ScoreboardPage() {
  return (
    <>
      <PageHeader title="Scoreboard" description="Рейтинг результативності трейдерів" />
      <EmptyState
        title="Scoreboard"
        description="Розділ у розробці. Дані з'являться на наступному етапі."
      />
    </>
  );
}
