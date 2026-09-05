import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 w-full appearance-none rounded-control border border-border bg-surface-1 px-2.5 text-base text-text-primary outline-none focus-visible:border-focus-ring",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
