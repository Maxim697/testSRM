"use client";

import { useId, useState } from "react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export type TrendPoint = { weekStart: string; value: number };

const WIDTH = 720;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_Y = 16;

function formatValue(value: number, format: "number" | "percent"): string {
  return format === "percent" ? formatPercent(value, 1) : formatNumber(value);
}

export function TrendChart({
  points,
  variant = "line",
  color = "var(--info)",
  format = "number",
}: {
  points: TrendPoint[];
  variant?: "line" | "area";
  color?: string;
  format?: "number" | "percent";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;

  const coords = points.map((p, i) => {
    const x = PAD_X + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = PAD_Y + innerH - (innerH * (p.value - min)) / range;
    return { x, y, point: p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath =
    variant === "area" && coords.length > 0
      ? `${linePath} L${coords[coords.length - 1]!.x},${PAD_Y + innerH} L${coords[0]!.x},${PAD_Y + innerH} Z`
      : null;

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: HEIGHT }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line
          x1={PAD_X}
          y1={PAD_Y + innerH}
          x2={WIDTH - PAD_X}
          y2={PAD_Y + innerH}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 4 : 3}
              fill={color}
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
          <div className="font-medium tabular-nums">{formatValue(hovered.point.value, format)}</div>
          <div className="text-text-muted">{formatDate(hovered.point.weekStart)}</div>
        </div>
      )}
    </div>
  );
}
