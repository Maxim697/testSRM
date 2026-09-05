"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

export type ScoreTrendPoint = {
  weekStart: string;
  score: number | null;
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

export function ScoreTrendChart({
  points,
  className,
}: {
  points: ScoreTrendPoint[];
  className?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scores = points.map((p) => p.score ?? 0);
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const range = dataMax - dataMin || 1;
  const padding = Math.max(range * 0.15, 2);
  const min = Math.max(0, Math.floor(dataMin - padding));
  const max = Math.ceil(dataMax + padding);
  const scaledRange = max - min || 1;

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => {
    const x = PAD_LEFT + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = PAD_TOP + innerH - (innerH * ((p.score ?? min) - min)) / scaledRange;
    return { x, y, point: p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1]!.x},${PAD_TOP + innerH} L${coords[0]!.x},${PAD_TOP + innerH} Z`
      : "";

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const firstLabel = points[0]?.weekStart;
  const lastLabel = points[points.length - 1]?.weekStart;

  return (
    <div className={className ?? "relative h-full w-full"}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Y-axis gridlines + labels */}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={WIDTH - PAD_RIGHT} y2={PAD_TOP} stroke="var(--color-border)" strokeWidth={1} />
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + innerH}
          x2={WIDTH - PAD_RIGHT}
          y2={PAD_TOP + innerH}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <text x={PAD_LEFT - 6} y={PAD_TOP + 4} textAnchor="end" fontSize={11} fill="var(--color-text-muted)">
          {max}
        </text>
        <text x={PAD_LEFT - 6} y={PAD_TOP + innerH + 4} textAnchor="end" fontSize={11} fill="var(--color-text-muted)">
          {min}
        </text>

        {/* X-axis labels */}
        {firstLabel && (
          <text x={PAD_LEFT} y={HEIGHT - 6} textAnchor="start" fontSize={11} fill="var(--color-text-muted)">
            {formatDate(firstLabel)}
          </text>
        )}
        {lastLabel && (
          <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 6} textAnchor="end" fontSize={11} fill="var(--color-text-muted)">
            {formatDate(lastLabel)}
          </text>
        )}

        <path d={areaPath} fill="var(--color-info)" fillOpacity={0.16} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-info)" strokeWidth={2} />
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
          className="pointer-events-none absolute rounded-control border border-border bg-surface-3 px-2 py-1 text-xs text-text-primary"
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
