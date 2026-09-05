"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function CommentCell({
  table,
  rowId,
  initialValue,
  editable,
  placeholder = "Коментар...",
  suggestion,
  applyAllSignal,
  onSuggestionHandled,
}: {
  table: "weekly_report_rows" | "weekly_report_task_notes";
  rowId: string;
  initialValue: string;
  editable: boolean;
  placeholder?: string;
  suggestion?: string;
  applyAllSignal?: number;
  onSuggestionHandled?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    if (applyAllSignal && suggestion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bulk-applying an AI-suggested draft value when "Застосувати все" is clicked
      setValue(suggestion);
      onSuggestionHandled?.();
    }
    // only react to an explicit "apply all" click, not to suggestion/callback identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAllSignal]);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from(table).update({ comment: value }).eq("id", rowId);
    setSaving(false);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2000);
  }

  if (!editable) {
    return <span className="text-text-secondary">{initialValue || "—"}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn("h-7", status === "error" && "border-negative")}
        />
        <Button variant="ghost" className="h-7 shrink-0 px-2 text-xs" disabled={saving} onClick={handleSave}>
          {saving ? "…" : status === "saved" ? "✓" : "OK"}
        </Button>
      </div>
      {suggestion && (
        <div className="rounded-control border border-info bg-info-bg p-1.5 text-xs">
          <div className="text-text-secondary">{suggestion}</div>
          {value.trim() && (
            <div className="mt-0.5 text-warning">У полі вже є текст — застосування замінить його.</div>
          )}
          <div className="mt-1 flex gap-1.5">
            <Button
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setValue(suggestion);
                onSuggestionHandled?.();
              }}
            >
              Застосувати
            </Button>
            <Button variant="ghost" className="h-6 px-2 text-xs" onClick={() => onSuggestionHandled?.()}>
              Відхилити
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
