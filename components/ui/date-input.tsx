import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function DateInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="date"
      className={cn(
        "h-8 w-full rounded-control border border-border bg-surface-1 px-2.5 text-base text-text-primary outline-none focus-visible:border-focus-ring",
        className,
      )}
      {...props}
    />
  );
}
