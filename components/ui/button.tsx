import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-info text-info hover:bg-info hover:text-surface-0",
  secondary:
    "border border-border-strong text-text-primary hover:bg-text-primary hover:text-surface-0",
  ghost: "border border-transparent text-text-secondary hover:bg-text-secondary hover:text-surface-0",
};

const BASE_CLASSES =
  "term-button inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-base font-medium disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: string;
};

export function Button({ variant = "primary", className, href, ...props }: ButtonProps) {
  if (href) {
    // prefetch={false}: these buttons mostly link to per-row detail pages
    // (a specific trader) inside a list — with many rows on screen at
    // once, Next.js's default viewport prefetching was firing one full
    // server-rendered RSC request per row simultaneously (each one re-runs
    // that whole page's Supabase queries), which was measurably slowing
    // down the *actual* navigation the user just clicked (it had to queue
    // behind all those speculative ones). A real click still fetches on
    // demand, just not speculatively for every row that happens to be
    // visible.
    return (
      <Link href={href} prefetch={false} className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}>
        {props.children}
      </Link>
    );
  }

  return <button className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)} {...props} />;
}
