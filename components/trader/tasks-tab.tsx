"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListCheckIcon } from "@/components/ui/empty-icons";
import { createClient } from "@/lib/supabase/client";
import { TASK_WITH_RELATIONS_SELECT, taskRequiresCommentToClose, updateTaskStatus } from "@/lib/task-actions";
import { formatDate } from "@/lib/format";
import type { TaskKind, TaskStatus, TaskWithRelations } from "@/lib/types";

const KIND_LABELS: Record<TaskKind, string> = { daily: "Щоденна", weekly: "Щотижнева", monthly: "Щомісячна" };
const STATUS_STRIPE: Record<TaskStatus, string> = {
  in_progress: "var(--color-warning)",
  done: "var(--color-positive)",
  overdue: "var(--color-negative)",
};

export function TasksTab({
  traderId,
  traderCode,
  tasks,
  currentUserId,
  onCreated,
  onUpdated,
}: {
  traderId: string;
  traderCode: string;
  tasks: TaskWithRelations[];
  currentUserId: string;
  onCreated: (row: TaskWithRelations) => void;
  onUpdated: (row: TaskWithRelations) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("daily");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [closeComment, setCloseComment] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        kind,
        trader_id: traderId,
        assignee_id: currentUserId,
        created_by: currentUserId,
        due_date: dueDate || null,
        status: "in_progress",
      })
      .select(TASK_WITH_RELATIONS_SELECT)
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError("Не вдалося створити завдання. Спробуйте ще раз.");
      return;
    }

    onCreated(data as unknown as TaskWithRelations);
    setTitle("");
    setDueDate("");
  }

  async function commitStatus(task: TaskWithRelations, status: TaskStatus, resultComment: string | null) {
    const supabase = createClient();
    const { data, error: updateError } = await updateTaskStatus(supabase, currentUserId, task, status, resultComment);
    if (updateError || !data) {
      setCloseError("Не вдалося зберегти. Спробуйте ще раз.");
      return;
    }
    onUpdated(data as unknown as TaskWithRelations);
    setPendingCloseId(null);
    setCloseComment("");
    setCloseError(null);
  }

  function handleStatusChange(task: TaskWithRelations, status: TaskStatus) {
    if (status === "done" && taskRequiresCommentToClose(task) && !task.result_comment) {
      setPendingCloseId(task.id);
      setCloseComment("");
      setCloseError(null);
      return;
    }
    commitStatus(task, status, task.result_comment ?? null);
  }

  function handleConfirmClose(task: TaskWithRelations) {
    if (!closeComment.trim()) {
      setCloseError("Щоб закрити завдання, поставлене керівником, вкажіть коментар про виконання.");
      return;
    }
    commitStatus(task, "done", closeComment.trim());
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <form className="grid grid-cols-[1fr_140px_160px_auto] items-end gap-2" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="task-title" className="mb-1.5 block text-xs text-text-secondary">
              Нове завдання для {traderCode}
            </label>
            <Input
              id="task-title"
              placeholder="Що потрібно зробити"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Тип</label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
              <option value="daily">Щоденна</option>
              <option value="weekly">Щотижнева</option>
              <option value="monthly">Щомісячна</option>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Дедлайн</label>
            <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" disabled={saving || !title.trim()}>
            {saving ? "Створення…" : "Створити"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListCheckIcon />}
          title="Немає завдань"
          description="Для цього трейдера ще не створено жодного завдання."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <Card key={task.id} className="relative flex flex-col gap-2 overflow-hidden pl-4">
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: STATUS_STRIPE[task.status] }}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base text-text-primary">{task.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                    <span>{task.kind ? KIND_LABELS[task.kind] : "—"}</span>
                    <span>·</span>
                    <span>Дедлайн: {formatDate(task.due_date)}</span>
                    {task.created_by !== task.assignee_id && (
                      <>
                        <span>·</span>
                        <span>Поставив: {task.creator?.full_name ?? "—"}</span>
                      </>
                    )}
                  </div>
                </div>
                <Select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                  className="w-36 shrink-0"
                >
                  <option value="in_progress">В роботі</option>
                  <option value="done">Виконано</option>
                  <option value="overdue">Прострочено</option>
                </Select>
              </div>

              {pendingCloseId === task.id && (
                <div className="flex items-center gap-2 border-t border-border pt-2">
                  <Input
                    multiline
                    rows={2}
                    placeholder="Що зроблено по цьому завданню..."
                    value={closeComment}
                    onChange={(e) => setCloseComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="h-8 shrink-0"
                    onClick={() => handleConfirmClose(task)}
                  >
                    Закрити
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0"
                    onClick={() => {
                      setPendingCloseId(null);
                      setCloseError(null);
                    }}
                  >
                    Скасувати
                  </Button>
                </div>
              )}
              {pendingCloseId === task.id && closeError && (
                <p className="text-xs text-negative">{closeError}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
