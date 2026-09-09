"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import type { Team } from "@/lib/types";

export function RenameTeamModal({
  team,
  currentUserId,
  onClose,
  onRenamed,
}: {
  team: Team | null;
  currentUserId: string;
  onClose: () => void;
  onRenamed: (teamId: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the editor from a freshly-opened team's own current name
    setName(team.name);
    setError(null);
  }, [team]);

  async function handleSave() {
    if (!team) return;
    if (!name.trim()) {
      setError("Вкажіть назву команди.");
      return;
    }
    if (name.trim() === team.name) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("teams").update({ name: name.trim() }).eq("id", team.id);
    setSaving(false);

    if (updateError) {
      setError("Не вдалося перейменувати команду. Спробуйте ще раз.");
      return;
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TEAM_RENAMED,
      entityType: "team",
      entityId: team.id,
      entityLabel: name.trim(),
      oldValue: team.name,
      newValue: name.trim(),
    });

    onRenamed(team.id, name.trim());
    onClose();
  }

  return (
    <Modal open={!!team} onClose={onClose} title="Перейменувати команду">
      {team && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Назва команди</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва команди" />
          </div>
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
