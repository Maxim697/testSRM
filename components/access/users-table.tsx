"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { CreateUserModal } from "@/components/access/create-user-modal";
import { createClient } from "@/lib/supabase/client";
import { getInitials, roleLabel, type Role } from "@/lib/roles";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { cn } from "@/lib/utils";
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
  const [creating, setCreating] = useState(false);
  const [togglingUser, setTogglingUser] = useState<Profile | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === "admin" && u.is_active).length,
    [users],
  );
  const canManageRoles = currentUserRole === "admin";
  const canManageUsers = currentUserRole === "admin";

  function openEdit(user: Profile) {
    setEditing(user);
    setNewRole(user.role);
    setError(null);
  }

  async function handleSave() {
    if (!editing) return;

    if (editing.id === currentUserId && newRole !== "admin" && activeAdminCount <= 1) {
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

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      entityType: "profile",
      entityId: editing.id,
      entityLabel: editing.full_name ?? "Без імені",
      oldValue: roleLabel(editing.role),
      newValue: roleLabel(newRole),
    });

    setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, role: newRole } : u)));
    setEditing(null);
  }

  function openToggle(user: Profile) {
    setToggleError(null);
    if (user.is_active) {
      if (user.id === currentUserId) {
        setToggleError("Не можна деактивувати самого себе.");
        setTogglingUser(user);
        return;
      }
      if (user.role === "admin" && activeAdminCount <= 1) {
        setToggleError("Не можна деактивувати останнього активного адміністратора.");
        setTogglingUser(user);
        return;
      }
    }
    setTogglingUser(user);
  }

  async function handleConfirmToggle() {
    if (!togglingUser || toggleError) return;
    const nextActive = !togglingUser.is_active;
    setToggling(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", togglingUser.id);
    setToggling(false);

    if (updateError) {
      setToggleError("Не вдалося зберегти зміну. Спробуйте ще раз.");
      return;
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: nextActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
      entityType: "profile",
      entityId: togglingUser.id,
      entityLabel: togglingUser.full_name ?? "Без імені",
      oldValue: togglingUser.is_active ? "Активний" : "Неактивний",
      newValue: nextActive ? "Активний" : "Неактивний",
    });

    setUsers((prev) => prev.map((u) => (u.id === togglingUser.id ? { ...u, is_active: nextActive } : u)));
    setTogglingUser(null);
  }

  const columns: DataTableColumn<Profile>[] = [
    {
      key: "name",
      header: "Користувач",
      accessor: (u) => (
        <div className={cn("flex items-center gap-2.5", !u.is_active && "opacity-50")}>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-text-primary">
            {getInitials(u.full_name)}
          </div>
          <span className="text-text-primary">{u.full_name ?? "Без імені"}</span>
          {!u.is_active && <Badge variant="neutral">Неактивний</Badge>}
        </div>
      ),
      sortValue: (u) => u.full_name ?? "",
    },
    {
      key: "telegram",
      header: "Telegram",
      accessor: (u) => <span className={cn(!u.is_active && "opacity-50")}>{u.telegram ?? "—"}</span>,
    },
    {
      key: "role",
      header: "Роль",
      accessor: (u) => (
        <span className={cn(!u.is_active && "opacity-50")}>
          <Badge variant="neutral">{roleLabel(u.role)}</Badge>
        </span>
      ),
      sortValue: (u) => u.role,
    },
    {
      key: "traders",
      header: "Трейдерів у портфелі",
      accessor: (u) =>
        u.role === "manager" ? (
          <span className={cn("tabular-nums", !u.is_active && "opacity-50")}>{traderCounts[u.id] ?? 0}</span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
      align: "right",
    },
    ...(canManageRoles || canManageUsers
      ? [
          {
            key: "actions",
            header: "",
            accessor: (u: Profile) => (
              <div className="flex justify-end gap-1.5">
                {canManageRoles && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(u)}>
                    Змінити роль
                  </Button>
                )}
                {canManageUsers && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openToggle(u)}>
                    {u.is_active ? "Деактивувати" : "Активувати"}
                  </Button>
                )}
              </div>
            ),
            align: "right" as const,
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-medium text-text-primary">Користувачі</h2>
        {currentUserRole === "admin" && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            Додати користувача
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        rowClassName={(u) => (!u.is_active ? "opacity-60" : undefined)}
      />

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

      <Modal
        open={!!togglingUser}
        onClose={() => setTogglingUser(null)}
        title={togglingUser?.is_active ? "Деактивувати користувача?" : "Активувати користувача?"}
      >
        {togglingUser && (
          <div className="flex flex-col gap-3">
            {toggleError ? (
              <p className="text-sm text-negative">{toggleError}</p>
            ) : (
              <p className="text-base text-text-secondary">
                {togglingUser.is_active ? (
                  <>
                    <span className="font-medium text-text-primary">{togglingUser.full_name ?? "Цей користувач"}</span>{" "}
                    втратить доступ до системи. Дані та історія дій зберігаються.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-text-primary">{togglingUser.full_name ?? "Цей користувач"}</span>{" "}
                    знову отримає доступ до системи.
                  </>
                )}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTogglingUser(null)}>
                Скасувати
              </Button>
              <Button
                variant="primary"
                disabled={toggling || !!toggleError}
                onClick={handleConfirmToggle}
              >
                {toggling ? "Збереження…" : togglingUser.is_active ? "Деактивувати" : "Активувати"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(user) => setUsers((prev) => [...prev, user])}
      />
    </div>
  );
}
