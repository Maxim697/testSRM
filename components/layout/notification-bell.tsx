"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { NotificationEntry } from "@/lib/types";

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function NotificationBell({ notifications: initial }: { notifications: NotificationEntry[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  async function handleClick(n: NotificationEntry) {
    if (!n.is_read) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface-2 text-text-secondary transition-colors hover:text-text-primary"
        aria-label="Сповіщення"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-info px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="glass backdrop-blur-lg absolute right-0 top-full z-30 mt-1.5 w-80 rounded-control p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Сповіщення</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-info hover:underline">
                Позначити всі прочитаними
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <EmptyState
              className="border-none py-8"
              title="Немає сповіщень"
              description="Тут з'являться оновлення по звітах, завданнях і трейдерах."
            />
          ) : (
            <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-surface-3",
                    !n.is_read && "bg-info-bg",
                  )}
                >
                  <span className="flex w-full items-center gap-1.5">
                    {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" />}
                    <span className="truncate text-sm font-medium text-text-primary">{n.title}</span>
                  </span>
                  {n.body && <span className="line-clamp-2 text-xs text-text-secondary">{n.body}</span>}
                  <span className="text-xs text-text-muted">{formatDateTime(n.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
