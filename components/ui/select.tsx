"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type OptionData = { value: string; label: ReactNode; disabled?: boolean };

function extractOptions(children: ReactNode): OptionData[] {
  const options: OptionData[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
    if (el.props.value === undefined) return;
    options.push({
      value: String(el.props.value),
      label: el.props.children,
      disabled: el.props.disabled,
    });
  });
  return options;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className={cn("shrink-0 text-text-muted transition-transform duration-150", open && "rotate-180")}
    >
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  /** accepted for call-site compatibility; enforced via disabled-submit checks instead of native validation */
  required?: boolean;
}) {
  const options = useMemo(() => extractOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function openList() {
    if (disabled) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function commit(index: number) {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange({ target: { value: opt.value } });
    setOpen(false);
  }

  function moveHighlight(direction: 1 | -1) {
    setHighlighted((current) => {
      let next = current;
      for (let i = 0; i < options.length; i++) {
        next = next + direction;
        if (next < 0 || next >= options.length) break;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(highlighted);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlighted(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setHighlighted(options.length - 1);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-control border border-border bg-surface-1 px-2.5 text-left text-base text-text-primary outline-none focus-visible:border-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedOption?.label ?? placeholder ?? ""}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="glass backdrop-blur-lg absolute left-0 top-full z-30 mt-1 max-h-60 w-full min-w-max overflow-y-auto rounded-control p-1 text-base"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => commit(i)}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-control px-2.5 py-1.5",
                opt.disabled
                  ? "cursor-not-allowed text-text-muted opacity-50"
                  : i === highlighted
                    ? "bg-info-bg text-info"
                    : opt.value === value
                      ? "font-medium text-text-primary"
                      : "text-text-primary",
              )}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
