/** TEMPORARILY just renders `text` directly — no typing animation, no
 * overlay, no caret. This used to run a rAF-driven character-reveal
 * animation (confirmed, at one point, to be a real contributor to the
 * Scoreboard table jitter); removed at the code level, not just gated
 * off, while every other candidate effect is stripped too and re-added
 * one at a time. See git history for the animated version — the same
 * props are kept here so call sites don't need to change either way. */
export function Typewriter({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  durationMs?: number;
  className?: string;
  as?: "span" | "h1" | "h2";
  caret?: "hide-when-done" | "persist";
}) {
  return <Tag className={className}>{text}</Tag>;
}
