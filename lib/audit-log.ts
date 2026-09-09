import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntityType = "trader" | "profile" | "task" | "report" | "dashboard" | "team";

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
  USER_CREATED: "user_created",
  USER_DEACTIVATED: "user_deactivated",
  USER_ACTIVATED: "user_activated",
  TEAM_CREATED: "team_created",
  TEAM_RENAMED: "team_renamed",
  TEAM_DELETED: "team_deleted",
  TEAM_LEAD_CHANGED: "team_lead_changed",
  TEAM_MEMBER_MOVED: "team_member_moved",
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
  [AUDIT_ACTIONS.USER_CREATED]: "Створення користувача",
  [AUDIT_ACTIONS.USER_DEACTIVATED]: "Деактивація користувача",
  [AUDIT_ACTIONS.USER_ACTIVATED]: "Активація користувача",
  [AUDIT_ACTIONS.TEAM_CREATED]: "Створення команди",
  [AUDIT_ACTIONS.TEAM_RENAMED]: "Перейменування команди",
  [AUDIT_ACTIONS.TEAM_DELETED]: "Видалення команди",
  [AUDIT_ACTIONS.TEAM_LEAD_CHANGED]: "Зміна тімліда",
  [AUDIT_ACTIONS.TEAM_MEMBER_MOVED]: "Переміщення в іншу команду",
};

export const AUDIT_ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  trader: "Трейдер",
  profile: "Користувач",
  task: "Завдання",
  report: "Звіт",
  dashboard: "Дашборд",
  team: "Команда",
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
