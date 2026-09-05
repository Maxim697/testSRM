"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

export type StackedBarPoint = {
  weekStart: string;
  green: number;
  amber: number;
  red: number;
};

const WIDTH = 720;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_Y = 16;
const GAP_RATIO = 0.35;

export function StackedBarChart({ points }: { points: StackedBarPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const totals = points.map((p) => p.green + p.amber + p.red);
  const max = Math.max(...totals, 1);

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;
  const slot = innerW / points.length;
  const barWidth = slot * (1 - GAP_RATIO);

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: HEIGHT }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line
          x1={PAD_X}
          y1={PAD_Y + innerH}
          x2={WIDTH - PAD_X}
          y2={PAD_Y + innerH}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {points.map((p, i) => {
          const x = PAD_X + slot * i + (slot - barWidth) / 2;
          const segments: { value: number; color: string }[] = [
            { value: p.green, color: "var(--color-positive)" },
            { value: p.amber, color: "var(--color-warning)" },
            { value: p.red, color: "var(--color-negative)" },
          ];
          let yCursor = PAD_Y + innerH;
          return (
            <g key={i}>
              {segments.map((seg, si) => {
                const h = (innerH * seg.value) / max;
                yCursor -= h;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={yCursor}
                    width={barWidth}
                    height={h}
                    fill={seg.color}
                    opacity={hoverIndex === i ? 1 : 0.85}
                  />
                );
              })}
              <rect
                x={PAD_X + slot * i}
                y={0}
                width={slot}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            </g>
          );
        })}
      </svg>
      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-control border border-border bg-surface-3 px-2 py-1 text-xs text-text-primary"
          style={{
            left: `${((PAD_X + slot * hoverIndex + slot / 2) / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -110%)",
          }}
        >
          <div className="text-text-muted">{formatDate(hovered.weekStart)}</div>
          <div className="text-positive">Green: {hovered.green}</div>
          <div className="text-warning">Amber: {hovered.amber}</div>
          <div className="text-negative">Red: {hovered.red}</div>
        </div>
      )}
    </div>
  );
}
