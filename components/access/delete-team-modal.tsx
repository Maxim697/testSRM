"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import type { Profile, Team } from "@/lib/types";

export function DeleteTeamModal({
  team,
  managerCount,
  lead,
  currentUserId,
  onClose,
  onDeleted,
}: {
  team: Team | null;
  /** How many managers currently belong to this team — deleting is
   * blocked while this is > 0; they have to be moved out first. */
  managerCount: number;
  lead: Profile | null;
  currentUserId: string;
  onClose: () => void;
  onDeleted: (teamId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = managerCount > 0;

  async function handleConfirm() {
    if (!team || blocked) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("teams").delete().eq("id", team.id);
    setDeleting(false);

    if (deleteError) {
      setError("Не вдалося видалити команду. Спробуйте ще раз.");
      return;
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TEAM_DELETED,
      entityType: "team",
      entityId: team.id,
      entityLabel: team.name,
      oldValue: lead ? `Тімлід: ${lead.full_name ?? "—"}` : "Без тімліда",
    });

    onDeleted(team.id);
    onClose();
  }

  return (
    <Modal open={!!team} onClose={onClose} title="Видалити команду?">
      {team && (
        <div className="flex flex-col gap-3">
          {blocked ? (
            <p className="text-sm text-negative">
              У команді «{team.name}» ще є {managerCount}{" "}
              {managerCount === 1 ? "менеджер" : "менеджерів"}. Спочатку перемістіть їх в іншу команду.
            </p>
          ) : (
            <>
              <p className="text-base text-text-secondary">
                Видалити команду <span className="font-medium text-text-primary">{team.name}</span>? Цю дію не можна
                скасувати.
              </p>
              {lead && (
                <p className="text-sm text-warning">
                  Тімлід {lead.full_name ?? "—"} залишиться без команди.
                </p>
              )}
            </>
          )}
          {error && <p className="text-sm text-negative">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {blocked ? "Закрити" : "Скасувати"}
            </Button>
            {!blocked && (
              <Button variant="primary" disabled={deleting} onClick={handleConfirm}>
                {deleting ? "Видалення…" : "Видалити"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
