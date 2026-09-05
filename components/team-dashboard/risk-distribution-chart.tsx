import { RISK_LEVEL_LABELS, type RiskLevel } from "@/lib/risk-score";

const WIDTH = 720;
const HEIGHT = 220;
const PAD_X = 24;
const PAD_Y = 16;
const LABEL_H = 32;

const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: "var(--color-positive)",
  medium: "var(--color-warning)",
  high: "var(--color-negative)",
  critical: "var(--color-negative)",
};

const LEVEL_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

export function RiskDistributionChart({ counts }: { counts: Record<RiskLevel, number> }) {
  const max = Math.max(...LEVEL_ORDER.map((l) => counts[l]), 1);
  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2 - LABEL_H;
  const slot = innerW / LEVEL_ORDER.length;
  const barWidth = Math.min(slot * 0.5, 90);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
      <line
        x1={PAD_X}
        y1={PAD_Y + innerH}
        x2={WIDTH - PAD_X}
        y2={PAD_Y + innerH}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      {LEVEL_ORDER.map((level, i) => {
        const value = counts[level];
        const x = PAD_X + slot * i + (slot - barWidth) / 2;
        const h = (innerH * value) / max;
        const y = PAD_Y + innerH - h;
        const opacity = level === "critical" ? 1 : level === "high" ? 0.7 : 1;
        return (
          <g key={level}>
            <rect x={x} y={y} width={barWidth} height={h} fill={LEVEL_COLORS[level]} opacity={opacity} rx={3} />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={12} fill="var(--color-text-primary)" fontWeight={600}>
              {value}
            </text>
            <text
              x={x + barWidth / 2}
              y={PAD_Y + innerH + 18}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-text-secondary)"
            >
              {RISK_LEVEL_LABELS[level]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
