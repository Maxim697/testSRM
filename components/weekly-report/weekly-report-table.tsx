"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { WeeklyAggregate } from "@/lib/weekly-metrics";
import type { WeeklyReportComment } from "@/lib/types";

type MetricRow = {
  key: string;
  label: string;
  value: string;
  delta: string | null;
  deltaDirection: "up" | "down" | "flat" | null;
  live?: boolean;
};

function deltaInfo(
  current: number,
  previous: number | undefined,
  suffix = "",
): { text: string | null; direction: "up" | "down" | "flat" | null } {
  if (previous === undefined) return { text: null, direction: null };
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return { text: "0" + suffix, direction: "flat" };
  const direction: "up" | "down" = diff > 0 ? "up" : "down";
  return { text: `${diff > 0 ? "+" : ""}${diff}${suffix}`, direction };
}

function CommentCell({
  weekStart,
  metricKey,
  initialValue,
  currentUserId,
}: {
  weekStart: string;
  metricKey: string;
  initialValue: string;
  currentUserId: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("weekly_report_comments")
      .upsert(
        { week_start: weekStart, metric_key: metricKey, comment: value, author_id: currentUserId },
        { onConflict: "week_start,metric_key" },
      );
    setSaving(false);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2000);
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

export function WeeklyReportTable({
  weeks,
  liveMetrics,
  comments,
  currentUserId,
}: {
  weeks: WeeklyAggregate[];
  liveMetrics: { overdueTasksCount: number; noContactCount: number };
  comments: WeeklyReportComment[];
  currentUserId: string;
}) {
  const [weekIndex, setWeekIndex] = useState(weeks.length - 1);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  const week = weeks[weekIndex]!;
  const prevWeek = weekIndex > 0 ? weeks[weekIndex - 1] : undefined;

  const commentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of comments) {
      if (c.week_start === week.weekStart) map.set(c.metric_key, c.comment ?? "");
    }
    return map;
  }, [comments, week.weekStart]);

  const rows: MetricRow[] = useMemo(() => {
    const activeDelta = deltaInfo(week.activeCount, prevWeek?.activeCount);
    const turnoverDelta = deltaInfo(week.turnoverTotal, prevWeek?.turnoverTotal);
    const crDelta = deltaInfo(week.crAvg, prevWeek?.crAvg, "пп");
    const scoreDelta = deltaInfo(week.scoreAvg, prevWeek?.scoreAvg);
    const greenDelta = deltaInfo(week.greenCount, prevWeek?.greenCount);
    const amberDelta = deltaInfo(week.amberCount, prevWeek?.amberCount);
    const redDelta = deltaInfo(week.redCount, prevWeek?.redCount);

    return [
      {
        key: "active_traders",
        label: "Середня кількість активних трейдерів / день",
        value: week.activeCount.toString(),
        delta: activeDelta.text,
        deltaDirection: activeDelta.direction,
      },
      {
        key: "turnover",
        label: "Сумарний оборот за тиждень",
        value: formatNumber(week.turnoverTotal),
        delta: turnoverDelta.text,
        deltaDirection: turnoverDelta.direction,
      },
      {
        key: "cr",
        label: "Середній CR за тиждень",
        value: formatPercent(week.crAvg, 1),
        delta: crDelta.text,
        deltaDirection: crDelta.direction,
      },
      {
        key: "score",
        label: "Середній score по портфелю",
        value: week.scoreAvg.toString(),
        delta: scoreDelta.text,
        deltaDirection: scoreDelta.direction,
      },
      {
        key: "green",
        label: "Кількість трейдерів у статусі Green",
        value: week.greenCount.toString(),
        delta: greenDelta.text,
        deltaDirection: greenDelta.direction,
      },
      {
        key: "amber",
        label: "Кількість трейдерів у статусі Amber",
        value: week.amberCount.toString(),
        delta: amberDelta.text,
        deltaDirection: amberDelta.direction,
      },
      {
        key: "red",
        label: "Кількість трейдерів у статусі Red",
        value: week.redCount.toString(),
        delta: redDelta.text,
        deltaDirection: redDelta.direction,
      },
      {
        key: "no_contact_5d",
        label: "Кількість трейдерів без контакту 5+ днів",
        value: liveMetrics.noContactCount.toString(),
        delta: null,
        deltaDirection: null,
        live: true,
      },
      {
        key: "overdue_tasks",
        label: "Кількість прострочених завдань",
        value: liveMetrics.overdueTasksCount.toString(),
        delta: null,
        deltaDirection: null,
        live: true,
      },
    ];
  }, [week, prevWeek, liveMetrics]);

  const columns: DataTableColumn<MetricRow>[] = [
    {
      key: "label",
      header: "Показник",
      accessor: (r) => (
        <span>
          {r.label}
          {r.live && <span className="ml-1.5 text-xs text-text-muted">(поточні дані)</span>}
        </span>
      ),
    },
    {
      key: "value",
      header: "Значення",
      accessor: (r) => <span className="tabular-nums font-medium">{r.value}</span>,
      align: "right",
    },
    {
      key: "delta",
      header: "Δ значення",
      accessor: (r) => (
        <span
          className={cn(
            "tabular-nums",
            r.deltaDirection === "up" && "text-positive",
            r.deltaDirection === "down" && "text-negative",
            (r.deltaDirection === "flat" || r.deltaDirection === null) && "text-text-muted",
          )}
        >
          {r.delta ?? "—"}
        </span>
      ),
      align: "right",
    },
    {
      key: "comment",
      header: "Коментар (причини росту/падіння)",
      accessor: (r) => (
        <CommentCell
          weekStart={week.weekStart}
          metricKey={r.key}
          initialValue={commentMap.get(r.key) ?? ""}
          currentUserId={currentUserId}
        />
      ),
      width: "320px",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Card className="flex items-end justify-between gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Тиждень</label>
          <Select
            value={weekIndex}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
            className="max-w-xs"
          >
            {weeks.map((w, i) => (
              <option key={w.weekStart} value={i}>
                {formatDate(w.weekStart)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="secondary"
            onClick={() => setDraftMessage("Функція в розробці — збір чернетки через Claude з'явиться пізніше.")}
          >
            Зібрати чернетку через Claude
          </Button>
          {draftMessage && <p className="text-xs text-text-muted">{draftMessage}</p>}
        </div>
      </Card>

      <DataTable key={week.weekStart} columns={columns} data={rows} rowKey={(r) => r.key} />
    </div>
  );
}
