"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(
  null,
);

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage unavailable, theme still applies for this session
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    let stored: Theme = "dark";
    try {
      stored = localStorage.getItem("theme") === "light" ? "light" : "dark";
    } catch {
      // localStorage unavailable, keep default
    }
    if (stored === "light") document.documentElement.setAttribute("data-theme", "light");
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
