import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTIFICATION_KINDS, createNotification } from "@/lib/notifications";
import type { EnrichedTrader } from "@/lib/trader-metrics";

/**
 * Notifies a manager about traders in their own portfolio that are
 * currently at critical risk. Risk isn't persisted anywhere (it's computed
 * live), so there's no "just crossed into critical" event to hook — instead
 * this dedupes against any UNREAD trader_high_risk notification already
 * pointing at that trader (matched via its /trader/[id] link), so a manager
 * gets alerted once per trader until they read it.
 */
export async function notifyCriticalRiskTraders(
  supabase: SupabaseClient,
  managerId: string,
  traders: EnrichedTrader[],
): Promise<void> {
  const criticalTraders = traders.filter((t) => t.manager_id === managerId && t.risk.level === "critical");
  if (criticalTraders.length === 0) return;

  const { data: existing } = await supabase
    .from("notifications")
    .select("link")
    .eq("user_id", managerId)
    .eq("kind", NOTIFICATION_KINDS.TRADER_HIGH_RISK)
    .eq("is_read", false);

  const alreadyNotified = new Set((existing ?? []).map((n) => n.link as string));

  for (const trader of criticalTraders) {
    const link = `/trader/${trader.id}`;
    if (alreadyNotified.has(link)) continue;
    await createNotification(supabase, {
      userId: managerId,
      kind: NOTIFICATION_KINDS.TRADER_HIGH_RISK,
      title: "Трейдер у критичному ризику",
      body: `${trader.code}: бал ризику ${trader.risk.score}/100.`,
      link,
    });
  }
}
