"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon } from "@/components/ui/empty-icons";
import { formatDateTime } from "@/lib/format";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_TYPE_LABELS, type AuditEntityType } from "@/lib/audit-log";
import type { AuditLogWithActor, Profile } from "@/lib/types";

function toCsvValue(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function exportToCsv(rows: AuditLogWithActor[]) {
  const header = ["Дата і час", "Хто", "Дія", "Тип об'єкта", "Об'єкт", "Було", "Стало"];
  const lines = rows.map((r) =>
    [
      formatDateTime(r.created_at),
      r.actor?.full_name ?? "—",
      AUDIT_ACTION_LABELS[r.action] ?? r.action,
      AUDIT_ENTITY_TYPE_LABELS[r.entity_type],
      r.entity_label ?? "—",
      r.old_value ?? "",
      r.new_value ?? "",
    ]
      .map(toCsvValue)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AuditLogTable({ logs, users }: { logs: AuditLogWithActor[]; users: Profile[] }) {
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<AuditEntityType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const actionsInUse = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (userFilter && l.actor_id !== userFilter) return false;
      if (actionFilter && l.action !== actionFilter) return false;
      if (entityTypeFilter && l.entity_type !== entityTypeFilter) return false;
      if (dateFrom && l.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && l.created_at.slice(0, 10) > dateTo) return false;
      if (search && !(l.entity_label ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, userFilter, actionFilter, entityTypeFilter, dateFrom, dateTo, search]);

  const columns: DataTableColumn<AuditLogWithActor>[] = [
    {
      key: "created_at",
      header: "Дата і час",
      accessor: (l) => formatDateTime(l.created_at),
      sortValue: (l) => l.created_at,
    },
    {
      key: "actor",
      header: "Хто",
      accessor: (l) => l.actor?.full_name ?? "—",
      sortValue: (l) => l.actor?.full_name ?? "",
    },
    {
      key: "action",
      header: "Дія",
      accessor: (l) => AUDIT_ACTION_LABELS[l.action] ?? l.action,
      sortValue: (l) => l.action,
    },
    {
      key: "entity",
      header: "Об'єкт",
      accessor: (l) => (
        <span>
          <span className="text-text-muted">{AUDIT_ENTITY_TYPE_LABELS[l.entity_type]}:</span>{" "}
          {l.entity_label ?? "—"}
        </span>
      ),
      sortValue: (l) => l.entity_label ?? "",
    },
    {
      key: "old_value",
      header: "Було",
      accessor: (l) => <span className="text-text-secondary">{l.old_value ?? "—"}</span>,
    },
    {
      key: "new_value",
      header: "Стало",
      accessor: (l) => <span className="text-text-primary">{l.new_value ?? "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid grid-cols-6 gap-3">
        <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="">Усі користувачі</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? "Без імені"}
            </option>
          ))}
        </Select>
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">Усі дії</option>
          {actionsInUse.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </Select>
        <Select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value as AuditEntityType | "")}>
          <option value="">Усі типи об&apos;єктів</option>
          {(Object.entries(AUDIT_ENTITY_TYPE_LABELS) as [AuditEntityType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Input placeholder="Пошук за об'єктом" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => exportToCsv(filtered)} disabled={filtered.length === 0}>
          Експорт у CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        logs.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="Історія змін порожня"
            description="Тут з'являться дії користувачів у системі."
          />
        ) : (
          <EmptyState title="Нічого не знайдено" description="Немає записів за обраними фільтрами." />
        )
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(l) => l.id} />
      )}
    </div>
  );
}
