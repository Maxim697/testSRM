"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile, Team } from "@/lib/types";

function teamNameFor(manager: Profile, teams: Team[]): string {
  const team = teams.find((t) => t.id === manager.team_id);
  return team ? team.name : "без команди";
}

/** First step of "Додати менеджера в команду": just picks which manager,
 * from everyone NOT already on this team. Confirming here hands off to
 * MoveManagerModal (fixedToTeamId = this team) for the actual move, so
 * both entry points share one confirmation/warning/audit/notify path. */
export function AddManagerModal({
  team,
  candidates,
  teams,
  onClose,
  onPick,
}: {
  team: Team | null;
  candidates: Profile[];
  teams: Team[];
  onClose: () => void;
  onPick: (manager: Profile) => void;
}) {
  const [managerId, setManagerId] = useState("");

  function handleClose() {
    setManagerId("");
    onClose();
  }

  function handleNext() {
    const manager = candidates.find((m) => m.id === managerId);
    if (!manager) return;
    setManagerId("");
    onPick(manager);
  }

  return (
    <Modal open={!!team} onClose={handleClose} title={`Додати менеджера в «${team?.name ?? ""}»`}>
      <div className="flex flex-col gap-3">
        {candidates.length === 0 ? (
          <EmptyState
            className="border-none py-8"
            title="Немає кого додати"
            description="Усі менеджери вже належать до цієї команди."
          />
        ) : (
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Менеджер</label>
            <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="" disabled>
                Оберіть менеджера
              </option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? "Без імені"} ({teamNameFor(m, teams)})
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Скасувати
          </Button>
          {candidates.length > 0 && (
            <Button variant="primary" disabled={!managerId} onClick={handleNext}>
              Далі
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
