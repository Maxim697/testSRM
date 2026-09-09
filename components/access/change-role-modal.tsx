"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { roleLabel, type Role } from "@/lib/roles";
import type { Profile, Team } from "@/lib/types";

/** Role changes reachable from a free-standing role dropdown are scoped
 * to admins only — a manager becoming a lead, or a lead being replaced,
 * always goes through the structured team flows (Створити команду /
 * Змінити тімліда) instead, so team_id and teams.lead_id never drift out
 * of sync with profiles.role. This modal only ever moves an admin to a
 * different role (or, symmetrically, promotes someone straight to admin —
 * admins carry no team either way, so there's nothing to keep in sync). */
export function ChangeRoleModal({
  user,
  teams,
  currentUserId,
  activeAdminCount,
  onClose,
  onChanged,
}: {
  user: Profile | null;
  teams: Team[];
  currentUserId: string;
  activeAdminCount: number;
  onClose: () => void;
  onChanged: (userId: string, role: Role, teamId: string | null) => void;
}) {
  const [role, setRole] = useState<Role>("admin");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This component stays mounted across different targets (the parent
  // just swaps `user`), so local state needs an explicit reset to the
  // newly-targeted user's own role each time — otherwise it would carry
  // over whatever the previous user's in-progress edit left behind.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the editor to a freshly-opened user's own current role, not mirroring a prop continuously
    setRole(user.role);
    setTeamId("");
    setError(null);
  }, [user]);

  function handleOpenRole(next: Role) {
    setRole(next);
    setTeamId("");
    setError(null);
  }

  async function handleSave() {
    if (!user) return;
    if (user.role === "admin" && role !== "admin" && activeAdminCount <= 1) {
      setError("Це останній адміністратор. Спочатку призначте роль admin іншому користувачу.");
      return;
    }
    if (role === "manager" && !teamId) {
      setError("Для менеджера обов'язково оберіть команду.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const nextTeamId = role === "manager" ? teamId : null;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role, team_id: nextTeamId })
      .eq("id", user.id);
    setSaving(false);

    if (updateError) {
      setError("Не вдалося зберегти роль. Спробуйте ще раз.");
      return;
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      entityType: "profile",
      entityId: user.id,
      entityLabel: user.full_name ?? "Без імені",
      oldValue: roleLabel(user.role),
      newValue: roleLabel(role),
    });

    onChanged(user.id, role, nextTeamId);
    onClose();
  }

  return (
    <Modal open={!!user} onClose={onClose} title="Змінити роль">
      {user && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-text-secondary">Користувач</div>
            <div className="text-base text-text-primary">{user.full_name ?? "Без імені"}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Поточна роль</div>
            <div className="text-base text-text-primary">{roleLabel(user.role)}</div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Нова роль</label>
            <Select value={role} onChange={(e) => handleOpenRole(e.target.value as Role)}>
              <option value="manager">Менеджер</option>
              <option value="lead">Керівник відділу</option>
              <option value="admin">Адміністратор</option>
            </Select>
          </div>
          {role === "manager" && (
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">
                Команда<span className="text-negative"> *</span>
              </label>
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="" disabled>
                  Оберіть команду
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {role === "lead" && (
            <p className="text-sm text-text-muted">
              Стане тімлідом без команди — призначте команду для нього у вкладці «Структура».
            </p>
          )}
          {error && <p className="text-sm text-negative">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Скасувати
            </Button>
            <Button variant="primary" disabled={saving} onClick={handleSave}>
              {saving ? "Збереження…" : "Зберегти"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
