"use client";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={cn(
        "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-3 text-base text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      )}
      aria-label="Перемкнути тему"
    >
      {isLight ? "Світла" : "Темна"}
    </button>
  );
}
