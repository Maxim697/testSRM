"use client";

import { useEffect, useRef, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { fxDebugOverride } from "@/lib/fx-debug";
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

  // ?fxdebug=... (see lib/fx-debug.ts) overrides the intensity check
  // entirely when present, so this one effect can be isolated on the live
  // site without touching the real effects-intensity setting. Reading it
  // directly at render time (fxDebugOverride() touches window.location)
  // made the very first render — before this effect has run — briefly use
  // the *real* intensity instead of the override, i.e. a cursor that
  // should start off could flash on for one frame. null on both the
  // server and the client's first paint is SSR-safe by construction; the
  // real override value (if any) lands a moment later via the effect
  // below, same pattern as Typewriter's debugTyping.
  const [debugCursor, setDebugCursor] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a client-only value (URL search params), not a prop mirror
    setDebugCursor(fxDebugOverride("cursor"));
  }, []);
  const active = hoverCapable && (debugCursor !== null ? debugCursor : intensity !== "off");

  // Diagnostics: window.__cursorDebug always holds the live state, and the
  // console gets one line per step so "nothing happened" has an answer.
  useEffect(() => {
    console.log(
      `[cursor] mount check — hoverCapable=${hoverCapable} intensity=${intensity} → active=${active}` +
        (active ? "" : "  (cursor will NOT render: " + (!hoverCapable ? "no fine pointer detected" : "effects intensity is off") + ")"),
    );
  }, [hoverCapable, intensity, active]);

  useEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("custom-cursor-active");
      document.documentElement.style.removeProperty("cursor");
      document.body.style.removeProperty("cursor");
      return;
    }
    document.documentElement.classList.add("custom-cursor-active");
    // Belt-and-suspenders: an inline !important cursor:none on html and body
    // directly, on top of the stylesheet rule — inline style with !important
    // beats every author stylesheet regardless of layers/specificity, so
    // this can't lose to a stray `cursor: pointer` anywhere.
    document.documentElement.style.setProperty("cursor", "none", "important");
    document.body.style.setProperty("cursor", "none", "important");
    const computed = getComputedStyle(document.body).cursor;
    console.log(
      `[cursor] custom-cursor-active class + inline cursor:none applied to <html>/<body>; computed body cursor = "${computed}"` +
        (computed === "none" ? " ✓" : " ✗ (expected \"none\" — some other rule with higher priority is winning)"),
    );
    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      document.documentElement.style.removeProperty("cursor");
      document.body.style.removeProperty("cursor");
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const ringEl = outerRingRef.current;
    const coreEl = outerCoreRef.current;
    console.log(
      `[cursor] DOM check — ring element: ${ringEl ? "present" : "MISSING"}, core element: ${coreEl ? "present" : "MISSING"}` +
        (ringEl ? `, ring z-index=${getComputedStyle(ringEl).zIndex}, pointer-events=${getComputedStyle(ringEl).pointerEvents}` : ""),
    );

    let moveCount = 0;
    let lastLoggedCategory: Category | null = null;

    function handleMove(e: MouseEvent) {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      setVisible(true);
      const cat = detectCategory(e.target);
      setCategory(cat);
      moveCount++;
      const w = window as unknown as { __cursorDebug?: unknown };
      w.__cursorDebug = { x: e.clientX, y: e.clientY, category: cat, symbol: SYMBOLS[cat], moveCount };
      // First move proves the handler fires at all; after that, only log when
      // the context symbol actually changes, so this stays readable instead
      // of flooding the console on every pixel of mouse travel.
      if (moveCount === 1) {
        console.log(`[cursor] first mousemove received at (${e.clientX}, ${e.clientY}) — handler is wired up`);
      }
      if (cat !== lastLoggedCategory) {
        console.log(`[cursor] category → "${cat}" (symbol "${SYMBOLS[cat]}") at (${e.clientX}, ${e.clientY})`);
        lastLoggedCategory = cat;
      }
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

    let lastCoreX = NaN;
    let lastCoreY = NaN;
    let lastRingX = NaN;
    let lastRingY = NaN;

    function tick() {
      const dx = pointer.current.x - ring.current.x;
      const dy = pointer.current.y - ring.current.y;
      // Snap once the remaining gap is sub-visible instead of easing
      // forever — 0.35 asymptotically approaches the target but never
      // exactly reaches it, which otherwise means this writes a
      // (compositor-visible) new transform on two fixed, very-high-z-index
      // elements every single frame for as long as the page stays open,
      // long after the ring has visually caught up.
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        ring.current.x = pointer.current.x;
        ring.current.y = pointer.current.y;
      } else {
        ring.current.x += dx * SMOOTHING;
        ring.current.y += dy * SMOOTHING;
      }

      if (outerCoreRef.current && (pointer.current.x !== lastCoreX || pointer.current.y !== lastCoreY)) {
        outerCoreRef.current.style.transform = `translate3d(${pointer.current.x}px, ${pointer.current.y}px, 0)`;
        lastCoreX = pointer.current.x;
        lastCoreY = pointer.current.y;
      }
      if (outerRingRef.current && (ring.current.x !== lastRingX || ring.current.y !== lastRingY)) {
        outerRingRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`;
        lastRingX = ring.current.x;
        lastRingY = ring.current.y;
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
