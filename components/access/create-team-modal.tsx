"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import { createNotification, NOTIFICATION_KINDS } from "@/lib/notifications";
import type { Profile, Team } from "@/lib/types";

const NO_LEAD = "__none__";

export function CreateTeamModal({
  open,
  onClose,
  freeLeads,
  managers,
  currentUserId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Leads (role = lead) with no team of their own yet. */
  freeLeads: Profile[];
  /** Every manager, regardless of current team — promoting one to lead a
   * brand-new team moves them out of wherever they were. */
  managers: Profile[];
  currentUserId: string;
  onCreated: (team: Team, promotedManagerId: string | null, assignedLeadId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [leadChoice, setLeadChoice] = useState(NO_LEAD);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setLeadChoice(NO_LEAD);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Вкажіть назву команди.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const promoteManagerId = managers.some((m) => m.id === leadChoice) ? leadChoice : null;
    const assignFreeLeadId = freeLeads.some((l) => l.id === leadChoice) ? leadChoice : null;
    const leadId = promoteManagerId ?? assignFreeLeadId;

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ name: name.trim() })
      .select("*")
      .single();

    if (teamError || !team) {
      setSaving(false);
      setError("Не вдалося створити команду. Спробуйте ще раз.");
      return;
    }

    if (leadId) {
      const profileUpdate = promoteManagerId
        ? { role: "lead" as const, team_id: team.id }
        : { team_id: team.id };
      await supabase.from("profiles").update(profileUpdate).eq("id", leadId);
      await supabase.from("teams").update({ lead_id: leadId }).eq("id", team.id);

      if (promoteManagerId) {
        const manager = managers.find((m) => m.id === promoteManagerId);
        await logAudit(supabase, {
          actorId: currentUserId,
          action: AUDIT_ACTIONS.ROLE_CHANGE,
          entityType: "profile",
          entityId: promoteManagerId,
          entityLabel: manager?.full_name ?? "Без імені",
          oldValue: "Менеджер",
          newValue: "Керівник відділу",
        });
      }

      await createNotification(supabase, {
        userId: leadId,
        kind: NOTIFICATION_KINDS.TEAM_CHANGED,
        title: "Вас призначено тімлідом",
        body: `Ви тепер очолюєте команду «${team.name}».`,
        link: "/my-team",
      });
    }

    await logAudit(supabase, {
      actorId: currentUserId,
      action: AUDIT_ACTIONS.TEAM_CREATED,
      entityType: "team",
      entityId: team.id,
      entityLabel: team.name,
      newValue: leadId ? `Тімлід: ${managers.find((m) => m.id === leadId)?.full_name ?? freeLeads.find((l) => l.id === leadId)?.full_name ?? "—"}` : "Без тімліда",
    });

    setSaving(false);
    onCreated({ ...team, lead_id: leadId }, promoteManagerId, assignFreeLeadId);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Створити команду">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Назва команди</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Наприклад: Команда Ченнаї" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Тімлід</label>
          <Select value={leadChoice} onChange={(e) => setLeadChoice(e.target.value)}>
            <option value={NO_LEAD}>Без тімліда (призначити пізніше)</option>
            {freeLeads.length > 0 && (
              <>
                {freeLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name ?? "Без імені"} (вже керівник відділу)
                  </option>
                ))}
              </>
            )}
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Без імені"} (підвищити з менеджера)
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Скасувати
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSubmit}>
            {saving ? "Створення…" : "Створити"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
