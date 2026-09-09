"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { createNotification, NOTIFICATION_KINDS } from "@/lib/notifications";
import type { Profile, Team } from "@/lib/types";

/** Moves a manager from their current team to another. Traders keep their
 * manager_id — only the manager's own team_id changes — but that alone
 * is enough to move their whole portfolio's visibility, since RLS scopes
 * a lead to their team by looking at the manager's team_id, not by any
 * per-trader team column. */
export function MoveManagerModal({
  manager,
  teams,
  fixedToTeamId,
  currentUserId,
  traderCount,
  onClose,
  onMoved,
}: {
  manager: Profile | null;
  teams: Team[];
  /** Set when opened from a team block's "Додати менеджера" flow — the
   * destination is already decided, so no picker is shown. */
  fixedToTeamId?: string;
  currentUserId: string;
  traderCount: number;
  onClose: () => void;
  onMoved: (managerId: string, toTeamId: string) => void;
}) {
  const [toTeamId, setToTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the destination picker whenever a different manager (or fixed destination) is opened, not mirroring a prop continuously
    setToTeamId(fixedToTeamId ?? "");
    setError(null);
  }, [manager, fixedToTeamId]);

  if (!manager) return null;

  const fromTeam = teams.find((t) => t.id === manager.team_id) ?? null;
  const toTeam = teams.find((t) => t.id === toTeamId) ?? null;
  const candidateTeams = teams.filter((t) => t.id !== manager.team_id);

  async function handleConfirm() {
    if (!manager || !toTeamId) {
      setError("Оберіть команду призначення.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ team_id: toTeamId }).eq("id", manager.id);
    setSaving(false);

    if (updateError) {
      setError("Не вдалося перемістити менеджера. Спробуйте ще раз.");
      return;
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TEAM_MEMBER_MOVED,
      entityType: "profile",
      entityId: manager.id,
      entityLabel: manager.full_name ?? "Без імені",
      oldValue: fromTeam?.name ?? "Без команди",
      newValue: toTeam?.name ?? "—",
    });

    const notifyTargets: Promise<void>[] = [];
    if (toTeam?.lead_id && toTeam.lead_id !== currentUserId) {
      notifyTargets.push(
        createNotification(supabase, {
          userId: toTeam.lead_id,
          kind: NOTIFICATION_KINDS.TEAM_CHANGED,
          title: "Новий менеджер у команді",
          body: `${manager.full_name ?? "Менеджер"} приєднався до команди «${toTeam.name}» разом з ${traderCount} трейдерами.`,
          link: "/my-team",
        }),
      );
    }
    if (fromTeam?.lead_id && fromTeam.lead_id !== currentUserId && fromTeam.lead_id !== toTeam?.lead_id) {
      notifyTargets.push(
        createNotification(supabase, {
          userId: fromTeam.lead_id,
          kind: NOTIFICATION_KINDS.TEAM_CHANGED,
          title: "Менеджер покинув команду",
          body: `${manager.full_name ?? "Менеджер"} переведений до команди «${toTeam?.name ?? "—"}».`,
          link: "/my-team",
        }),
      );
    }
    await Promise.all(notifyTargets);

    onMoved(manager.id, toTeamId);
    onClose();
  }

  return (
    <Modal open={!!manager} onClose={onClose} title="Перемістити в іншу команду">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-base">
          <span className="text-text-secondary">{fromTeam?.name ?? "Без команди"}</span>
          <span className="text-text-muted">→</span>
          {fixedToTeamId ? (
            <span className="font-medium text-text-primary">{toTeam?.name ?? "—"}</span>
          ) : (
            <div className="min-w-[200px]">
              <Select value={toTeamId} onChange={(e) => setToTeamId(e.target.value)}>
                <option value="" disabled>
                  Оберіть команду
                </option>
                {candidateTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="rounded-control border border-border bg-surface-1 p-2.5">
          <div className="text-xs text-text-secondary">Трейдерів у портфелі менеджера</div>
          <div className="text-lg font-semibold tabular-nums text-text-primary">{traderCount}</div>
        </div>

        {traderCount > 0 && (
          <p className="text-sm text-warning">
            Трейдери менеджера {manager.full_name ?? ""} перейдуть разом з ним і стануть видні тімліду команди
            «{toTeam?.name ?? "—"}».
          </p>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Скасувати
          </Button>
          <Button variant="primary" disabled={saving || !toTeamId} onClick={handleConfirm}>
            {saving ? "Переміщення…" : "Перемістити"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
