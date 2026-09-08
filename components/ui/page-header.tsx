import type { ReactNode } from "react";
import { Typewriter } from "@/components/ui/typewriter";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-info" aria-hidden="true">
            ▸
          </span>
          <Typewriter
            key={title}
            as="h1"
            text={title}
            className="term-heading text-xl font-semibold text-info"
          />
        </div>
        {description && (
          <p className="mt-1 text-base text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
