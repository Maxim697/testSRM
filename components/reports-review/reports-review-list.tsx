"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ReportDetailModal } from "@/components/reports-review/report-detail-modal";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Profile, WeeklyReportStatus, WeeklyReportWithAuthor } from "@/lib/types";

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

export function ReportsReviewList({
  reports: initialReports,
  managers,
  currentUserId,
}: {
  reports: WeeklyReportWithAuthor[];
  managers: Profile[];
  currentUserId: string;
}) {
  const [reports, setReports] = useState(initialReports);
  const [statusFilter, setStatusFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [selected, setSelected] = useState<WeeklyReportWithAuthor | null>(null);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (managerFilter && r.author_id !== managerFilter) return false;
      return true;
    });
  }, [reports, statusFilter, managerFilter]);

  function handleReviewed(updated: WeeklyReportWithAuthor) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(null);
  }

  const columns: DataTableColumn<WeeklyReportWithAuthor>[] = [
    {
      key: "manager",
      header: "Менеджер",
      accessor: (r) => (
        <button
          type="button"
          onClick={() => setSelected(r)}
          className="text-left font-medium text-info hover:underline"
        >
          {r.author?.full_name ?? "—"}
        </button>
      ),
      sortValue: (r) => r.author?.full_name ?? "",
    },
    {
      key: "week",
      header: "Тиждень",
      accessor: (r) => formatDate(r.week_start),
      sortValue: (r) => r.week_start,
    },
    {
      key: "submitted_at",
      header: "Дата відправки",
      accessor: (r) => (r.submitted_at ? formatDateTime(r.submitted_at) : "—"),
      sortValue: (r) => r.submitted_at ?? "",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (r) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      sortValue: (r) => r.status,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Усі статуси</option>
          <option value="draft">Чернетка</option>
          <option value="submitted">Надіслано</option>
          <option value="approved">Прийнято</option>
          <option value="returned">Повернено на доопрацювання</option>
        </Select>
        <Select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
          <option value="">Усі менеджери</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? "Без імені"}
            </option>
          ))}
        </Select>
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} />

      <ReportDetailModal
        report={selected}
        currentUserId={currentUserId}
        onClose={() => setSelected(null)}
        onReviewed={handleReviewed}
      />
    </div>
  );
}
