"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { roleLabel, type Role } from "@/lib/roles";

type Level = "none" | "view" | "edit" | "manage";

const LEVEL_LABELS: Record<Level, string> = {
  none: "—",
  view: "Перегляд",
  edit: "Редагування",
  manage: "Управління",
};
const LEVEL_BADGE: Record<Level, "neutral" | "amber" | "green"> = {
  none: "neutral",
  view: "neutral",
  edit: "amber",
  manage: "green",
};

const SECTIONS = [
  "Trader Detailed",
  "Scoreboard",
  "Weekly KPI",
  "Мій день",
  "Портфель",
  "Churn / Ризик",
  "Тижневий звіт",
  "Новини",
  "Створити дашборд",
  "Доступи",
] as const;

const MATRIX: Record<Role, Level[]> = {
  manager: ["view", "view", "view", "edit", "edit", "edit", "edit", "view", "view", "none"],
  lead: ["edit", "edit", "edit", "edit", "edit", "edit", "edit", "manage", "edit", "view"],
  admin: ["manage", "manage", "manage", "manage", "manage", "manage", "manage", "manage", "manage", "manage"],
};

type Row = { role: Role };

const DATA_VISIBILITY: Record<Role, string> = {
  manager: "Тільки свій портфель",
  lead: "Вся команда",
  admin: "Всі команди",
};

export function AccessMatrix() {
  const rows: Row[] = [{ role: "manager" }, { role: "lead" }, { role: "admin" }];

  const columns: DataTableColumn<Row>[] = [
    {
      key: "role",
      header: "Роль",
      accessor: (r) => <span className="font-medium text-text-primary">{roleLabel(r.role)}</span>,
    },
    ...SECTIONS.map((section, i): DataTableColumn<Row> => ({
      key: section,
      header: section,
      accessor: (r) => {
        const level = MATRIX[r.role][i]!;
        return <Badge variant={LEVEL_BADGE[level]}>{LEVEL_LABELS[level]}</Badge>;
      },
    })),
  ];

  const visibilityColumns: DataTableColumn<Row>[] = [
    {
      key: "role",
      header: "Роль",
      accessor: (r) => <span className="font-medium text-text-primary">{roleLabel(r.role)}</span>,
    },
    {
      key: "visibility",
      header: "Видимість даних",
      accessor: (r) => <span className="text-text-primary">{DATA_VISIBILITY[r.role]}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable columns={columns} data={rows} rowKey={(r) => r.role} />
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-primary">Видимість даних по ролях</h3>
        <DataTable columns={visibilityColumns} data={rows} rowKey={(r) => r.role} />
      </div>
    </div>
  );
}
