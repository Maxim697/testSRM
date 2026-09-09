import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface-3 text-text-primary hover:bg-border-strong",
  ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
};

const BASE_CLASSES =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 text-base font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

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
