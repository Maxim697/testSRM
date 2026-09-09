"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit-log";
import type { Profile } from "@/lib/types";

/** Shared across every row in the Структура tab (managers, leads, admins,
 * teamless users) — the same activate/deactivate action and the same two
 * safety rules apply everywhere a user row appears. */
export function ToggleActiveModal({
  user,
  currentUserId,
  activeAdminCount,
  onClose,
  onToggled,
}: {
  user: Profile | null;
  currentUserId: string;
  activeAdminCount: number;
  onClose: () => void;
  onToggled: (userId: string, nextActive: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);

  let blockReason: string | null = null;
  if (user?.is_active) {
    if (user.id === currentUserId) blockReason = "Не можна деактивувати самого себе.";
    else if (user.role === "admin" && activeAdminCount <= 1)
      blockReason = "Не можна деактивувати останнього активного адміністратора.";
  }

  async function handleConfirm() {
    if (!user || blockReason) return;
    const nextActive = !user.is_active;
    setToggling(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ is_active: nextActive }).eq("id", user.id);
    setToggling(false);

    if (error) return;

    await logAudit(supabase, {
      actorId: currentUserId,
      action: nextActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
      entityType: "profile",
      entityId: user.id,
      entityLabel: user.full_name ?? "Без імені",
      oldValue: user.is_active ? "Активний" : "Неактивний",
      newValue: nextActive ? "Активний" : "Неактивний",
    });

    onToggled(user.id, nextActive);
    onClose();
  }

  return (
    <Modal open={!!user} onClose={onClose} title={user?.is_active ? "Деактивувати користувача?" : "Активувати користувача?"}>
      {user && (
        <div className="flex flex-col gap-3">
          {blockReason ? (
            <p className="text-sm text-negative">{blockReason}</p>
          ) : (
            <p className="text-base text-text-secondary">
              {user.is_active ? (
                <>
                  <span className="font-medium text-text-primary">{user.full_name ?? "Цей користувач"}</span> втратить
                  доступ до системи. Дані та історія дій зберігаються.
                </>
              ) : (
                <>
                  <span className="font-medium text-text-primary">{user.full_name ?? "Цей користувач"}</span> знову
                  отримає доступ до системи.
                </>
              )}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Скасувати
            </Button>
            <Button variant="primary" disabled={toggling || !!blockReason} onClick={handleConfirm}>
              {toggling ? "Збереження…" : user.is_active ? "Деактивувати" : "Активувати"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
