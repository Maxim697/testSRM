import { cn } from "@/lib/utils";

/** A loading placeholder that reads as a terminal line printing itself in:
 * a row of block characters, each blinking on its own slight delay. `chars`
 * sets how many blocks wide it is. */
export function Skeleton({
  chars = 12,
  className,
}: {
  chars?: number;
  className?: string;
}) {
  return (
    <span className={cn("term-skeleton", className)} aria-hidden="true">
      {Array.from({ length: chars }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }}>
          ▓
        </span>
      ))}
    </span>
  );
}
