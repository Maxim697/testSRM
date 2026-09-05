"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber } from "@/lib/format";
import type { EnrichedTrader } from "@/lib/trader-metrics";
import type { TraderStatus } from "@/lib/types";

const STATUS_LABELS: Record<TraderStatus, string> = { green: "Green", amber: "Amber", red: "Red" };
const STATUS_BADGE: Record<TraderStatus, "green" | "amber" | "red"> = {
  green: "green",
  amber: "amber",
  red: "red",
};

function CommentCell({ traderId, currentUserId }: { traderId: string; currentUserId: string }) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    if (!comment.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("interactions").insert({
      trader_id: traderId,
      author_id: currentUserId,
      kind: "note",
      body: comment.trim(),
    });
    setSaving(false);
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setComment("");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        placeholder={status === "saved" ? "Збережено" : status === "error" ? "Помилка збереження" : "Коментар..."}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className={cn("h-7 w-40", status === "error" && "border-negative")}
      />
      <Button
        variant="ghost"
        className="h-7 px-2 text-xs"
        disabled={saving || !comment.trim()}
        onClick={handleSave}
      >
        {saving ? "…" : "OK"}
      </Button>
    </div>
  );
}

export function InactiveTradersTable({
  traders,
  currentUserId,
}: {
  traders: EnrichedTrader[];
  currentUserId: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, TraderStatus>>(
    Object.fromEntries(traders.map((t) => [t.id, (t.status ?? "amber") as TraderStatus])),
  );

  async function handleStatusChange(traderId: string, status: TraderStatus, previous: TraderStatus) {
    setStatuses((prev) => ({ ...prev, [traderId]: status }));
    const supabase = createClient();
    const { error } = await supabase.from("traders").update({ status }).eq("id", traderId);
    if (error) {
      setStatuses((prev) => ({ ...prev, [traderId]: previous }));
    }
  }

  const columns: DataTableColumn<EnrichedTrader>[] = [
    {
      key: "code",
      header: "Trader",
      accessor: (t) => (
        <Link href={`/trader/${t.id}`} className="font-medium text-info hover:underline">
          {t.code}
        </Link>
      ),
      sortValue: (t) => t.code,
    },
    {
      key: "manager",
      header: "Менеджер",
      accessor: (t) => t.manager?.full_name ?? "—",
      sortValue: (t) => t.manager?.full_name ?? "",
    },
    {
      key: "last_active",
      header: "Останній актив",
      accessor: (t) => formatDate(t.last_active),
      sortValue: (t) => t.last_active ?? "",
    },
    {
      key: "days_inactive",
      header: "Днів неактивний",
      accessor: (t) => (
        <span className="tabular-nums text-negative font-medium">
          {t.daysSinceContact ?? "—"}
        </span>
      ),
      sortValue: (t) => t.daysSinceContact ?? 9999,
      align: "right",
    },
    {
      key: "deposit",
      header: "Депозит",
      accessor: (t) => <span className="tabular-nums">{formatNumber(t.deposit)}</span>,
      sortValue: (t) => t.deposit ?? 0,
      align: "right",
    },
    {
      key: "status",
      header: "Статус",
      accessor: (t) => (
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[statuses[t.id]]}>{STATUS_LABELS[statuses[t.id]]}</Badge>
          <Select
            value={statuses[t.id]}
            onChange={(e) =>
              handleStatusChange(t.id, e.target.value as TraderStatus, statuses[t.id])
            }
            className="w-24"
          >
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="red">Red</option>
          </Select>
        </div>
      ),
      sortValue: (t) => statuses[t.id],
    },
    {
      key: "comment",
      header: "Коментар",
      accessor: (t) => <CommentCell traderId={t.id} currentUserId={currentUserId} />,
    },
  ];

  return <DataTable columns={columns} data={traders} rowKey={(t) => t.id} />;
}
