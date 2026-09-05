import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InboxIcon } from "@/components/ui/empty-icons";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center rounded-card border border-dashed border-border py-24 text-center",
        className,
      )}
    >
      <div className="mb-3">{icon ?? <InboxIcon />}</div>
      <div className="text-lg font-medium text-text-primary">{title}</div>
      {description && (
        <div className="mt-2 max-w-sm text-base text-text-secondary">
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
