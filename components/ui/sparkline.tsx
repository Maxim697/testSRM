const WIDTH = 84;
const HEIGHT = 28;
const PAD = 3;

export function Sparkline({ values, color = "var(--color-info)" }: { values: (number | null)[]; color?: string }) {
  const clean = values.map((v) => v ?? 0);
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;

  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;

  const points = clean.map((v, i) => {
    const x = PAD + (clean.length === 1 ? innerW / 2 : (innerW * i) / (clean.length - 1));
    const y = PAD + innerH - (innerH * (v - min)) / range;
    return { x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="inline-block align-middle">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      {last && <circle cx={last.x} cy={last.y} r={1.8} fill={color} />}
    </svg>
  );
}
