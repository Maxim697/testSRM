"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

export type DualLinePoint = { weekStart: string; a: number | null; b: number | null };

const WIDTH = 720;
const HEIGHT = 200;
const PAD_X = 12;
const PAD_Y = 16;

function buildPath(values: (number | null)[], min: number, max: number, innerW: number, innerH: number) {
  const range = max - min || 1;
  const coords = values.map((v, i) => {
    const x = PAD_X + (values.length === 1 ? innerW / 2 : (innerW * i) / (values.length - 1));
    const y = PAD_Y + innerH - (innerH * ((v ?? min) - min)) / range;
    return { x, y, v };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  return { coords, path };
}

export function DualLineChart({
  points,
  labelA,
  labelB,
  colorA = "var(--info)",
  colorB = "var(--color-series-4)",
}: {
  points: DualLinePoint[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const aValues = points.map((p) => p.a);
  const bValues = points.map((p) => p.b);
  const allValues = [...aValues, ...bValues].filter((v): v is number => v !== null);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;

  const { coords: coordsA, path: pathA } = buildPath(aValues, min, max, innerW, innerH);
  const { coords: coordsB, path: pathB } = buildPath(bValues, min, max, innerW, innerH);

  const hoveredWeek = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? coordsA[hoverIndex]!.x : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
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
        <path d={pathA} fill="none" stroke={colorA} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathB} fill="none" stroke={colorB} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coordsA.map((c, i) => (
          <circle key={`a-${i}`} cx={c.x} cy={c.y} r={hoverIndex === i ? 4 : 3} fill={colorA} stroke="var(--color-surface-2)" strokeWidth={1.5} />
        ))}
        {coordsB.map((c, i) => (
          <circle key={`b-${i}`} cx={c.x} cy={c.y} r={hoverIndex === i ? 4 : 3} fill={colorB} stroke="var(--color-surface-2)" strokeWidth={1.5} />
        ))}
        {coordsA.map((c, i) => (
          <rect
            key={`hit-${i}`}
            x={c.x - innerW / points.length / 2}
            y={0}
            width={innerW / points.length}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}
      </svg>
      {hoveredWeek && hoveredX !== null && (
        <div
          className="pointer-events-none absolute rounded-control border border-border bg-surface-3 px-2 py-1 text-xs text-text-primary"
          style={{ left: `${(hoveredX / WIDTH) * 100}%`, top: 0, transform: "translate(-50%, -110%)" }}
        >
          <div className="text-text-muted">{formatDate(hoveredWeek.weekStart)}</div>
          <div style={{ color: colorA }}>{labelA}: {hoveredWeek.a ?? "—"}</div>
          <div style={{ color: colorB }}>{labelB}: {hoveredWeek.b ?? "—"}</div>
        </div>
      )}
    </div>
  );
}
