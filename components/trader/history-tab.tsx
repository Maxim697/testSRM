"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon } from "@/components/ui/empty-icons";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { InteractionKind, InteractionWithAuthor } from "@/lib/types";

const KIND_LABELS: Record<InteractionKind, string> = {
  note: "Нотатка",
  call: "Дзвінок",
  status_change: "Зміна статусу",
  task_closed: "Закрита задача",
};

const KIND_COLORS: Record<InteractionKind, string> = {
  note: "var(--series-1)",
  call: "var(--series-2)",
  status_change: "var(--series-3)",
  task_closed: "var(--series-4)",
};

export function HistoryTab({
  traderId,
  currentUserId,
  interactions,
  onCreated,
}: {
  traderId: string;
  currentUserId: string;
  interactions: InteractionWithAuthor[];
  onCreated: (row: InteractionWithAuthor) => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("interactions")
      .insert({
        trader_id: traderId,
        author_id: currentUserId,
        kind: "note",
        body: text.trim(),
      })
      .select("*, author:profiles(full_name)")
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError("Не вдалося зберегти нотатку. Спробуйте ще раз.");
      return;
    }

    onCreated(data as unknown as InteractionWithAuthor);
    setText("");
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <form className="flex items-end gap-2" onSubmit={handleSubmit}>
          <div className="flex-1">
            <label htmlFor="note-body" className="mb-1.5 block text-xs text-text-secondary">
              Нова нотатка
            </label>
            <Input
              id="note-body"
              placeholder="Напишіть, що сталося..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" disabled={saving || !text.trim()}>
            {saving ? "Збереження…" : "Зберегти"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-negative">{error}</p>}
      </Card>

      {interactions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="Ще немає записів"
          description="Історія взаємодій з трейдером порожня."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {interactions.map((item) => (
            <Card key={item.id} className="relative overflow-hidden pl-4">
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: item.kind ? KIND_COLORS[item.kind] : "var(--border-strong)" }}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span
                    className="rounded-control px-1.5 py-0.5 font-medium"
                    style={{
                      color: item.kind ? KIND_COLORS[item.kind] : "var(--color-text-secondary)",
                      background: "var(--color-surface-3)",
                    }}
                  >
                    {item.kind ? KIND_LABELS[item.kind] : "—"}
                  </span>
                  <span>{item.author?.full_name ?? "—"}</span>
                </div>
                <span className="text-xs text-text-muted">{formatDateTime(item.created_at)}</span>
              </div>
              {item.body && <p className="mt-1.5 text-base text-text-primary">{item.body}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
