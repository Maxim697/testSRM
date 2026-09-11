"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "graphite-emerald" | "milk";

const THEMES: Theme[] = ["dark", "light", "graphite-emerald", "milk"];
const DEFAULT_THEME: Theme = "dark";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as string[]).includes(value);
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(
  null,
);

function applyTheme(theme: Theme) {
  // Always an explicit value — including "dark" — so the selector's
  // current choice is never encoded as "no attribute". :root already
  // carries the dark theme's own values regardless, so this is purely
  // for the attribute to reflect the real, persisted choice.
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage unavailable, theme still applies for this session
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    let stored: Theme = DEFAULT_THEME;
    try {
      const raw = localStorage.getItem("theme");
      if (isTheme(raw)) stored = raw;
    } catch {
      // localStorage unavailable, keep default
    }
    document.documentElement.setAttribute("data-theme", stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs React state with the theme read from localStorage on mount
    setThemeState(stored);
  }, []);

  function setTheme(next: Theme) {
    applyTheme(next);
    setThemeState(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
