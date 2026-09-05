"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricTable } from "@/components/weekly-report/metric-table";
import { WorkSummarySection } from "@/components/weekly-report/work-summary-section";
import { WeeklyTasksSection } from "@/components/weekly-report/weekly-tasks-section";
import type { DrilldownItem } from "@/components/weekly-report/metric-drilldown-modal";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_METRIC_KEYS } from "@/lib/weekly-report-constants";
import { formatDate, formatDateTime } from "@/lib/format";
import type { WeeklyReport, WeeklyReportRow, WeeklyReportStatus } from "@/lib/types";
import type { WeeklyTaskWithNote } from "@/lib/weekly-reports";

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function WeeklyReportView({
  weeks,
  selectedWeekStart,
  report: initialReport,
  rows,
  history,
  portfolioCount,
  tasks,
  drilldown,
}: {
  weeks: string[];
  selectedWeekStart: string;
  report: WeeklyReport;
  rows: WeeklyReportRow[];
  history: WeeklyReport[];
  portfolioCount: number;
  tasks: WeeklyTaskWithNote[];
  drilldown: Record<string, DrilldownItem[]>;
}) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = report.status === "draft" || report.status === "returned";
  const activityKeys: readonly string[] = ACTIVITY_METRIC_KEYS;
  const mainRows = rows.filter((r) => !activityKeys.includes(r.metric_key));
  const activityRows = rows.filter((r) => activityKeys.includes(r.metric_key));

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

      <p className="text-xs text-text-muted">
        Дані розраховані автоматично на основі {portfolioCount} трейдерів вашого портфеля за
        період з {formatDate(selectedWeekStart)} по {formatDate(addDays(selectedWeekStart, 6))}.
        Оновлено: {formatDateTime(report.created_at)}.
      </p>

      {report.status === "returned" && report.reviewer_comment && (
        <Card className="border-negative bg-negative-bg">
          <div className="text-xs font-medium uppercase tracking-wide text-negative">
            Коментар лідера
          </div>
          <p className="mt-1 text-base text-text-primary">{report.reviewer_comment}</p>
        </Card>
      )}

      <MetricTable key={`main-${report.id}`} rows={mainRows} drilldown={drilldown} editable={editable} />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Активність за тиждень</h2>
        <MetricTable
          key={`activity-${report.id}`}
          rows={activityRows}
          drilldown={drilldown}
          editable={editable}
          showDelta={false}
        />
      </div>

      <WeeklyTasksSection reportId={report.id} tasks={tasks} editable={editable} />

      <WorkSummarySection report={report} editable={editable} />

      <div>
        <h2 className="mb-2 text-base font-medium text-text-primary">Історія своїх звітів</h2>
        <DataTable columns={historyColumns} data={history} rowKey={(r) => r.id} />
      </div>
    </div>
  );
}
