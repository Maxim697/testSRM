import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to keep it out of ...props (would otherwise land on the DOM node as an invalid attribute); no longer rendered
  label: _label,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** No longer rendered — corner captions were part of the old terminal
   * look and are gone. Still accepted so existing call sites don't need
   * to change. */
  label?: string;
}) {
  return (
    <div className={cn("panel rounded-card p-4", className)} {...props}>
      {children}
    </div>
  );
}
