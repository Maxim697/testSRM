import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-control border border-border bg-surface-1 px-2.5 text-base text-text-primary placeholder:text-text-muted outline-none focus-visible:border-focus-ring",
        className,
      )}
      {...props}
    />
  );
}
