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
        "field h-8 w-full px-2.5 text-base text-text-primary outline-none",
        className,
      )}
      {...props}
    />
  );
}
