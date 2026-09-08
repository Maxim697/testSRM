"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type EffectsIntensity = "full" | "moderate" | "off";

const EffectsContext = createContext<{
  intensity: EffectsIntensity;
  setIntensity: (intensity: EffectsIntensity) => void;
} | null>(null);

function applyIntensity(intensity: EffectsIntensity) {
  document.documentElement.setAttribute("data-fx", intensity);
  try {
    localStorage.setItem("fx-intensity", intensity);
  } catch {
    // localStorage unavailable, setting still applies for this session
  }
}

export function EffectsProvider({ children }: { children: ReactNode }) {
  const [intensity, setIntensityState] = useState<EffectsIntensity>("full");

  useEffect(() => {
    let stored: EffectsIntensity | null = null;
    try {
      const raw = localStorage.getItem("fx-intensity");
      if (raw === "full" || raw === "moderate" || raw === "off") stored = raw;
    } catch {
      // localStorage unavailable, fall through to the media-query default
    }

    let next: EffectsIntensity;
    if (stored) {
      next = stored;
    } else {
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      next = prefersReduced ? "moderate" : "full";
    }

    document.documentElement.setAttribute("data-fx", next);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs React state with the persisted preference (or the OS motion setting) read on mount
    setIntensityState(next);
  }, []);

  function setIntensity(next: EffectsIntensity) {
    applyIntensity(next);
    setIntensityState(next);
  }

  return <EffectsContext.Provider value={{ intensity, setIntensity }}>{children}</EffectsContext.Provider>;
}

export function useEffectsIntensity() {
  const ctx = useContext(EffectsContext);
  if (!ctx) throw new Error("useEffectsIntensity must be used within an EffectsProvider");
  return ctx;
}
