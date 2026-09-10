"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Profile, Team } from "@/lib/types";

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Avatar({ name, className }: { name: string | null; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-medium text-text-primary",
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

function TeamMenu({
  canManage,
  onRename,
  onChangeLead,
  onDelete,
}: {
  canManage: boolean;
  onRename: () => void;
  onChangeLead: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!canManage) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-control text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        aria-label="Меню команди"
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="popover-surface backdrop-blur-lg popover-enter absolute right-0 top-full z-20 mt-1 w-56 rounded-card p-1">
          {[
            { label: "Перейменувати", action: onRename },
            { label: "Змінити тімліда", action: onChangeLead },
            { label: "Видалити", action: onDelete },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.action();
              }}
              className="flex h-8 w-full items-center rounded-control px-2.5 text-left text-base text-text-primary hover:bg-surface-3"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamBlock({
  team,
  lead,
  managers,
  traderCounts,
  canManage,
  onRename,
  onChangeLead,
  onDelete,
  onAddManager,
  onMoveManager,
  onToggleActive,
}: {
  team: Team;
  lead: Profile | null;
  managers: Profile[];
  traderCounts: Record<string, number>;
  canManage: boolean;
  onRename: () => void;
  onChangeLead: () => void;
  onDelete: () => void;
  onAddManager: () => void;
  onMoveManager: (manager: Profile) => void;
  onToggleActive: (user: Profile) => void;
}) {
  const teamTraderCount = managers.reduce((sum, m) => sum + (traderCounts[m.id] ?? 0), 0);
  const leadless = !lead && managers.length > 0;

  return (
    <div className="panel flex flex-col gap-3 rounded-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-text-primary">{team.name}</h3>
        <TeamMenu canManage={canManage} onRename={onRename} onChangeLead={onChangeLead} onDelete={onDelete} />
      </div>

      {leadless && (
        <p className="rounded-control bg-warning-bg px-2.5 py-1.5 text-xs text-warning">
          ⚠ Команда без тімліда — {managers.length} {managers.length === 1 ? "менеджер" : "менеджерів"} без керівника.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-1 p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={lead?.full_name ?? null} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-text-primary">{lead?.full_name ?? "Не призначений"}</span>
              {lead && <Badge variant="green">Тімлід</Badge>}
              {lead && !lead.is_active && <Badge variant="neutral">Неактивний</Badge>}
            </div>
            <div className="truncate text-xs text-text-muted">{lead?.telegram ?? "—"}</div>
          </div>
        </div>
        <div className="flex shrink-0 gap-4 text-right text-sm">
          <div>
            <div className="field-label">Менеджерів</div>
            <div className="tabular-nums text-text-primary">{managers.length}</div>
          </div>
          <div>
            <div className="field-label">Трейдерів</div>
            <div className="tabular-nums text-text-primary">{teamTraderCount}</div>
          </div>
        </div>
      </div>

      {managers.length === 0 ? (
        <p className="py-2 text-center text-sm text-text-muted">У команді ще немає менеджерів.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {managers.map((m) => (
            <div
              key={m.id}
              className={cn("flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2", !m.is_active && "opacity-50")}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={m.full_name} className="h-7 w-7 text-xs" />
                <div className="min-w-0">
                  <div className="truncate text-text-primary">{m.full_name ?? "Без імені"}</div>
                  <div className="truncate text-xs text-text-muted">{m.telegram ?? "—"}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums text-sm text-text-secondary">{traderCounts[m.id] ?? 0} трейдерів</span>
                {!m.is_active && <Badge variant="neutral">Неактивний</Badge>}
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => onMoveManager(m)}>
                      Перемістити
                    </Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => onToggleActive(m)}>
                      {m.is_active ? "Деактивувати" : "Активувати"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <Button variant="secondary" className="w-full" onClick={onAddManager}>
          Додати менеджера в команду
        </Button>
      )}
    </div>
  );
}
