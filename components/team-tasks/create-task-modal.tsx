"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { TASK_WITH_RELATIONS_SELECT } from "@/lib/task-actions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import type { Profile, TaskKind, TaskPriority, TaskWithRelations, Trader } from "@/lib/types";

const KIND_LABELS: Record<TaskKind, string> = { daily: "Щоденна", weekly: "Щотижнева", monthly: "Щомісячна" };
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Низький", normal: "Звичайний", high: "Високий" };

export function CreateTaskModal({
  open,
  onClose,
  managers,
  traders,
  currentUserId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  managers: Profile[];
  traders: Pick<Trader, "id" | "code" | "manager_id">[];
  currentUserId: string;
  onCreated: (task: TaskWithRelations) => void;
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<TaskKind>("daily");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [traderId, setTraderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const traderOptions = useMemo(
    () => traders.filter((t) => !assigneeId || t.manager_id === assigneeId),
    [traders, assigneeId],
  );

  function reset() {
    setAssigneeId("");
    setTitle("");
    setDescription("");
    setKind("daily");
    setPriority("normal");
    setDueDate("");
    setTraderId("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!assigneeId || !title.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        kind,
        priority,
        trader_id: traderId || null,
        assignee_id: assigneeId,
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

    const assignee = managers.find((m) => m.id === assigneeId);
    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TASK_ASSIGNED,
      entityType: "task",
      entityId: (data as unknown as TaskWithRelations).id,
      entityLabel: title.trim(),
      newValue: `Виконавець: ${assignee?.full_name ?? "—"}`,
    });

    onCreated(data as unknown as TaskWithRelations);
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Поставити завдання" className="max-w-lg">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Виконавець</label>
          <Select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
              setTraderId("");
            }}
            required
          >
            <option value="">Оберіть менеджера</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Без імені"}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Заголовок</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Що потрібно зробити" required />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Опис</label>
          <Input
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Деталі завдання (необов'язково)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Тип</label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Пріоритет</label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Дедлайн</label>
            <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Трейдер (необов&apos;язково)</label>
            <Select value={traderId} onChange={(e) => setTraderId(e.target.value)}>
              <option value="">Без трейдера</option>
              {traderOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Скасувати
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !assigneeId || !title.trim()}>
            {saving ? "Створення…" : "Поставити завдання"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
