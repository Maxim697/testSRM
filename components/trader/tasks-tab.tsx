"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
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
        due_date: dueDate || null,
        status: "in_progress",
      })
      .select("*, trader:traders(code), assignee:profiles(full_name)")
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

  async function handleStatusChange(task: TaskWithRelations, status: TaskStatus) {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id)
      .select("*, trader:traders(code), assignee:profiles(full_name)")
      .single();

    if (data) onUpdated(data as unknown as TaskWithRelations);
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
        <EmptyState title="Немає завдань" description="Для цього трейдера ще не створено жодного завдання." />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <Card key={task.id} className="relative flex items-center justify-between gap-3 overflow-hidden pl-4">
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: STATUS_STRIPE[task.status] }}
              />
              <div className="min-w-0">
                <div className="truncate text-base text-text-primary">{task.title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                  <span>{task.kind ? KIND_LABELS[task.kind] : "—"}</span>
                  <span>·</span>
                  <span>Дедлайн: {formatDate(task.due_date)}</span>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
