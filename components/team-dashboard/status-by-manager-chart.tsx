export type ManagerStatusPoint = { label: string; green: number; amber: number; red: number };

const WIDTH = 720;
const HEIGHT = 220;
const PAD_X = 12;
const PAD_Y = 16;
const LABEL_H = 32;
const GAP_RATIO = 0.35;

export function StatusByManagerChart({ points }: { points: ManagerStatusPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-text-muted">Немає даних для відображення.</p>;
  }

  const totals = points.map((p) => p.green + p.amber + p.red);
  const max = Math.max(...totals, 1);

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2 - LABEL_H;
  const slot = innerW / points.length;
  const barWidth = Math.min(slot * (1 - GAP_RATIO), 48);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
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
          const segments = [
            { value: p.green, color: "var(--color-positive)" },
            { value: p.amber, color: "var(--color-warning)" },
            { value: p.red, color: "var(--color-negative)" },
          ];
          let yCursor = PAD_Y + innerH;
          const total = p.green + p.amber + p.red;
          return (
            <g key={i}>
              {segments.map((seg, si) => {
                const h = (innerH * seg.value) / max;
                yCursor -= h;
                return <rect key={si} x={x} y={yCursor} width={barWidth} height={h} fill={seg.color} />;
              })}
              <text
                x={x + barWidth / 2}
                y={PAD_Y + innerH - (innerH * total) / max - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-text-secondary)"
              >
                {total}
              </text>
              <text
                x={x + barWidth / 2}
                y={PAD_Y + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {p.label.length > 12 ? `${p.label.slice(0, 11)}…` : p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-positive" /> Green
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" /> Amber
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-negative" /> Red
        </span>
      </div>
    </div>
  );
}
