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

export type Task = {
  id: string;
  title: string;
  kind: TaskKind | null;
  trader_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
};

export type TaskWithRelations = Task & {
  trader: { code: string } | null;
  assignee: { full_name: string | null } | null;
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
