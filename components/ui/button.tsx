import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-info text-white hover:opacity-90",
  secondary:
    "bg-surface-3 text-text-primary border border-border hover:border-border-strong",
  ghost: "text-text-secondary hover:bg-surface-3 hover:text-text-primary",
};

const BASE_CLASSES =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: string;
};

export function Button({ variant = "primary", className, href, ...props }: ButtonProps) {
  if (href) {
    return (
      <Link href={href} className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}>
        {props.children}
      </Link>
    );
  }

  return (
    <button
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}
