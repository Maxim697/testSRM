"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  label: string;
  value: string;
};

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.value,
  );
  const activeValue = value ?? internalValue;

  function handleSelect(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }

  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {items.map((item) => {
        const isActive = item.value === activeValue;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => handleSelect(item.value)}
            className={cn(
              "relative h-8 px-3 text-base font-medium text-text-secondary transition-colors hover:text-text-primary",
              isActive && "text-text-primary",
            )}
          >
            {item.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-info" />
            )}
          </button>
        );
      })}
    </div>
  );
}
