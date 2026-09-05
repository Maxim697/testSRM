"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { AUDIT_ACTION_LABELS } from "@/lib/audit-log";
import type { AuditLogWithActor } from "@/lib/types";

export function AuditHistoryTab({ traderId }: { traderId: string }) {
  const [rows, setRows] = useState<AuditLogWithActor[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads this trader's audit trail once on mount / when the trader changes
    setRows(null);
    supabase
      .from("audit_log")
      .select("*, actor:profiles(full_name)")
      .eq("entity_type", "trader")
      .eq("entity_id", traderId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as unknown as AuditLogWithActor[]));
  }, [traderId]);

  const columns: DataTableColumn<AuditLogWithActor>[] = [
    {
      key: "created_at",
      header: "Дата і час",
      accessor: (r) => formatDateTime(r.created_at),
      sortValue: (r) => r.created_at,
    },
    { key: "actor", header: "Хто", accessor: (r) => r.actor?.full_name ?? "—" },
    { key: "action", header: "Дія", accessor: (r) => AUDIT_ACTION_LABELS[r.action] ?? r.action },
    { key: "old_value", header: "Було", accessor: (r) => r.old_value ?? "—" },
    { key: "new_value", header: "Стало", accessor: (r) => r.new_value ?? "—" },
  ];

  if (rows === null) return <p className="text-sm text-text-muted">Завантаження…</p>;

  return rows.length === 0 ? (
    <EmptyState title="Історія змін порожня" description="Змін по цьому трейдеру ще не зафіксовано." />
  ) : (
    <DataTable columns={columns} data={rows} rowKey={(r) => r.id} />
  );
}
