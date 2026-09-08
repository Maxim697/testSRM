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
      className="term-field flex h-8 items-center gap-1.5 whitespace-nowrap px-3 text-xs uppercase tracking-wide text-text-secondary hover:text-text-primary"
      aria-label="Інтенсивність фонових ефектів"
      title="Інтенсивність фонових ефектів"
    >
      <span
        className="h-2 w-2 shrink-0"
        style={{ background: intensity === "off" ? "var(--text-muted)" : "var(--term-glow)" }}
      />
      [{LABELS[intensity]}]
    </button>
  );
}
