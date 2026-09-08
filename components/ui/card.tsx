import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  label,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** Small technical caption on the top-left border, e.g. "DATA TABLE",
   * "FILTER", "CHART" — rendered as "[ LABEL ]". Omit for a plain panel. */
  label?: string;
}) {
  return (
    <div className={cn("term-panel term-corners rounded-card p-4", className)} {...props}>
      {label && <span className="term-corner-label">[ {label} ]</span>}
      {children}
    </div>
  );
}
