"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { WeeklyTaskWithNote } from "@/lib/weekly-reports";
import type { TaskKind, TaskStatus } from "@/lib/types";

const KIND_LABELS: Record<TaskKind, string> = { daily: "Щоденна", weekly: "Щотижнева", monthly: "Щомісячна" };
const STATUS_LABELS: Record<TaskStatus, string> = {
  in_progress: "В роботі",
  done: "Виконано",
  overdue: "Прострочено",
};
const STATUS_STRIPE: Record<TaskStatus, string> = {
  in_progress: "var(--color-warning)",
  done: "var(--color-positive)",
  overdue: "var(--color-negative)",
};

function TaskCommentCell({
  reportId,
  taskId,
  initialValue,
  editable,
}: {
  reportId: string;
  taskId: string;
  initialValue: string;
  editable: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("weekly_report_task_notes")
      .upsert(
        { report_id: reportId, task_id: taskId, comment: value },
        { onConflict: "report_id,task_id" },
      );
    setSaving(false);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2000);
  }

  if (!editable) {
    return <span className="text-text-secondary">{initialValue || "—"}</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        placeholder="Коментар до задачі..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("h-7", status === "error" && "border-negative")}
      />
      <Button variant="ghost" className="h-7 shrink-0 px-2 text-xs" disabled={saving} onClick={handleSave}>
        {saving ? "…" : status === "saved" ? "✓" : "OK"}
      </Button>
    </div>
  );
}

export function WeeklyTasksSection({
  reportId,
  tasks,
  editable,
}: {
  reportId: string;
  tasks: WeeklyTaskWithNote[];
  editable: boolean;
}) {
  const columns: DataTableColumn<WeeklyTaskWithNote>[] = [
    {
      key: "title",
      header: "Завдання",
      accessor: (t) => (
        <div className="relative pl-3">
          <span
            className="absolute inset-y-0 left-0 w-0.5 rounded-full"
            style={{ background: STATUS_STRIPE[t.status] }}
          />
          <div className="text-text-primary">{t.title}</div>
          {t.trader_id && t.trader_code && (
            <Link href={`/trader/${t.trader_id}`} className="text-xs text-info hover:underline">
              {t.trader_code}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "kind",
      header: "Тип",
      accessor: (t) => (t.kind ? KIND_LABELS[t.kind] : "—"),
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
      accessor: (t) => STATUS_LABELS[t.status],
      sortValue: (t) => t.status,
    },
    {
      key: "comment",
      header: "Коментар",
      accessor: (t) => (
        <TaskCommentCell reportId={reportId} taskId={t.id} initialValue={t.comment} editable={editable} />
      ),
      width: "280px",
    },
  ];

  return (
    <div>
      <h2 className="mb-2 text-base font-medium text-text-primary">Завдання за тиждень</h2>
      {tasks.length === 0 ? (
        <EmptyState title="Немає завдань" description="На цей тиждень немає завдань з дедлайном." />
      ) : (
        <DataTable columns={columns} data={tasks} rowKey={(t) => t.id} />
      )}
    </div>
  );
}
