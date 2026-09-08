"use client";

import { useEffect, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";

/** Types `text` out over `durationMs`, left to right, with a blinking block
 * caret that disappears once done. Skipped entirely (full text, no caret)
 * unless effects intensity is "full".
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
}: {
  text: string;
  durationMs?: number;
  className?: string;
  as?: "span" | "h1" | "h2";
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

  const shown = full ? text.slice(0, progress) : text;
  const done = !full || progress >= text.length;

  return (
    <Tag className={className}>
      {shown}
      {!done && <span className="term-caret" aria-hidden="true" />}
    </Tag>
  );
}
