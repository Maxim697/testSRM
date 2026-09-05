import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const BASE_CLASSES =
  "w-full rounded-control border border-border bg-surface-1 px-2.5 text-base text-text-primary placeholder:text-text-muted outline-none focus-visible:border-focus-ring";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  multiline: true;
  rows?: number;
};

export function Input({ className, multiline, ...props }: InputProps | TextareaProps) {
  if (multiline) {
    const { rows = 4, ...textareaProps } = props as TextareaProps;
    return (
      <textarea
        rows={rows}
        className={cn(BASE_CLASSES, "resize-none py-2", className)}
        {...textareaProps}
      />
    );
  }

  return (
    <input
      className={cn(BASE_CLASSES, "h-8", className)}
      {...(props as InputHTMLAttributes<HTMLInputElement>)}
    />
  );
}
