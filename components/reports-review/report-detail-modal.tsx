"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
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
  const [loadingRows, setLoadingRows] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the local editor state whenever a different report is opened
    setComment(report.reviewer_comment ?? "");
    setError(null);
    setLoadingRows(true);
    const supabase = createClient();
    supabase
      .from("weekly_report_rows")
      .select("*")
      .eq("report_id", report.id)
      .then(({ data }) => {
        setRows((data ?? []) as WeeklyReportRow[]);
        setLoadingRows(false);
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
      .select("*, author:profiles(full_name)")
      .single();
    setSaving(false);

    if (updateError || !data) {
      setError("Не вдалося зберегти рішення. Спробуйте ще раз.");
      return;
    }
    onReviewed(data as unknown as WeeklyReportWithAuthor);
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
      header: "Δ",
      accessor: (r) => <span className="tabular-nums">{r.delta ?? "—"}</span>,
      align: "right",
    },
    { key: "comment", header: "Коментар менеджера", accessor: (r) => r.comment || "—" },
  ];

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={report ? `Звіт: ${report.author?.full_name ?? "—"}` : ""}
      className="max-w-2xl"
    >
      {report && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Тиждень: {formatDate(report.week_start)}</span>
            <Badge variant={STATUS_BADGE[report.status]}>{STATUS_LABELS[report.status]}</Badge>
          </div>

          {loadingRows ? (
            <p className="text-sm text-text-muted">Завантаження…</p>
          ) : (
            <DataTable columns={columns} data={rows} rowKey={(r) => r.id} />
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
