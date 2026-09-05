"use client";

import { useMemo, useState } from "react";
import { KpiRow } from "@/components/ui/kpi-row";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTaskModal } from "@/components/team-tasks/create-task-modal";
import { formatDate } from "@/lib/format";
import type { Profile, TaskKind, TaskPriority, TaskStatus, TaskWithRelations, Trader } from "@/lib/types";

const KIND_LABELS: Record<TaskKind, string> = { daily: "Щоденна", weekly: "Щотижнева", monthly: "Щомісячна" };
const STATUS_LABELS: Record<TaskStatus, string> = { in_progress: "В роботі", done: "Виконано", overdue: "Прострочено" };
const STATUS_BADGE: Record<TaskStatus, "neutral" | "amber" | "green" | "red"> = {
  in_progress: "amber",
  done: "green",
  overdue: "red",
};
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Низький", normal: "Звичайний", high: "Високий" };
const PRIORITY_BADGE: Record<TaskPriority, "neutral" | "red"> = { low: "neutral", normal: "neutral", high: "red" };

function isOverdue(task: TaskWithRelations): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return task.status !== "done" && (task.status === "overdue" || (!!task.due_date && task.due_date < today));
}

export function TeamTasksView({
  tasks: initialTasks,
  managers,
  traders,
  currentUserId,
}: {
  tasks: TaskWithRelations[];
  managers: Profile[];
  traders: Pick<Trader, "id" | "code" | "manager_id" | "tier">[];
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const summary = useMemo(
    () => ({
      total: tasks.length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: tasks.filter(isOverdue).length,
    }),
    [tasks],
  );

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (assigneeFilter && t.assignee_id !== assigneeFilter) return false;
        if (statusFilter && t.status !== statusFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        return true;
      }),
    [tasks, assigneeFilter, statusFilter, priorityFilter],
  );

  function handleCreated(task: TaskWithRelations) {
    setTasks((prev) => [task, ...prev]);
  }

  const columns: DataTableColumn<TaskWithRelations>[] = [
    {
      key: "assignee",
      header: "Виконавець",
      accessor: (t) => t.assignee?.full_name ?? "—",
      sortValue: (t) => t.assignee?.full_name ?? "",
    },
    {
      key: "title",
      header: "Завдання",
      accessor: (t) => (
        <div className="min-w-0">
          <div className="truncate text-text-primary">{t.title}</div>
          {t.trader && <div className="text-xs text-info">{t.trader.code}</div>}
        </div>
      ),
      sortValue: (t) => t.title,
    },
    { key: "kind", header: "Тип", accessor: (t) => (t.kind ? KIND_LABELS[t.kind] : "—") },
    {
      key: "priority",
      header: "Пріоритет",
      accessor: (t) => <Badge variant={PRIORITY_BADGE[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge>,
      sortValue: (t) => t.priority,
    },
    {
      key: "due_date",
      header: "Дедлайн",
      accessor: (t) => formatDate(t.due_date),
      sortValue: (t) => t.due_date ?? "",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (t) => <Badge variant={STATUS_BADGE[t.status]}>{STATUS_LABELS[t.status]}</Badge>,
      sortValue: (t) => t.status,
    },
    {
      key: "result_comment",
      header: "Коментар виконавця",
      accessor: (t) => <span className="text-text-secondary">{t.result_comment || "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <KpiRow
        items={[
          { label: "Усього завдань", value: summary.total.toString() },
          { label: "У роботі", value: summary.inProgress.toString(), status: "warning" },
          { label: "Виконано", value: summary.done.toString(), status: "positive" },
          {
            label: "Прострочено",
            value: summary.overdue.toString(),
            status: summary.overdue > 0 ? "negative" : "neutral",
          },
        ]}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">Усі виконавці</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Без імені"}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Усі статуси</option>
            <option value="in_progress">В роботі</option>
            <option value="done">Виконано</option>
            <option value="overdue">Прострочено</option>
          </Select>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">Усі пріоритети</option>
            <option value="low">Низький</option>
            <option value="normal">Звичайний</option>
            <option value="high">Високий</option>
          </Select>
        </div>
        <Button variant="primary" className="shrink-0" onClick={() => setModalOpen(true)}>
          Поставити завдання
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Завдань немає" description="Ще не поставлено жодного завдання команді." />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(t) => t.id}
          rowClassName={(t) => (isOverdue(t) ? "bg-negative-bg" : undefined)}
          rowAccent={(t) => (isOverdue(t) ? "var(--color-negative)" : undefined)}
        />
      )}

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        managers={managers}
        traders={traders}
        currentUserId={currentUserId}
        onCreated={handleCreated}
      />
    </div>
  );
}
