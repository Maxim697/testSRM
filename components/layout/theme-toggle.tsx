"use client";

import { useTheme, type Theme } from "@/components/theme-provider";
import { Select } from "@/components/ui/select";

const THEME_LABELS: Record<Theme, string> = {
  dark: "Темна синя",
  light: "Світла синя",
  "graphite-emerald": "Графіт-ізумруд",
  milk: "Молочна",
  emerald: "Смарагд",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      className="w-40"
    >
      {(Object.keys(THEME_LABELS) as Theme[]).map((value) => (
        <option key={value} value={value}>
          {THEME_LABELS[value]}
        </option>
      ))}
    </Select>
  );
}
