"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import type { WeeklyReport, WeeklyReportRow, WeeklyReportStatus } from "@/lib/types";

const STATUS_LABELS: Record<WeeklyReportStatus, string> = {
  draft: "Чернетка",
  submitted: "Надіслано",
  approved: "Прийнято",
  returned: "Повернено на доопрацювання",
};
const STATUS_BADGE: Record<WeeklyReportStatus, "neutral" | "amber" | "green" | "red"> = {
  draft: "neutral",
  submitted: "amber",
  approved: "green",
  returned: "red",
};

function CommentCell({
  rowId,
  initialValue,
  editable,
}: {
  rowId: string;
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
      .from("weekly_report_rows")
      .update({ comment: value })
      .eq("id", rowId);
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
        placeholder="Причина зростання/падіння..."
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

export function WeeklyReportView({
  weeks,
  selectedWeekStart,
  report: initialReport,
  rows,
  history,
}: {
  weeks: string[];
  selectedWeekStart: string;
  report: WeeklyReport;
  rows: WeeklyReportRow[];
  history: WeeklyReport[];
}) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = report.status === "draft" || report.status === "returned";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("weekly_reports")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", report.id)
      .select("*")
      .single();
    setSubmitting(false);

    if (updateError || !data) {
      setError("Не вдалося надіслати звіт. Спробуйте ще раз.");
      return;
    }
    setReport(data as WeeklyReport);
  }

  const columns: DataTableColumn<WeeklyReportRow>[] = [
    { key: "label", header: "Показник", accessor: (r) => r.metric_label },
    {
      key: "value",
      header: "Значення",
      accessor: (r) => <span className="tabular-nums font-medium">{r.value ?? "—"}</span>,
      align: "right",
    },
    {
      key: "delta",
      header: "Δ значення",
      accessor: (r) => {
        const isPositive = r.delta?.startsWith("+");
        const isNegative = r.delta?.startsWith("-");
        return (
          <span
            className={cn(
              "tabular-nums",
              isPositive && "text-positive",
              isNegative && "text-negative",
              !isPositive && !isNegative && "text-text-muted",
            )}
          >
            {r.delta ?? "—"}
          </span>
        );
      },
      align: "right",
    },
    {
      key: "comment",
      header: "Коментар (причини росту/падіння)",
      accessor: (r) => <CommentCell rowId={r.id} initialValue={r.comment ?? ""} editable={editable} />,
      width: "320px",
    },
  ];

  const historyColumns: DataTableColumn<WeeklyReport>[] = [
    { key: "week", header: "Тиждень", accessor: (r) => formatDate(r.week_start), sortValue: (r) => r.week_start },
    {
      key: "status",
      header: "Статус",
      accessor: (r) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      sortValue: (r) => r.status,
    },
    {
      key: "submitted_at",
      header: "Дата відправки",
      accessor: (r) => (r.submitted_at ? formatDateTime(r.submitted_at) : "—"),
      sortValue: (r) => r.submitted_at ?? "",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card className="flex items-end justify-between gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Тиждень</label>
          <Select
            value={selectedWeekStart}
            onChange={(e) => router.push(`/weekly-report?week=${e.target.value}`)}
            className="max-w-xs"
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                {formatDate(w)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={STATUS_BADGE[report.status]}>{STATUS_LABELS[report.status]}</Badge>
          {editable && (
            <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Надсилання…" : "Надіслати звіт"}
            </Button>
          )}
        </div>
      </Card>

      {error && <p className="text-sm text-negative">{error}</p>}

      {report.status === "returned" && report.reviewer_comment && (
        <Card className="border-negative bg-negative-bg">
          <div className="text-xs font-medium uppercase tracking-wide text-negative">
            Коментар лідера
          </div>
          <p className="mt-1 text-base text-text-primary">{report.reviewer_comment}</p>
        </Card>
      )}

      <DataTable key={report.id} columns={columns} data={rows} rowKey={(r) => r.id} />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Історія своїх звітів</h2>
        <DataTable columns={historyColumns} data={history} rowKey={(r) => r.id} />
      </div>
    </div>
  );
}
