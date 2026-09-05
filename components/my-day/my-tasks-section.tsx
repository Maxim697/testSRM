"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { taskRequiresCommentToClose, updateTaskStatus } from "@/lib/task-actions";
import { formatDate } from "@/lib/format";
import type { TaskStatus, TaskWithRelations } from "@/lib/types";

const STATUS_STRIPE: Record<TaskStatus, string> = {
  in_progress: "var(--color-warning)",
  done: "var(--color-positive)",
  overdue: "var(--color-negative)",
};

function TaskRow({
  task,
  currentUserId,
  showCreator,
  onUpdated,
}: {
  task: TaskWithRelations;
  currentUserId: string;
  showCreator: boolean;
  onUpdated: (task: TaskWithRelations) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [comment, setComment] = useState(task.result_comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(status: TaskStatus, resultComment: string | null) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await updateTaskStatus(supabase, currentUserId, task, status, resultComment);
    setSaving(false);
    if (updateError || !data) {
      setError("Не вдалося зберегти. Спробуйте ще раз.");
      return;
    }
    onUpdated(data as unknown as TaskWithRelations);
    setClosing(false);
  }

  function handleStatusChange(status: TaskStatus) {
    if (status === "done" && taskRequiresCommentToClose(task) && !task.result_comment) {
      setClosing(true);
      setError(null);
      return;
    }
    commit(status, task.result_comment ?? null);
  }

  function handleConfirmClose() {
    if (!comment.trim()) {
      setError("Щоб закрити завдання, поставлене керівником, вкажіть коментар про виконання.");
      return;
    }
    commit("done", comment.trim());
  }

  return (
    <Card className="relative flex flex-col gap-2 overflow-hidden pl-4">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: STATUS_STRIPE[task.status] }} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-text-primary">{task.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span>{task.trader?.code ?? "Загальне завдання"}</span>
            <span>·</span>
            <span>Дедлайн: {formatDate(task.due_date)}</span>
            {showCreator && (
              <>
                <span>·</span>
                <span>Поставив: {task.creator?.full_name ?? "—"}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {task.trader_id && (
            <Button href={`/trader/${task.trader_id}`} variant="ghost" className="h-8">
              Відкрити
            </Button>
          )}
          <Select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="w-36"
            disabled={saving}
          >
            <option value="in_progress">В роботі</option>
            <option value="done">Виконано</option>
            <option value="overdue">Прострочено</option>
          </Select>
        </div>
      </div>

      {closing && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <Input
            multiline
            rows={2}
            placeholder="Що зроблено по цьому завданню..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1"
          />
          <Button variant="primary" className="h-8 shrink-0" disabled={saving} onClick={handleConfirmClose}>
            Закрити
          </Button>
          <Button variant="ghost" className="h-8 shrink-0" onClick={() => setClosing(false)}>
            Скасувати
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-negative">{error}</p>}
    </Card>
  );
}

export function MyTasksSection({
  tasks: initialTasks,
  currentUserId,
}: {
  tasks: TaskWithRelations[];
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);

  function handleUpdated(updated: TaskWithRelations) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const fromLead = tasks.filter((t) => t.created_by !== currentUserId);
  const own = tasks.filter((t) => t.created_by === currentUserId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Завдання від керівника</h2>
        {fromLead.length === 0 ? (
          <EmptyState title="Завдань немає" description="Керівник поки не ставив вам завдань на сьогодні." />
        ) : (
          <div className="flex flex-col gap-2">
            {fromLead.map((task) => (
              <TaskRow key={task.id} task={task} currentUserId={currentUserId} showCreator onUpdated={handleUpdated} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Мої завдання</h2>
        {own.length === 0 ? (
          <EmptyState title="Завдань немає" description="На сьогодні для вас немає завдань з дедлайном." />
        ) : (
          <div className="flex flex-col gap-2">
            {own.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                showCreator={false}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
