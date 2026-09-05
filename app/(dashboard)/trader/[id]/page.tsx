import { EmptyState } from "@/components/ui/empty-state";
import { TraderDetailView } from "@/components/trader/trader-detail-view";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { TASK_WITH_RELATIONS_SELECT } from "@/lib/task-actions";
import type {
  InteractionWithAuthor,
  TaskWithRelations,
  TraderWeekly,
  TraderWithManager,
} from "@/lib/types";

export default async function TraderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const current = await getCurrentProfile();

  const [traderRes, weeklyRes, interactionsRes, tasksRes] = await Promise.all([
    supabase.from("traders").select("*, manager:profiles(full_name)").eq("id", id).maybeSingle(),
    supabase
      .from("trader_weekly")
      .select("*")
      .eq("trader_id", id)
      .order("week_start", { ascending: true }),
    supabase
      .from("interactions")
      .select("*, author:profiles(full_name)")
      .eq("trader_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select(TASK_WITH_RELATIONS_SELECT)
      .eq("trader_id", id)
      .order("due_date", { ascending: true }),
  ]);

  const trader = traderRes.data as unknown as TraderWithManager | null;

  if (!trader || !current) {
    return (
      <EmptyState
        title="Трейдера не знайдено"
        description="Можливо, він не існує або у вас немає доступу до нього."
      />
    );
  }

  return (
    <TraderDetailView
      trader={trader}
      weekly={(weeklyRes.data ?? []) as TraderWeekly[]}
      interactions={(interactionsRes.data ?? []) as unknown as InteractionWithAuthor[]}
      tasks={(tasksRes.data ?? []) as unknown as TaskWithRelations[]}
      currentUserId={current.userId}
    />
  );
}
