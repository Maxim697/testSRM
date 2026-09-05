import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTIFICATION_KINDS = {
  REPORT_RETURNED: "report_returned",
  REPORT_APPROVED: "report_approved",
  TASK_ASSIGNED: "task_assigned",
  PORTFOLIO_TRANSFERRED: "portfolio_transferred",
  TRADER_HIGH_RISK: "trader_high_risk",
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

export type CreateNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
};

/** Best-effort insert — never throws, so a failed notification can't break the action that triggered it. */
export async function createNotification(supabase: SupabaseClient, input: CreateNotificationInput): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
}
