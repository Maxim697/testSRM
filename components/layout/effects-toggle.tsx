"use client";

import { useEffectsIntensity, type EffectsIntensity } from "@/components/effects-provider";

const LABELS: Record<EffectsIntensity, string> = {
  full: "Повна",
  moderate: "Помірна",
  off: "Вимкнено",
};

const ORDER: EffectsIntensity[] = ["full", "moderate", "off"];

export function EffectsToggle() {
  const { intensity, setIntensity } = useEffectsIntensity();

  function cycle() {
    const idx = ORDER.indexOf(intensity);
    setIntensity(ORDER[(idx + 1) % ORDER.length]!);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="pcb-field flex h-8 items-center gap-1.5 whitespace-nowrap px-3 text-base text-text-secondary hover:text-text-primary"
      aria-label="Інтенсивність фонових ефектів"
      title="Інтенсивність фонових ефектів"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: intensity === "off" ? "var(--text-muted)" : "var(--circuit-glow)",
          boxShadow: intensity === "full" ? "0 0 6px var(--circuit-glow)" : "none",
        }}
      />
      {LABELS[intensity]}
    </button>
  );
}
