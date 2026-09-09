"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Sensitivity = "public" | "internal" | "restricted";
type RoleKey = "manager" | "lead" | "admin";

const ROLE_LABELS: Record<RoleKey, string> = {
  manager: "Менеджер",
  lead: "Керівник відділу",
  admin: "Адміністратор",
};

export function AccessSettingsModal({
  open,
  onClose,
  defaultName,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onApplied: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [workspace, setWorkspace] = useState("personal");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("internal");
  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({
    manager: true,
    lead: true,
    admin: true,
  });

  function toggleRole(role: RoleKey) {
    setRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  }

  function handleSave() {
    onClose();
    onApplied();
  }

  return (
    <Modal open={open} onClose={onClose} title="Налаштувати доступ">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Назва дашборда</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Воркспейс</label>
          <Select value={workspace} onChange={(e) => setWorkspace(e.target.value)}>
            <option value="personal">Особистий</option>
            <option value="sales">Команда продажів</option>
            <option value="analytics">Аналітика</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Рівень чутливості</label>
          <Select value={sensitivity} onChange={(e) => setSensitivity(e.target.value as Sensitivity)}>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="restricted">Restricted</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-secondary">Доступ за ролями</label>
          <div className="flex gap-2">
            {(Object.keys(ROLE_LABELS) as RoleKey[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={cn(
                  "rounded-control border px-3 py-1.5 text-sm transition-colors",
                  roles[role]
                    ? "border-info bg-info-bg text-info"
                    : "border-border text-text-secondary hover:text-text-primary",
                )}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Скасувати
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Зберегти
          </Button>
        </div>
      </div>
    </Modal>
  );
}
