"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { CommentCell } from "@/components/weekly-report/comment-cell";
import { MetricDrilldownModal, type DrilldownItem } from "@/components/weekly-report/metric-drilldown-modal";
import { METRIC_SOURCES } from "@/lib/weekly-report-constants";
import { cn } from "@/lib/utils";
import type { WeeklyReportRow } from "@/lib/types";

export function MetricTable({
  rows,
  drilldown,
  editable,
  showDelta = true,
  suggestions,
  handledKeys,
  applyAllSignal,
  onSuggestionHandled,
}: {
  rows: WeeklyReportRow[];
  drilldown: Record<string, DrilldownItem[]>;
  editable: boolean;
  showDelta?: boolean;
  suggestions?: Record<string, string>;
  handledKeys?: Set<string>;
  applyAllSignal?: number;
  onSuggestionHandled?: (metricKey: string) => void;
}) {
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const openRow = rows.find((r) => r.metric_key === openMetric);

  const columns: DataTableColumn<WeeklyReportRow>[] = [
    {
      key: "label",
      header: "Показник",
      accessor: (r) => (
        <span className="flex items-center gap-1.5">
          {r.metric_label}
          {METRIC_SOURCES[r.metric_key] && <InfoTooltip text={METRIC_SOURCES[r.metric_key]!} />}
        </span>
      ),
    },
    {
      key: "value",
      header: "Значення",
      accessor: (r) => (
        <button
          type="button"
          onClick={() => setOpenMetric(r.metric_key)}
          className="tabular-nums font-medium text-info hover:underline"
        >
          {r.value ?? "—"}
        </button>
      ),
      align: "right",
    },
    ...(showDelta
      ? [
          {
            key: "delta",
            header: "Δ значення",
            accessor: (r: WeeklyReportRow) => {
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
            align: "right" as const,
          },
        ]
      : []),
    {
      key: "comment",
      header: "Коментар (причини росту/падіння)",
      accessor: (r) => (
        <CommentCell
          table="weekly_report_rows"
          rowId={r.id}
          initialValue={r.comment ?? ""}
          editable={editable}
          placeholder="Причина зростання/падіння..."
          suggestion={handledKeys?.has(r.metric_key) ? undefined : suggestions?.[r.metric_key]}
          applyAllSignal={applyAllSignal}
          onSuggestionHandled={() => onSuggestionHandled?.(r.metric_key)}
        />
      ),
      width: "320px",
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} />
      <MetricDrilldownModal
        open={!!openMetric}
        onClose={() => setOpenMetric(null)}
        title={openRow?.metric_label ?? ""}
        items={openMetric ? drilldown[openMetric] ?? [] : []}
      />
    </>
  );
}
