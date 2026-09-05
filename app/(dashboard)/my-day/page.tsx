import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEnrichedTraders } from "@/lib/trader-metrics";
import { getCurrentProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { TaskWithRelations } from "@/lib/types";

type Reason = { text: string; metric: string; weight: number };

export default async function MyDayPage() {
  const current = await getCurrentProfile();
  if (!current) return null;

  const supabase = await createClient();
  const [traders, tasksRes] = await Promise.all([
    getEnrichedTraders(),
    supabase
      .from("tasks")
      .select("*, trader:traders(code), assignee:profiles(full_name)")
      .order("due_date", { ascending: true }),
  ]);

  const tasks = (tasksRes.data ?? []) as unknown as TaskWithRelations[];

  const overdueTaskByTrader = new Map<string, TaskWithRelations>();
  for (const t of tasks) {
    if (t.trader_id && t.status !== "done") {
      const isOverdue = t.status === "overdue" || (t.due_date && t.due_date < new Date().toISOString().slice(0, 10));
      if (isOverdue) overdueTaskByTrader.set(t.trader_id, t);
    }
  }

  const attentionList = traders
    .map((trader) => {
      const reasons: Reason[] = [];

      if (trader.daysSinceContact !== null && trader.daysSinceContact >= 5) {
        reasons.push({
          text: "5+ днів без контакту",
          metric: `${trader.daysSinceContact} дн.`,
          weight: 2,
        });
      }
      if (trader.score_delta !== null && trader.score_delta <= -10) {
        reasons.push({
          text: "Score впав більше ніж на 10",
          metric: `${trader.score_delta}`,
          weight: 3,
        });
      }
      if (trader.status === "red") {
        reasons.push({ text: "Статус Red", metric: "Red", weight: 3 });
      } else if (trader.status === "amber") {
        reasons.push({ text: "Статус Amber", metric: "Amber", weight: 1 });
      }
      const overdueTask = overdueTaskByTrader.get(trader.id);
      if (overdueTask) {
        reasons.push({ text: "Прострочене завдання", metric: overdueTask.title, weight: 2 });
      }

      return { trader, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => {
      const scoreA = a.reasons.reduce((sum, r) => sum + r.weight, 0);
      const scoreB = b.reasons.reduce((sum, r) => sum + r.weight, 0);
      return scoreB - scoreA;
    });

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
            {attentionList.map(({ trader, reasons }) => (
              <Card key={trader.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{trader.code}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {reasons.map((r, i) => (
                      <Badge key={i} variant={r.weight >= 3 ? "red" : r.weight >= 2 ? "amber" : "neutral"}>
                        {r.text} · {r.metric}
                      </Badge>
                    ))}
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

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Мої завдання на сьогодні</h2>
        {myTasksToday.length === 0 ? (
          <EmptyState title="Завдань немає" description="На сьогодні для вас немає завдань з дедлайном." />
        ) : (
          <div className="flex flex-col gap-2">
            {myTasksToday.map((task) => (
              <Card key={task.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-text-primary">{task.title}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {task.trader?.code ?? "Загальне завдання"} · Дедлайн: {formatDate(task.due_date)}
                  </div>
                </div>
                {task.trader_id && (
                  <Button href={`/trader/${task.trader_id}`} variant="ghost" className="shrink-0">
                    Відкрити
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
