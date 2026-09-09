import { cn } from "@/lib/utils";

/** Plain, static loading label — no animation. */
export function LoadingLine({
  label = "завантаження",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center text-text-secondary", className)} role="status">
      {label}…
    </span>
  );
}
