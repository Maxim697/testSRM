"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { createNotification, NOTIFICATION_KINDS } from "@/lib/notifications";
import type { Profile, Team } from "@/lib/types";

const KEEP_IN_TEAM = "__keep__";

export function ChangeLeadModal({
  team,
  currentLead,
  teamManagers,
  freeLeads,
  otherTeams,
  currentUserId,
  onClose,
  onChanged,
}: {
  team: Team | null;
  currentLead: Profile | null;
  /** Managers already on this team — picking one promotes them in place. */
  teamManagers: Profile[];
  /** Leads with no team of their own — picking one moves them here. */
  freeLeads: Profile[];
  /** Every other team — offered as a destination for the outgoing lead
   * (demoted to manager) instead of staying on this team. */
  otherTeams: Team[];
  currentUserId: string;
  onClose: () => void;
  onChanged: (result: {
    teamId: string;
    newLeadId: string;
    newLeadWasManager: boolean;
    oldLeadId: string | null;
    oldLeadDestinationTeamId: string | null;
  }) => void;
}) {
  const [newLeadId, setNewLeadId] = useState("");
  const [oldLeadDestination, setOldLeadDestination] = useState(KEEP_IN_TEAM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the editor whenever a different team is targeted, not mirroring a prop continuously
    setNewLeadId("");
    setOldLeadDestination(KEEP_IN_TEAM);
    setError(null);
  }, [team]);

  if (!team) return null;

  const newLeadIsManager = teamManagers.some((m) => m.id === newLeadId);
  const showOldLeadChoice = !!currentLead && newLeadId !== "" && newLeadId !== currentLead.id;

  async function handleConfirm() {
    if (!team || !newLeadId) {
      setError("Оберіть нового тімліда.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    // 1. The new lead: a manager of this team gets promoted in place
    // (team_id already correct); a free lead from elsewhere gets moved
    // in (role already 'lead').
    const newLeadProfile = teamManagers.find((m) => m.id === newLeadId) ?? freeLeads.find((l) => l.id === newLeadId);
    const { error: newLeadError } = await supabase
      .from("profiles")
      .update(newLeadIsManager ? { role: "lead", team_id: team.id } : { team_id: team.id })
      .eq("id", newLeadId);
    if (newLeadError) {
      setSaving(false);
      setError("Не вдалося призначити нового тімліда. Спробуйте ще раз.");
      return;
    }

    // 2. Point the team at them.
    await supabase.from("teams").update({ lead_id: newLeadId }).eq("id", team.id);

    // 3. The outgoing lead (if any, and if actually being replaced):
    // demoted to manager, either staying on this team or moving to
    // another one the admin picked.
    const oldLeadDestinationTeamId =
      currentLead && currentLead.id !== newLeadId ? (oldLeadDestination === KEEP_IN_TEAM ? team.id : oldLeadDestination) : null;
    if (currentLead && currentLead.id !== newLeadId) {
      await supabase
        .from("profiles")
        .update({ role: "manager", team_id: oldLeadDestinationTeamId })
        .eq("id", currentLead.id);
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TEAM_LEAD_CHANGED,
      entityType: "team",
      entityId: team.id,
      entityLabel: team.name,
      oldValue: currentLead?.full_name ?? "Без тімліда",
      newValue: newLeadProfile?.full_name ?? "—",
    });
    if (newLeadIsManager) {
      await logAudit(supabase, {
        actorId: currentUserId,
        action: AUDIT_ACTIONS.ROLE_CHANGE,
        entityType: "profile",
        entityId: newLeadId,
        entityLabel: newLeadProfile?.full_name ?? "Без імені",
        oldValue: "Менеджер",
        newValue: "Керівник відділу",
      });
    }
    if (currentLead && currentLead.id !== newLeadId) {
      await logAudit(supabase, {
        actorId: currentUserId,
        action: AUDIT_ACTIONS.ROLE_CHANGE,
        entityType: "profile",
        entityId: currentLead.id,
        entityLabel: currentLead.full_name ?? "Без імені",
        oldValue: "Керівник відділу",
        newValue: "Менеджер",
      });
    }

    const notifications: Promise<void>[] = [
      createNotification(supabase, {
        userId: newLeadId,
        kind: NOTIFICATION_KINDS.TEAM_CHANGED,
        title: "Вас призначено тімлідом",
        body: `Ви тепер очолюєте команду «${team.name}».`,
        link: "/my-team",
      }),
    ];
    if (currentLead && currentLead.id !== newLeadId) {
      notifications.push(
        createNotification(supabase, {
          userId: currentLead.id,
          kind: NOTIFICATION_KINDS.TEAM_CHANGED,
          title: "Вас переведено на посаду менеджера",
          body:
            oldLeadDestination === KEEP_IN_TEAM
              ? `Тімлідом команди «${team.name}» тепер є ${newLeadProfile?.full_name ?? "інший користувач"}.`
              : `Ви переведені менеджером до іншої команди.`,
          link: "/my-day",
        }),
      );
    }
    await Promise.all(notifications);

    setSaving(false);
    onChanged({
      teamId: team.id,
      newLeadId,
      newLeadWasManager: newLeadIsManager,
      oldLeadId: currentLead?.id ?? null,
      oldLeadDestinationTeamId,
    });
    onClose();
  }

  return (
    <Modal open={!!team} onClose={onClose} title={`Змінити тімліда «${team.name}»`}>
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs text-text-secondary">Поточний тімлід</div>
          <div className="text-base text-text-primary">{currentLead?.full_name ?? "Не призначений"}</div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Новий тімлід</label>
          <Select value={newLeadId} onChange={(e) => setNewLeadId(e.target.value)}>
            <option value="" disabled>
              Оберіть користувача
            </option>
            {teamManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Без імені"} (менеджер цієї команди → стане тімлідом)
              </option>
            ))}
            {freeLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name ?? "Без імені"} (керівник відділу без команди)
              </option>
            ))}
          </Select>
        </div>

        {showOldLeadChoice && (
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">
              Що робити з {currentLead?.full_name ?? "попереднім тімлідом"}?
            </label>
            <Select value={oldLeadDestination} onChange={(e) => setOldLeadDestination(e.target.value)}>
              <option value={KEEP_IN_TEAM}>Залишити менеджером у цій команді</option>
              {otherTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  Перевести менеджером до «{t.name}»
                </option>
              ))}
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-negative">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Скасувати
          </Button>
          <Button variant="primary" disabled={saving || !newLeadId} onClick={handleConfirm}>
            {saving ? "Збереження…" : "Підтвердити"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
