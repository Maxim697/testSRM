"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

export type ScoreTrendPoint = {
  weekStart: string;
  score: number | null;
};

const WIDTH = 720;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_Y = 16;

export function ScoreTrendChart({ points }: { points: ScoreTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scores = points.map((p) => p.score ?? 0);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;

  const coords = points.map((p, i) => {
    const x = PAD_X + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = PAD_Y + innerH - (innerH * ((p.score ?? min) - min)) / range;
    return { x, y, point: p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

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
        <path d={path} fill="none" stroke="var(--color-info)" strokeWidth={2} />
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 4 : 3}
              fill="var(--color-info)"
              stroke="var(--color-surface-2)"
              strokeWidth={1.5}
            />
            <rect
              x={c.x - innerW / points.length / 2}
              y={0}
              width={innerW / points.length}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          </g>
        ))}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute rounded-control border border-border bg-surface-3 px-2 py-1 text-xs text-text-primary shadow-none"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -110%)",
          }}
        >
          <div className="font-medium tabular-nums">{hovered.point.score ?? "—"}</div>
          <div className="text-text-muted">{formatDate(hovered.point.weekStart)}</div>
        </div>
      )}
    </div>
  );
}
