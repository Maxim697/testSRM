import { EmptyState } from "@/components/ui/empty-state";
import { TraderDetailView } from "@/components/trader/trader-detail-view";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { TASK_WITH_RELATIONS_SELECT } from "@/lib/task-actions";
import { daysSince } from "@/lib/format";
import type {
  InteractionWithAuthor,
  TaskWithRelations,
  TraderWeekly,
  TraderWithManager,
} from "@/lib/types";

const RECENT_TRANSFER_DAYS = 14;

export default async function TraderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const current = await getCurrentProfile();

  const [traderRes, weeklyRes, interactionsRes, tasksRes] = await Promise.all([
    // traders has two FKs into profiles (manager_id, previous_manager_id) — the
    // embed needs an explicit constraint-name hint or it's ambiguous (PGRST201)
    supabase
      .from("traders")
      .select(
        "*, manager:profiles!traders_manager_id_fkey(full_name), previous_manager:profiles!traders_previous_manager_id_fkey(full_name)",
      )
      .eq("id", id)
      .maybeSingle(),
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

  const interactions = (interactionsRes.data ?? []) as unknown as InteractionWithAuthor[];

  let transferContext: { fromManagerName: string; transferredAt: string; historyCount: number } | null = null;
  if (trader.previous_manager_id && trader.manager_id) {
    const { data: transferRow } = await supabase
      .from("portfolio_transfers")
      .select("created_at")
      .eq("from_manager_id", trader.previous_manager_id)
      .eq("to_manager_id", trader.manager_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const transferredAt = transferRow?.created_at ?? null;
    const days = daysSince(transferredAt);
    if (transferredAt && days !== null && days <= RECENT_TRANSFER_DAYS) {
      transferContext = {
        fromManagerName: trader.previous_manager?.full_name ?? "—",
        transferredAt,
        historyCount: interactions.length,
      };
    }
  }

  return (
    <TraderDetailView
      trader={trader}
      weekly={(weeklyRes.data ?? []) as TraderWeekly[]}
      interactions={interactions}
      tasks={(tasksRes.data ?? []) as unknown as TaskWithRelations[]}
      currentUserId={current.userId}
      currentUserRole={current.profile.role}
      transferContext={transferContext}
    />
  );
}
