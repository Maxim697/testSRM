import { cn } from "@/lib/utils";

/** A loading placeholder bar — soft opacity pulse via .skeleton-block.
 * `chars` sizes it roughly to that many characters wide (kept for
 * call-site compatibility with the old block-character version). */
export function Skeleton({
  chars = 12,
  className,
}: {
  chars?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("skeleton-block h-[1em] align-middle", className)}
      style={{ width: `${chars * 0.62}em` }}
      aria-hidden="true"
    />
  );
}
