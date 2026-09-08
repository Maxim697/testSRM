"use client";

import { useEffect, useRef, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { cn } from "@/lib/utils";

type Category = "default" | "table" | "click" | "input" | "disabled" | "chart";

const SYMBOLS: Record<Category, string> = {
  default: "$",
  table: "+",
  click: ">",
  input: "▌",
  disabled: "×",
  chart: "⊹",
};

// Most-specific-wins order: a link inside a table cell reads as a link, not
// a table cell; a disabled button reads as disabled, not clickable.
function detectCategory(target: EventTarget | null): Category {
  if (!(target instanceof Element)) return "default";
  if (target.closest('[disabled], [aria-disabled="true"]')) return "disabled";
  if (target.closest('input, textarea, [contenteditable="true"]')) return "input";
  if (target.closest('button, a, [role="button"], [role="option"], [role="combobox"]')) return "click";
  if (target.closest('[data-cursor="chart"]')) return "chart";
  if (target.closest("table")) return "table";
  return "default";
}

const SMOOTHING = 0.35;

/** A crosshair-reticle cursor replacing the system one: a core (the
 * context symbol) that snaps straight to the pointer, and a ring that
 * trails it with inertia. Position is written straight to each layer's
 * `style.transform` every animation frame — no re-renders, no new
 * elements — while the (rare) category/press/visibility changes go
 * through React state so their CSS transitions can take over. */
export function CustomCursor() {
  const { intensity } = useEffectsIntensity();
  const [hoverCapable, setHoverCapable] = useState(false);
  const [category, setCategory] = useState<Category>("default");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  const outerRingRef = useRef<HTMLDivElement>(null);
  const outerCoreRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const rafRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a MediaQueryList's current state on mount, then subscribing to real changes below
    setHoverCapable(mq.matches);
    function handleChange(e: MediaQueryListEvent) {
      setHoverCapable(e.matches);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const active = hoverCapable && intensity !== "off";

  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("custom-cursor-active");
    return () => document.documentElement.classList.remove("custom-cursor-active");
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function handleMove(e: MouseEvent) {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      setVisible(true);
      setCategory(detectCategory(e.target));
    }
    function handleLeave() {
      setVisible(false);
    }
    function handleEnter() {
      setVisible(true);
    }
    function handleDown() {
      setPressed(true);
    }
    function handleUp() {
      setPressed(false);
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("mouseup", handleUp);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    document.documentElement.addEventListener("mouseenter", handleEnter);

    function tick() {
      ring.current.x += (pointer.current.x - ring.current.x) * SMOOTHING;
      ring.current.y += (pointer.current.y - ring.current.y) * SMOOTHING;
      if (outerCoreRef.current) {
        outerCoreRef.current.style.transform = `translate3d(${pointer.current.x}px, ${pointer.current.y}px, 0)`;
      }
      if (outerRingRef.current) {
        outerRingRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("mouseup", handleUp);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      document.documentElement.removeEventListener("mouseenter", handleEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  const isClick = category === "click";
  const isInput = category === "input";
  const isActive = isClick || pressed;
  const scaleClass = pressed ? "cursor-ring-svg--pressed" : isClick ? "cursor-ring-svg--hover" : "cursor-ring-svg--default";
  const strokeClass = isActive ? "cursor-ring-strokes--active" : "cursor-ring-strokes--default";

  return (
    <>
      <div
        ref={outerRingRef}
        className={cn("cursor-layer", !visible && "cursor-layer--hidden")}
        aria-hidden="true"
      >
        {isInput ? (
          <div className="cursor-ring-rect" />
        ) : (
          <svg width="40" height="40" viewBox="-20 -20 40 40" className={cn("cursor-ring-svg", scaleClass)}>
            <g className={cn("cursor-ring-strokes", strokeClass)} fill="none" strokeWidth="1">
              <path d="M 13.52,3.62 A 14,14 0 0,1 3.62,13.52" />
              <path d="M -3.62,13.52 A 14,14 0 0,1 -13.52,3.62" />
              <path d="M -13.52,-3.62 A 14,14 0 0,1 -3.62,-13.52" />
              <path d="M 3.62,-13.52 A 14,14 0 0,1 13.52,-3.62" />
              <line x1="14" y1="0" x2="19" y2="0" />
              <line x1="0" y1="14" x2="0" y2="19" />
              <line x1="-14" y1="0" x2="-19" y2="0" />
              <line x1="0" y1="-14" x2="0" y2="-19" />
            </g>
          </svg>
        )}
      </div>
      <div
        ref={outerCoreRef}
        className={cn("cursor-layer", !visible && "cursor-layer--hidden")}
        aria-hidden="true"
      >
        <span className={cn("cursor-core-symbol", pressed && "cursor-core-symbol--flash", isInput && "cursor-core-symbol--blink")}>
          {SYMBOLS[category]}
        </span>
      </div>
    </>
  );
}
