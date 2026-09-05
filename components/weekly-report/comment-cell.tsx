"use client";

import { useState } from "react";
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
}: {
  table: "weekly_report_rows" | "weekly_report_task_notes";
  rowId: string;
  initialValue: string;
  editable: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

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
  );
}
