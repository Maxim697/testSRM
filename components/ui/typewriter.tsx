"use client";

import { useEffect, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";

/** Types `text` out over `durationMs`, left to right, with a blinking block
 * caret. The caret is absolutely positioned against an inline wrapper sized
 * to exactly the revealed text, so it never itself takes up layout space or
 * shifts anything after it. Skipped entirely (full text, no caret) unless
 * effects intensity is "full".
 *
 * `caret="hide-when-done"` (default, for KPI/table numbers): the caret
 * disappears the instant typing finishes.
 * `caret="persist"` (for page/section titles): once typing finishes the
 * caret keeps blinking forever, like a standing terminal prompt.
 *
 * Callers must `key` this by whatever makes `text` a "new" value (the text
 * itself, a page path, a fetch timestamp...) to get a fresh typing pass on
 * first load and on every data update — this component only ever animates
 * once per mount, by design, rather than resetting state from a prop change
 * (an effect synchronously mirroring a prop into state is an anti-pattern). */
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
  const { intensity } = useEffectsIntensity();
  const full = intensity === "full";
  // Characters of `text` revealed so far — only meaningful while `full`.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!full || text.length === 0) return;
    const len = text.length;
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const chars = Math.min(len, Math.floor((elapsed / durationMs) * len));
      setProgress(chars);
      if (chars < len) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally NOT re-running on `text` changes; see doc comment above, callers re-key instead
  }, [durationMs, full]);

  const typingDone = !full || progress >= text.length;
  const shown = full ? text.slice(0, progress) : text;
  const showCaret = full && (caret === "persist" ? true : !typingDone);

  return (
    <Tag className={className}>
      <span className="relative inline-block">
        {shown}
        {showCaret && <span className="term-caret term-caret-abs" aria-hidden="true" />}
      </span>
    </Tag>
  );
}
