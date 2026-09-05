import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntityType = "trader" | "profile" | "task" | "report" | "dashboard";

export const AUDIT_ACTIONS = {
  ROLE_CHANGE: "role_change",
  MANAGER_CHANGE: "manager_change",
  STATUS_CHANGE: "status_change",
  TASK_ASSIGNED: "task_assigned",
  TASK_CLOSED: "task_closed",
  REPORT_SUBMITTED: "report_submitted",
  REPORT_REVIEWED: "report_reviewed",
  DRAFT_GENERATED: "draft_generated",
  LOGIN: "login",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.ROLE_CHANGE]: "Зміна ролі",
  [AUDIT_ACTIONS.MANAGER_CHANGE]: "Зміна менеджера",
  [AUDIT_ACTIONS.STATUS_CHANGE]: "Зміна статусу",
  [AUDIT_ACTIONS.TASK_ASSIGNED]: "Постановка завдання",
  [AUDIT_ACTIONS.TASK_CLOSED]: "Закриття завдання",
  [AUDIT_ACTIONS.REPORT_SUBMITTED]: "Надсилання звіту",
  [AUDIT_ACTIONS.REPORT_REVIEWED]: "Розгляд звіту",
  [AUDIT_ACTIONS.DRAFT_GENERATED]: "Генерація чернетки",
  [AUDIT_ACTIONS.LOGIN]: "Вхід у систему",
};

export const AUDIT_ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  trader: "Трейдер",
  profile: "Користувач",
  task: "Завдання",
  report: "Звіт",
  dashboard: "Дашборд",
};

export type AuditLogInput = {
  actorId: string;
  action: AuditAction | string;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

/** Best-effort insert — never throws, so a logging failure can't break the action it's logging. */
export async function logAudit(supabase: SupabaseClient, entry: AuditLogInput): Promise<void> {
  await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    entity_label: entry.entityLabel ?? null,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
  });
}
