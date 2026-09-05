"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TraderTier } from "@/lib/types";

export type TraderSelectOption = { id: string; code: string; tier: TraderTier | null };

const TIER_ORDER: TraderTier[] = ["gold", "silver", "bronze"];
const TIER_LABELS: Record<TraderTier, string> = { gold: "Gold", silver: "Silver", bronze: "Bronze" };

export function TraderSelect({
  value,
  onChange,
  options,
  placeholder = "Без трейдера",
  className,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  options: TraderSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the search box each time the dropdown is (re)opened
    setSearch("");
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const filtered = options.filter((o) => o.code.toLowerCase().includes(search.toLowerCase()));
  const groups = [...TIER_ORDER, null].map((tier) => ({
    tier,
    label: tier ? TIER_LABELS[tier] : "Без tier",
    items: filtered.filter((o) => o.tier === tier),
  }));

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  const selectedLabel = value ? (options.find((o) => o.id === value)?.code ?? placeholder) : placeholder;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-control border border-border bg-surface-1 px-2.5 text-left text-base text-text-primary outline-none focus-visible:border-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("truncate", !value && "text-text-muted")}>{selectedLabel}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={cn("shrink-0 text-text-muted transition-transform duration-150", open && "rotate-180")}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="glass backdrop-blur-lg absolute left-0 top-full z-30 mt-1 w-64 rounded-control p-1.5">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук трейдера..."
            className="mb-1.5 h-7 w-full rounded-control border border-border bg-surface-1 px-2 text-sm text-text-primary outline-none focus-visible:border-focus-ring"
          />
          <div className="max-h-56 overflow-y-auto">
            <div
              onClick={() => select("")}
              className={cn(
                "cursor-pointer rounded-control px-2.5 py-1.5 text-sm",
                !value ? "bg-info-bg text-info" : "text-text-primary",
              )}
            >
              {placeholder}
            </div>
            {groups.map(
              (g) =>
                g.items.length > 0 && (
                  <div key={g.tier ?? "none"}>
                    <div className="mt-1 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                      {g.label}
                    </div>
                    {g.items.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => select(o.id)}
                        className={cn(
                          "cursor-pointer rounded-control px-2.5 py-1.5 text-sm",
                          o.id === value ? "bg-info-bg text-info" : "text-text-primary",
                        )}
                      >
                        {o.code}
                      </div>
                    ))}
                  </div>
                ),
            )}
            {filtered.length === 0 && <div className="px-2.5 py-2 text-sm text-text-muted">Нічого не знайдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}
