"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { WeeklyReport } from "@/lib/types";

type WorkColumn = "work_done" | "blockers" | "help_needed" | "next_week_plan";

function WorkField({
  reportId,
  column,
  label,
  initialValue,
  editable,
  suggestion,
  applyAllSignal,
  onSuggestionHandled,
}: {
  reportId: string;
  column: WorkColumn;
  label: string;
  initialValue: string;
  editable: boolean;
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
    const { error } = await supabase
      .from("weekly_reports")
      .update({ [column]: value })
      .eq("id", reportId);
    setSaving(false);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs text-text-secondary">{label}</label>
        {editable && (
          <Button variant="ghost" className="h-6 px-2 text-xs" disabled={saving} onClick={handleSave}>
            {saving ? "…" : status === "saved" ? "Збережено" : status === "error" ? "Помилка" : "Зберегти"}
          </Button>
        )}
      </div>
      {editable ? (
        <>
          <Input multiline rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
          {suggestion && (
            <div className="mt-1.5 rounded-control border border-info bg-info-bg p-2 text-xs">
              <div className="whitespace-pre-wrap text-text-secondary">{suggestion}</div>
              {value.trim() && (
                <div className="mt-1 text-warning">У полі вже є текст — застосування замінить його.</div>
              )}
              <div className="mt-1.5 flex gap-1.5">
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
        </>
      ) : (
        <p className="whitespace-pre-wrap rounded-control border border-border bg-surface-1 p-2.5 text-base text-text-primary">
          {initialValue || "—"}
        </p>
      )}
    </div>
  );
}

export function WorkSummarySection({
  report,
  editable,
  suggestions,
  handledKeys,
  applyAllSignal,
  onSuggestionHandled,
}: {
  report: WeeklyReport;
  editable: boolean;
  suggestions?: { work_done?: string; blockers?: string; next_week_plan?: string };
  handledKeys?: Set<string>;
  applyAllSignal?: number;
  onSuggestionHandled?: (column: "work_done" | "blockers" | "next_week_plan") => void;
}) {
  function suggestionFor(column: "work_done" | "blockers" | "next_week_plan"): string | undefined {
    if (handledKeys?.has(column)) return undefined;
    return suggestions?.[column];
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-text-primary">Робота за тиждень</h2>
      <WorkField
        reportId={report.id}
        column="work_done"
        label="Що зроблено"
        initialValue={report.work_done ?? ""}
        editable={editable}
        suggestion={suggestionFor("work_done")}
        applyAllSignal={applyAllSignal}
        onSuggestionHandled={() => onSuggestionHandled?.("work_done")}
      />
      <WorkField
        reportId={report.id}
        column="blockers"
        label="Проблеми і блокери"
        initialValue={report.blockers ?? ""}
        editable={editable}
        suggestion={suggestionFor("blockers")}
        applyAllSignal={applyAllSignal}
        onSuggestionHandled={() => onSuggestionHandled?.("blockers")}
      />
      <WorkField
        reportId={report.id}
        column="help_needed"
        label="Потрібна допомога від керівника"
        initialValue={report.help_needed ?? ""}
        editable={editable}
      />
      <WorkField
        reportId={report.id}
        column="next_week_plan"
        label="Плани на наступний тиждень"
        initialValue={report.next_week_plan ?? ""}
        editable={editable}
        suggestion={suggestionFor("next_week_plan")}
        applyAllSignal={applyAllSignal}
        onSuggestionHandled={() => onSuggestionHandled?.("next_week_plan")}
      />
    </Card>
  );
}
