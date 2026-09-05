"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { getInitials, roleLabel, type Role } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export function UsersTable({
  users: initialUsers,
  traderCounts,
  currentUserId,
  currentUserRole,
}: {
  users: Profile[];
  traderCounts: Record<string, number>;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<Role>("manager");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);
  const canManageRoles = currentUserRole === "admin";

  function openEdit(user: Profile) {
    setEditing(user);
    setNewRole(user.role);
    setError(null);
  }

  async function handleSave() {
    if (!editing) return;

    if (editing.id === currentUserId && newRole !== "admin" && adminCount <= 1) {
      setError("Ви єдиний адміністратор. Спочатку призначте роль admin іншому користувачу.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", editing.id);
    setSaving(false);

    if (updateError) {
      setError("Не вдалося зберегти роль. Спробуйте ще раз.");
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, role: newRole } : u)));
    setEditing(null);
  }

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
    {
      key: "traders",
      header: "Трейдерів у портфелі",
      accessor: (u) =>
        u.role === "manager" ? (
          <span className="tabular-nums">{traderCounts[u.id] ?? 0}</span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
      align: "right",
    },
    ...(canManageRoles
      ? [
          {
            key: "actions",
            header: "",
            accessor: (u: Profile) => (
              <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(u)}>
                Змінити роль
              </Button>
            ),
            align: "right" as const,
          },
        ]
      : []),
  ];

  return (
    <div>
      <h2 className="mb-2 text-base font-medium text-text-primary">Користувачі</h2>
      <DataTable columns={columns} data={users} rowKey={(u) => u.id} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Змінити роль">
        {editing && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs text-text-secondary">Користувач</div>
              <div className="text-base text-text-primary">{editing.full_name ?? "Без імені"}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary">Поточна роль</div>
              <div className="text-base text-text-primary">{roleLabel(editing.role)}</div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">Нова роль</label>
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                <option value="manager">Менеджер</option>
                <option value="lead">Керівник відділу</option>
                <option value="admin">Адміністратор</option>
              </Select>
            </div>
            {error && <p className="text-sm text-negative">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Скасувати
              </Button>
              <Button variant="primary" disabled={saving} onClick={handleSave}>
                {saving ? "Збереження…" : "Зберегти"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
