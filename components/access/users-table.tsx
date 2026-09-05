"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { getInitials, roleLabel } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export function UsersTable({ users }: { users: Profile[] }) {
  const columns: DataTableColumn<Profile>[] = [
    {
      key: "name",
      header: "Користувач",
      accessor: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-text-primary">
            {getInitials(u.full_name)}
          </div>
          <span className="text-text-primary">{u.full_name ?? "Без імені"}</span>
        </div>
      ),
      sortValue: (u) => u.full_name ?? "",
    },
    {
      key: "telegram",
      header: "Telegram",
      accessor: (u) => u.telegram ?? "—",
    },
    {
      key: "role",
      header: "Роль",
      accessor: (u) => <Badge variant="neutral">{roleLabel(u.role)}</Badge>,
      sortValue: (u) => u.role,
    },
  ];

  return (
    <div>
      <h2 className="mb-2 text-base font-medium text-text-primary">Користувачі</h2>
      <DataTable columns={columns} data={users} rowKey={(u) => u.id} />
    </div>
  );
}
