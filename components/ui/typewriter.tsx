/** Renders `text` directly — no typing animation. Kept as a thin
 * pass-through (rather than removed) so call sites (KPI values, page
 * titles) don't need to change; the props unrelated to plain rendering
 * are accepted and ignored. */
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
