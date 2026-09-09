"use client";

import { useEffect, useRef } from "react";

/** Types `text` out over `durationMs`, left to right, with a blinking block
 * caret — with zero React state driving the animation itself. The real
 * `text` is rendered into the DOM immediately (via a ref, `visibility:
 * hidden`), so it reserves its final layout width from the very first
 * paint and never changes size again. An absolutely-positioned overlay
 * span, driven by a plain rAF loop writing straight to `textContent`,
 * draws the animation on top; the caret is a `position: absolute`
 * `::after` on that overlay, so it never contributes to anyone's width
 * either.
 *
 * The effect has an empty dependency array on purpose: it runs exactly
 * once, at mount, and never restarts — not on a parent re-render, not on
 * `text` changing under it. To get a fresh typing pass (first load, or a
 * genuine data update), remount the component by changing its React `key`
 * to something derived from the new value.
 *
 * `caret="hide-when-done"` (default, for KPI/table numbers): the caret
 * disappears the instant typing finishes.
 * `caret="persist"` (for page/section titles): the caret keeps blinking
 * forever after, like a standing terminal prompt.
 *
 * Re-enabled unconditionally (the "lettering" category of the jitter
 * isolation, re-added on its own — see git log/globals.css) — no
 * effects-intensity gate, no debug override, just always animates. */
export function Typewriter({
  text,
  durationMs = 300,
  className,
  as: Tag = "span",
  caret = "hide-when-done",
}: {
  text: string;
  durationMs?: number;
  className?: string;
  as?: "span" | "h1" | "h2";
  caret?: "hide-when-done" | "persist";
}) {
  const finalRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const willAnimate = text.length > 0;

  useEffect(() => {
    const final = finalRef.current;
    const overlay = overlayRef.current;
    if (!final || !overlay) return;

    if (!willAnimate) return;

    const len = text.length;
    overlay.style.display = "inline-block";
    overlay.textContent = "";
    overlay.classList.add("term-typewriter-caret");

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const chars = Math.min(len, Math.floor((elapsed / durationMs) * len));
      overlay!.textContent = text.slice(0, chars);
      if (chars < len) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (caret === "persist") {
        // Overlay stays put, showing the finished text plus a permanent
        // caret — `final` stays hidden behind it forever.
        return;
      }
      final!.style.visibility = "visible";
      overlay!.style.display = "none";
      overlay!.classList.remove("term-typewriter-caret");
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately empty: runs once at mount, never restarts on a parent re-render or a `text` change underneath it (callers re-key the component for a fresh pass, e.g. key={text})
  }, []);

  return (
    <Tag className={className}>
      <span className="term-typewriter-wrap">
        <span ref={finalRef} className="term-typewriter-final" style={{ visibility: willAnimate ? "hidden" : "visible" }}>
          {text}
        </span>
        <span
          ref={overlayRef}
          className="term-typewriter-overlay"
          style={{ display: willAnimate ? "inline-block" : "none" }}
          aria-hidden="true"
        />
      </span>
    </Tag>
  );
}
