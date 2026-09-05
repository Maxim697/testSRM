"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricTable } from "@/components/weekly-report/metric-table";
import { WeeklyTasksSection } from "@/components/weekly-report/weekly-tasks-section";
import type { DrilldownItem } from "@/components/weekly-report/metric-drilldown-modal";
import { createClient } from "@/lib/supabase/client";
import { buildDrilldownData } from "@/lib/weekly-report-drilldown-core";
import { getWeeklyTasksWithNotesData, type WeeklyTaskWithNote } from "@/lib/weekly-report-tasks-core";
import { ACTIVITY_METRIC_KEYS } from "@/lib/weekly-report-constants";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import type { WeeklyReportRow, WeeklyReportStatus, WeeklyReportWithAuthor } from "@/lib/types";

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

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="mb-1 text-xs text-text-secondary">{label}</div>
      <p className="whitespace-pre-wrap rounded-control border border-border bg-surface-1 p-2.5 text-base text-text-primary">
        {value || "—"}
      </p>
    </div>
  );
}

export function ReportDetailModal({
  report,
  currentUserId,
  onClose,
  onReviewed,
}: {
  report: WeeklyReportWithAuthor | null;
  currentUserId: string;
  onClose: () => void;
  onReviewed: (updated: WeeklyReportWithAuthor) => void;
}) {
  const [rows, setRows] = useState<WeeklyReportRow[]>([]);
  const [tasks, setTasks] = useState<WeeklyTaskWithNote[]>([]);
  const [drilldown, setDrilldown] = useState<Record<string, DrilldownItem[]>>({});
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the local editor state whenever a different report is opened
    setComment(report.reviewer_comment ?? "");
    setError(null);
    setLoading(true);
    const supabase = createClient();

    Promise.all([
      supabase.from("weekly_report_rows").select("*").eq("report_id", report.id),
      getWeeklyTasksWithNotesData(supabase, report.author_id, report.week_start, report.id),
      buildDrilldownData(supabase, report.author_id, report.week_start),
      supabase.from("traders").select("*", { count: "exact", head: true }).eq("manager_id", report.author_id),
    ]).then(([rowsRes, tasksData, drilldownData, countRes]) => {
      setRows((rowsRes.data ?? []) as WeeklyReportRow[]);
      setTasks(tasksData);
      setDrilldown(drilldownData);
      setPortfolioCount(countRes.count ?? 0);
      setLoading(false);
    });
  }, [report]);

  async function handleReview(status: "approved" | "returned") {
    if (!report) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("weekly_reports")
      .update({
        status,
        reviewer_comment: comment || null,
        reviewer_id: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .select("*, author:profiles!weekly_reports_author_id_fkey(full_name)")
      .single();
    setSaving(false);

    if (updateError || !data) {
      setError("Не вдалося зберегти рішення. Спробуйте ще раз.");
      return;
    }
    onReviewed(data as unknown as WeeklyReportWithAuthor);
  }

  const activityKeys: readonly string[] = ACTIVITY_METRIC_KEYS;
  const mainRows = rows.filter((r) => !activityKeys.includes(r.metric_key));
  const activityRows = rows.filter((r) => activityKeys.includes(r.metric_key));

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={report ? `Звіт: ${report.author?.full_name ?? "—"}` : ""}
      className="max-w-3xl"
    >
      {report && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Тиждень: {formatDate(report.week_start)}</span>
            <Badge variant={STATUS_BADGE[report.status]}>{STATUS_LABELS[report.status]}</Badge>
          </div>

          {loading ? (
            <p className="text-sm text-text-muted">Завантаження…</p>
          ) : (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
              <p className="text-xs text-text-muted">
                Дані розраховані автоматично на основі {portfolioCount} трейдерів портфеля за
                період з {formatDate(report.week_start)}. Оновлено: {formatDateTime(report.created_at)}.
              </p>

              <MetricTable rows={mainRows} drilldown={drilldown} editable={false} />

              <div>
                <h3 className="mb-2 text-sm font-medium text-text-primary">Активність за тиждень</h3>
                <MetricTable rows={activityRows} drilldown={drilldown} editable={false} showDelta={false} />
              </div>

              <WeeklyTasksSection reportId={report.id} authorId={report.author_id} tasks={tasks} editable={false} />

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-text-primary">Робота за тиждень</h3>
                <ReadOnlyField label="Що зроблено" value={report.work_done} />
                <ReadOnlyField label="Проблеми і блокери" value={report.blockers} />
                <ReadOnlyField label="Потрібна допомога від керівника" value={report.help_needed} />
                <ReadOnlyField label="Плани на наступний тиждень" value={report.next_week_plan} />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Коментар лідера</label>
            <Input
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Що потрібно виправити чи уточнити..."
            />
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className={cn("flex justify-end gap-2", saving && "opacity-60")}>
            <Button variant="secondary" disabled={saving} onClick={() => handleReview("returned")}>
              Повернути на доопрацювання
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => handleReview("approved")}>
              Прийняти
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
