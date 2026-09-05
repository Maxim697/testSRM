import type { Role } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  telegram: string | null;
  role: Role;
};

export type TraderTier = "gold" | "silver" | "bronze";
export type TraderStatus = "green" | "amber" | "red";

export type Trader = {
  id: string;
  code: string;
  tier: TraderTier | null;
  deposit: number | null;
  manager_id: string | null;
  status: TraderStatus | null;
  score: number | null;
  score_delta: number | null;
  last_active: string | null;
  cr: number | null;
  sla_in: string | null;
  sla_out: string | null;
  turnover_week: number | null;
  turnover_delta: number | null;
  settlement: number | null;
  created_at: string;
};

export type TraderWithManager = Trader & {
  manager: { full_name: string | null } | null;
};

export type TaskKind = "daily" | "weekly" | "monthly";
export type TaskStatus = "in_progress" | "done" | "overdue";
export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  kind: TaskKind | null;
  trader_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  priority: TaskPriority;
  due_date: string | null;
  status: TaskStatus;
  result_comment: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TaskWithRelations = Task & {
  trader: { code: string } | null;
  assignee: { full_name: string | null } | null;
  creator: { full_name: string | null } | null;
};

export type InteractionKind = "note" | "call" | "status_change" | "task_closed";

export type Interaction = {
  id: string;
  trader_id: string;
  author_id: string | null;
  kind: InteractionKind | null;
  body: string | null;
  created_at: string;
};

export type InteractionWithAuthor = Interaction & {
  author: { full_name: string | null } | null;
};

export type NewsItem = {
  id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  created_at: string;
};

export type NewsWithAuthor = NewsItem & {
  author: { full_name: string | null; role: Role } | null;
};

export type TraderWeekly = {
  id: string;
  trader_id: string;
  week_start: string;
  score: number | null;
  cr: number | null;
  turnover: number | null;
  status: TraderStatus | null;
  created_at: string;
};

export type WeeklyReportComment = {
  id: string;
  week_start: string;
  metric_key: string;
  comment: string | null;
  author_id: string | null;
  updated_at: string;
};

export type WeeklyReportStatus = "draft" | "submitted" | "approved" | "returned";

export type WeeklyReport = {
  id: string;
  week_start: string;
  author_id: string;
  status: WeeklyReportStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_comment: string | null;
  created_at: string;
  work_done: string | null;
  blockers: string | null;
  help_needed: string | null;
  next_week_plan: string | null;
};

export type WeeklyReportWithAuthor = WeeklyReport & {
  author: { full_name: string | null } | null;
};

export type WeeklyReportRow = {
  id: string;
  report_id: string;
  metric_key: string;
  metric_label: string;
  value: string | null;
  delta: string | null;
  comment: string | null;
};

export type WeeklyReportTaskNote = {
  id: string;
  report_id: string;
  task_id: string;
  comment: string | null;
};
