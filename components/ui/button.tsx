"use client";

import type { MouseEvent, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { emitCircuitPulse } from "@/lib/circuit-pulse-event";

type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-info text-white hover:opacity-90",
  secondary:
    "bg-surface-3 text-text-primary border border-border hover:border-border-strong",
  ghost: "text-text-secondary hover:bg-surface-3 hover:text-text-primary",
};

const BASE_CLASSES =
  "pcb-button btn-lift inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-base font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: string;
};

export function Button({ variant = "primary", className, href, onClick, ...props }: ButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
        onClick={(e) => emitCircuitPulse(e.clientX, e.clientY)}
      >
        {props.children}
      </Link>
    );
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    emitCircuitPulse(e.clientX, e.clientY);
    onClick?.(e);
  }

  return (
    <button
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
      onClick={handleClick}
      {...props}
    />
  );
}
