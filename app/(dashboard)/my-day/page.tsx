import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RiskFactorList } from "@/components/risk/risk-factor-list";
import { MyTasksSection } from "@/components/my-day/my-tasks-section";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_WITH_RELATIONS_SELECT } from "@/lib/task-actions";
import type { TaskWithRelations } from "@/lib/types";

export default async function MyDayPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const [traders, tasksRes] = await Promise.all([
    getEnrichedTraders(),
    supabase
      .from("tasks")
      .select(TASK_WITH_RELATIONS_SELECT)
      .order("due_date", { ascending: true }),
  ]);

  const tasks = (tasksRes.data ?? []) as unknown as TaskWithRelations[];

  const attentionList = traders
    .filter((trader) => trader.risk.level !== "low")
    .sort((a, b) => b.risk.score - a.risk.score);

  const today = new Date().toISOString().slice(0, 10);
  const myTasksToday = tasks.filter(
    (t) => t.assignee_id === current.userId && t.status !== "done" && t.due_date && t.due_date <= today,
  );
  const myInProgressCount = tasks.filter(
    (t) => t.assignee_id === current.userId && t.status === "in_progress",
  ).length;
  const myOverdueCount = tasks.filter(
    (t) => t.assignee_id === current.userId && t.status !== "done" && t.due_date && t.due_date < today,
  ).length;

  return (
    <>
      <PageHeader title="Мій день" description="Завдання та пріоритети на сьогодні" />

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Трейдерів у портфелі" value={traders.length.toString()} />
        <KpiCard
          label="Потребують уваги"
          value={attentionList.length.toString()}
          status={attentionList.length > 0 ? "warning" : undefined}
        />
        <KpiCard label="Завдань у роботі" value={myInProgressCount.toString()} />
        <KpiCard
          label="Прострочено"
          value={myOverdueCount.toString()}
          status={myOverdueCount > 0 ? "negative" : undefined}
        />
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Потребують уваги сьогодні</h2>
        {attentionList.length === 0 ? (
          <EmptyState title="Все спокійно" description="Немає трейдерів, що потребують уваги." />
        ) : (
          <div className="flex flex-col gap-2">
            {attentionList.map((trader) => (
              <Card key={trader.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <RiskBadge risk={trader.risk} />
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary">{trader.code}</div>
                    <div className="mt-1">
                      <RiskFactorList factors={trader.risk.factors} />
                    </div>
                  </div>
                </div>
                <Button href={`/trader/${trader.id}`} variant="secondary" className="shrink-0">
                  Відкрити
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MyTasksSection tasks={myTasksToday} currentUserId={current.userId} />
    </>
  );
}
