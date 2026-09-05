"use client";

import { useState } from "react";
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
}: {
  reportId: string;
  column: WorkColumn;
  label: string;
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
        <Input multiline rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <p className="whitespace-pre-wrap rounded-control border border-border bg-surface-1 p-2.5 text-base text-text-primary">
          {initialValue || "—"}
        </p>
      )}
    </div>
  );
}

export function WorkSummarySection({ report, editable }: { report: WeeklyReport; editable: boolean }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-text-primary">Робота за тиждень</h2>
      <WorkField
        reportId={report.id}
        column="work_done"
        label="Що зроблено"
        initialValue={report.work_done ?? ""}
        editable={editable}
      />
      <WorkField
        reportId={report.id}
        column="blockers"
        label="Проблеми і блокери"
        initialValue={report.blockers ?? ""}
        editable={editable}
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
      />
    </Card>
  );
}
