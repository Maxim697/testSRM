"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { roleLabel, type Role } from "@/lib/roles";
import type { Profile, Team } from "@/lib/types";

const ROLES: Role[] = ["manager", "lead", "admin"];
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
const NO_TEAM = "__none__";
const NEW_TEAM = "__new__";

function generatePassword(length = 14): string {
  let result = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += PASSWORD_CHARS[array[i]! % PASSWORD_CHARS.length];
  }
  return result;
}

export function CreateUserModal({
  open,
  onClose,
  onCreated,
  teams,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: Profile, team: Team | null) => void;
  /** Every existing team — used for the manager team picker and to offer
   * "assign to this teamless team" as an alternative to "create a new
   * team" when the new user's role is lead. */
  teams: Team[];
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [teamChoice, setTeamChoice] = useState<string>(NO_TEAM);
  const [newTeamName, setNewTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const teamlessTeams = teams.filter((t) => !t.lead_id);

  // Switching role resets whatever team choice was mid-flight for the
  // previous role — a manager's "existing team" pick doesn't carry any
  // meaning once the role becomes admin (and a team that's valid to join
  // as a manager may not be valid to lead, if it already has one).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the team choice whenever the role changes, not mirroring a prop continuously
    setTeamChoice(NO_TEAM);
  }, [role]);

  function reset() {
    setEmail("");
    setFullName("");
    setTelegram("");
    setRole("manager");
    setTeamChoice(NO_TEAM);
    setNewTeamName("");
    setPassword("");
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!email.trim() || !fullName.trim() || !password) {
      setError("Заповніть email, ім'я та пароль.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль має містити щонайменше 8 символів.");
      return;
    }
    if (role === "manager" && teamChoice === NO_TEAM) {
      setError("Для менеджера обов'язково оберіть команду.");
      return;
    }
    if (role === "lead" && teamChoice === NEW_TEAM && !newTeamName.trim()) {
      setError("Вкажіть назву нової команди.");
      return;
    }

    setSaving(true);
    setError(null);

    const teamId = teamChoice !== NO_TEAM && teamChoice !== NEW_TEAM ? teamChoice : null;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        fullName: fullName.trim(),
        telegram: telegram.trim(),
        role,
        password,
        teamId,
        newTeamName: role === "lead" && teamChoice === NEW_TEAM ? newTeamName.trim() : "",
      }),
    });
    const payload = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setError((payload && typeof payload.error === "string" && payload.error) || "Не вдалося створити користувача.");
      return;
    }

    const resultTeamId: string | null = payload.teamId ?? null;
    const resultTeamName: string | null = payload.teamName ?? null;
    const existingTeamName = teamId ? (teams.find((t) => t.id === teamId)?.name ?? null) : null;

    onCreated(
      {
        id: payload.id,
        full_name: fullName.trim(),
        telegram: telegram.trim() || null,
        role,
        is_active: true,
        team_id: resultTeamId,
        team: null,
      },
      resultTeamId
        ? { id: resultTeamId, name: resultTeamName ?? existingTeamName ?? "", lead_id: role === "lead" ? payload.id : null, created_at: "" }
        : null,
    );
    setCreated({ email: email.trim(), password });
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Email: ${created.email}\nПароль: ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={created ? "Користувача створено" : "Додати користувача"}>
      {created ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            Передайте ці дані новому користувачу. Пароль більше ніде не показуватиметься.
          </p>
          <div className="flex flex-col gap-2 rounded-control border border-border bg-surface-1 p-3">
            <div>
              <div className="text-xs text-text-secondary">Email</div>
              <div className="text-base tabular-nums text-text-primary">{created.email}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary">Тимчасовий пароль</div>
              <div className="text-base tabular-nums text-text-primary">{created.password}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? "Скопійовано ✓" : "Скопіювати"}
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Готово
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Ім&apos;я та прізвище</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Іван Петренко" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Telegram</label>
            <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username (необов'язково)" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Роль</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          </div>

          {role !== "admin" && (
            <div>
              <label className="mb-1.5 block text-xs text-text-secondary">
                Команда{role === "manager" && <span className="text-negative"> *</span>}
              </label>
              <Select value={teamChoice} onChange={(e) => setTeamChoice(e.target.value)}>
                {role === "lead" && <option value={NO_TEAM}>Без команди</option>}
                {role === "manager" && (
                  <option value={NO_TEAM} disabled>
                    Оберіть команду
                  </option>
                )}
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={role === "lead" && !teamlessTeams.some((tt) => tt.id === t.id)}>
                    {t.name}
                    {role === "lead" && t.lead_id ? " (вже має тімліда)" : ""}
                  </option>
                ))}
                {role === "lead" && <option value={NEW_TEAM}>+ Створити нову команду для цього ліда</option>}
              </Select>
              {role === "lead" && teamChoice === NEW_TEAM && (
                <div className="mt-1.5">
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Назва нової команди"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-text-secondary">Тимчасовий пароль</label>
            <div className="flex items-center gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Щонайменше 8 символів" />
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => setPassword(generatePassword())}>
                Згенерувати
              </Button>
            </div>
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
      )}
    </Modal>
  );
}
