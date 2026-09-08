"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";

/* ==========================================================================
   Geometry — traces are marched along a slowly-varying flow field (shared by
   every line on the board, so parallel starts stay parallel and bend
   together), snapped to the 8-way H/V/45° compass each step, deflecting
   around chip/pad rectangles when the field would walk into one. This
   produces long coherent parallel bundles that flow one general direction
   and route around obstacles, like a real routed board — rather than
   independent point-to-point wires.
   ========================================================================== */

type Pt = { x: number; y: number };

const GRID = 6;
const SQ = Math.SQRT1_2;
const DIR_VECS: Pt[] = [
  { x: 1, y: 0 },
  { x: SQ, y: SQ },
  { x: 0, y: 1 },
  { x: -SQ, y: SQ },
  { x: -1, y: 0 },
  { x: -SQ, y: -SQ },
  { x: 0, y: -1 },
  { x: SQ, y: -SQ },
];
/** Overall flow direction: down-and-right, matching the requested pulse
 * direction (top-to-bottom, left-to-right) — every track is generated
 * start-to-end along this bias, so a pulse just walking a track forward
 * automatically respects it. */
const BASE_DIR_IDX = 1; // SE

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}
function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function distPt(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  margin: number,
): boolean {
  return !(
    a.x + a.w + margin < b.x ||
    b.x + b.w + margin < a.x ||
    a.y + a.h + margin < b.y ||
    b.y + b.h + margin < a.y
  );
}
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ==========================================================================
   Board data model
   ========================================================================== */

type Track = { points: Pt[]; cumLen: number[]; totalLen: number; width: number };
type ChipEdge = { dirIdx: number; pins: Pt[] };
type Chip = { x: number; y: number; w: number; h: number; edges: ChipEdge[] };
type Connector = { dirIdx: number; pins: Pt[] };
type PadSmall = { x: number; y: number; square: boolean };
type PadLarge = { x: number; y: number; w: number; h: number };
type Via = { x: number; y: number };

type Board = {
  width: number;
  height: number;
  tracks: Track[];
  chips: Chip[];
  connectors: Connector[];
  padsSmall: PadSmall[];
  padsLarge: PadLarge[];
  vias: Via[];
};

function makeTrack(points: Pt[], width: number): Track {
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + distPt(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width };
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBoard(width: number, height: number, rand: () => number): Board {
  const chips: Chip[] = [];
  const connectors: Connector[] = [];
  const padsSmall: PadSmall[] = [];
  const padsLarge: PadLarge[] = [];
  const vias: Via[] = [];
  const tracks: Track[] = [];
  const obstacles: { x: number; y: number; w: number; h: number }[] = [];

  // --- chips: dense rectangles with pinned edges (obstacles the flow routes around) ---
  const chipCount = clampNum(Math.round((width * height) / 58000), 8, 26);
  for (let i = 0; i < chipCount; i++) {
    for (let attempt = 0; attempt < 14; attempt++) {
      const w = snap(36 + rand() * 84, GRID);
      const h = snap(36 + rand() * 84, GRID);
      const x = snap(24 + rand() * Math.max(1, width - w - 48), GRID);
      const y = snap(24 + rand() * Math.max(1, height - h - 48), GRID);
      const rect = { x, y, w, h };
      if (obstacles.some((r) => rectsOverlap(rect, r, 24))) continue;
      obstacles.push(rect);

      const vertical = rand() < 0.5;
      const edges: ChipEdge[] = [];
      const pinPitch = 9;
      if (vertical) {
        const count = clampNum(Math.floor(h / pinPitch) - 1, 2, 9);
        edges.push({ dirIdx: 4, pins: Array.from({ length: count }, (_, p) => ({ x, y: y + (h * (p + 1)) / (count + 1) })) });
        edges.push({ dirIdx: 0, pins: Array.from({ length: count }, (_, p) => ({ x: x + w, y: y + (h * (p + 1)) / (count + 1) })) });
      } else {
        const count = clampNum(Math.floor(w / pinPitch) - 1, 2, 9);
        edges.push({ dirIdx: 6, pins: Array.from({ length: count }, (_, p) => ({ x: x + (w * (p + 1)) / (count + 1), y })) });
        edges.push({ dirIdx: 2, pins: Array.from({ length: count }, (_, p) => ({ x: x + (w * (p + 1)) / (count + 1), y: y + h })) });
      }
      chips.push({ x, y, w, h, edges });
      break;
    }
  }

  // --- large filled/rounded zones — also obstacles, like a chip's footprint ---
  const padLargeCount = clampNum(Math.round((width * height) / 210000), 2, 7);
  for (let i = 0; i < padLargeCount; i++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const w = snap(28 + rand() * 52, GRID);
      const h = snap(22 + rand() * 38, GRID);
      const x = snap(30 + rand() * Math.max(1, width - w - 60), GRID);
      const y = snap(30 + rand() * Math.max(1, height - h - 60), GRID);
      const rect = { x, y, w, h };
      if (obstacles.some((r) => rectsOverlap(rect, r, 18))) continue;
      obstacles.push(rect);
      padsLarge.push(rect);
      break;
    }
  }

  // --- connectors: small decorative pin headers, not routed to ---
  const connectorCount = clampNum(Math.round((width * height) / 170000), 2, 8);
  for (let i = 0; i < connectorCount; i++) {
    const x = snap(30 + rand() * Math.max(1, width - 60), GRID);
    const y = snap(30 + rand() * Math.max(1, height - 60), GRID);
    const horizontal = rand() < 0.5;
    const count = 2 + Math.floor(rand() * 5);
    const pitch = 8;
    const dirIdx = horizontal ? (rand() < 0.5 ? 6 : 2) : rand() < 0.5 ? 0 : 4;
    const pins: Pt[] = [];
    for (let p = 0; p < count; p++) pins.push(horizontal ? { x: x + p * pitch, y } : { x, y: y + p * pitch });
    connectors.push({ dirIdx, pins });
  }

  // --- flow field: shared by every marched line so nearby starts stay parallel ---
  const fieldSeedA = rand() * 10;
  const fieldSeedB = rand() * 10;
  function flowDirIdx(x: number, y: number): number {
    const nx = x / 460;
    const ny = y / 460;
    const wobble = Math.sin(nx * 1.1 + ny * 0.6 + fieldSeedA) * 1.15 + Math.sin(nx * 0.4 - ny * 1.3 + fieldSeedB) * 0.75;
    const shift = Math.round(clampNum(wobble, -2, 2));
    return (((BASE_DIR_IDX + shift) % 8) + 8) % 8;
  }

  function insideObstacle(pt: Pt, margin: number): boolean {
    for (const r of obstacles) if (pt.x > r.x - margin && pt.x < r.x + r.w + margin && pt.y > r.y - margin && pt.y < r.y + r.h + margin) return true;
    return false;
  }

  function marchLine(start: Pt): Pt[] {
    const pts: Pt[] = [{ ...start }];
    let cur = { ...start };
    let steps = 0;
    while (steps < 500) {
      steps++;
      const desired = flowDirIdx(cur.x, cur.y);
      const stepLen = GRID * (2 + Math.floor(rand() * 3));
      let placed = false;
      for (const delta of [0, 1, -1, 2, -2, 3, -3]) {
        const tryDir = (((desired + delta) % 8) + 8) % 8;
        const d = DIR_VECS[tryDir]!;
        const cand = { x: cur.x + d.x * stepLen, y: cur.y + d.y * stepLen };
        if (!insideObstacle(cand, 5)) {
          cur = cand;
          pts.push(cur);
          placed = true;
          break;
        }
      }
      if (!placed) break;
      if (cur.x < -100 || cur.x > width + 100 || cur.y < -100 || cur.y > height + 100) break;
    }
    return pts;
  }

  // dense diagonal-hatch fill: seed lines along the top and left edges so
  // the whole canvas is covered by long parallel SE-flowing bundles
  const LANE = 9 + rand() * 4;
  const margin = 60;
  const starts: Pt[] = [];
  for (let y = -margin; y < height + margin; y += LANE) starts.push({ x: -margin, y });
  for (let x = -margin; x < width + margin; x += LANE) starts.push({ x, y: -margin });

  for (const s of starts) {
    const pts = marchLine(s);
    if (pts.length < 2) continue;
    const trackWidth = 1 + rand();
    tracks.push(makeTrack(pts, trackWidth));

    if (rand() < 0.4) {
      const viaCount = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < viaCount; k++) {
        const idx = pts.length > 2 ? 1 + Math.floor(rand() * (pts.length - 2)) : 0;
        vias.push({ x: pts[idx]!.x, y: pts[idx]!.y });
      }
    }
    const last = pts[pts.length - 1]!;
    const endedInsideCanvas = last.x > -40 && last.x < width + 40 && last.y > -40 && last.y < height + 40;
    if (endedInsideCanvas && rand() < 0.5) padsSmall.push({ x: last.x, y: last.y, square: rand() < 0.5 });
  }

  return { width, height, tracks, chips, connectors, padsSmall, padsLarge, vias };
}

function drawStaticBoard(ctx: CanvasRenderingContext2D, board: Board, traceColor: string) {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.strokeStyle = traceColor;
  ctx.fillStyle = traceColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const t of board.tracks) {
    ctx.lineWidth = t.width;
    ctx.beginPath();
    ctx.moveTo(t.points[0]!.x, t.points[0]!.y);
    for (let i = 1; i < t.points.length; i++) ctx.lineTo(t.points[i]!.x, t.points[i]!.y);
    ctx.stroke();
  }

  // vias — a ring with a center dot, not a filled disc
  ctx.lineWidth = 1;
  for (const v of board.vias) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(v.x, v.y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of board.padsSmall) {
    if (p.square) ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const pad of board.padsLarge) roundRectPath(ctx, pad.x, pad.y, pad.w, pad.h, 3);
  if (board.padsLarge.length > 0) ctx.fill();

  ctx.lineWidth = 1;
  for (const chip of board.chips) {
    ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);
    for (const edge of chip.edges) {
      const d = DIR_VECS[edge.dirIdx]!;
      for (const pin of edge.pins) {
        ctx.beginPath();
        ctx.moveTo(pin.x, pin.y);
        ctx.lineTo(pin.x + d.x * 6, pin.y + d.y * 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const conn of board.connectors) {
    const d = DIR_VECS[conn.dirIdx]!;
    for (const pin of conn.pins) {
      ctx.beginPath();
      ctx.moveTo(pin.x, pin.y);
      ctx.lineTo(pin.x + d.x * 7, pin.y + d.y * 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ==========================================================================
   Pulses — each one walks a single track's own points from start to end
   (never jumping to another track), so it always follows that exact trace's
   bends and — since every track is marched SE from the top/left edge — the
   motion is always generally top-to-bottom and left-to-right.
   ========================================================================== */

function findSegIndex(cum: number[], s: number): number {
  if (s <= cum[0]!) return 0;
  const last = cum.length - 1;
  if (s >= cum[last]!) return Math.max(0, last - 1);
  let lo = 0;
  let hi = last;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! <= s) lo = mid;
    else hi = mid;
  }
  return lo;
}
function interpAt(pts: Pt[], cum: number[], s: number): Pt {
  const i = findSegIndex(cum, s);
  const a = pts[i]!;
  const b = pts[i + 1] ?? a;
  const segLen = (cum[i + 1] ?? cum[i]!) - cum[i]! || 1;
  const t = clampNum((s - cum[i]!) / segLen, 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

type Pulse = {
  trackIdx: number;
  traveled: number;
  trailLen: number;
  speed: number;
  hue: "green" | "cyan";
  bright: number;
  decay: number;
};

function spawnPulse(board: Board, rand: () => number, opts: { trackIdx?: number; startS?: number; burst?: boolean } = {}): Pulse | null {
  if (board.tracks.length === 0) return null;
  const trackIdx = opts.trackIdx ?? Math.floor(rand() * board.tracks.length);
  const track = board.tracks[trackIdx];
  if (!track || track.totalLen <= 1) return null;
  const burst = opts.burst ?? false;
  return {
    trackIdx,
    traveled: Math.max(0, opts.startS ?? 0),
    trailLen: 50 + rand() * 50,
    speed: burst ? 220 + rand() * 160 : 55 + rand() * 90,
    hue: rand() < 0.6 ? "green" : "cyan",
    bright: 1,
    decay: burst ? 0.9 + rand() * 0.6 : 0,
  };
}

function pointSegDist(px: number, py: number, a: Pt, b: Pt, cumA: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  const t = clampNum(((px - a.x) * dx + (py - a.y) * dy) / lenSq, 0, 1);
  const cx = a.x + dx * t;
  const cy = a.y + dy * t;
  const ddx = px - cx;
  const ddy = py - cy;
  return { distSq: ddx * ddx + ddy * ddy, s: cumA + t * Math.sqrt(lenSq) };
}

function nearestTrackPosition(board: Board, x: number, y: number): { trackIdx: number; s: number } | null {
  let best: { trackIdx: number; s: number } | null = null;
  let bestDistSq = Infinity;
  for (let ti = 0; ti < board.tracks.length; ti++) {
    const t = board.tracks[ti]!;
    for (let i = 1; i < t.points.length; i++) {
      const { distSq, s } = pointSegDist(x, y, t.points[i - 1]!, t.points[i]!, t.cumLen[i - 1]!);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = { trackIdx: ti, s };
      }
    }
  }
  return best;
}

const TARGET_FRAME_MS = 1000 / 30;
const NEARBY_RADIUS_FULL = 20;
const NEARBY_RADIUS_MODERATE = 14;

/* ==========================================================================
   Component
   ========================================================================== */

export function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { intensity } = useEffectsIntensity();
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let board: Board | null = null;
    let staticCanvas: HTMLCanvasElement | null = null;
    let pulses: Pulse[] = [];
    let rand = mulberry32(Date.now() & 0xffffffff);
    let rafId = 0;
    let lastFrame = 0;
    let lastSpawn = 0;
    let running = true;
    let dpr = 1;

    function currentPalette() {
      const styles = getComputedStyle(document.documentElement);
      return {
        trace: styles.getPropertyValue("--circuit-trace").trim() || "rgba(47,229,138,0.08)",
        glow: styles.getPropertyValue("--circuit-glow").trim() || "#7dffc4",
        glowCyan: styles.getPropertyValue("--circuit-glow-cyan").trim() || "#6df0ff",
      };
    }

    function rebuild() {
      if (!canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width <= 0 || height <= 0) {
        requestAnimationFrame(rebuild);
        return;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      rand = mulberry32((Date.now() ^ (width * height)) & 0xffffffff);
      board = buildBoard(width, height, rand);

      staticCanvas = document.createElement("canvas");
      staticCanvas.width = width;
      staticCanvas.height = height;
      const staticCtx = staticCanvas.getContext("2d");
      if (staticCtx) drawStaticBoard(staticCtx, board, currentPalette().trace);

      pulses = [];
      const count = intensityRef.current === "moderate" ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const p = spawnPulse(board, rand);
        if (p) pulses.push(p);
      }
      drawFrame(0);
    }

    function drawFrame(dtMs: number) {
      if (!board || !staticCanvas || !ctx) return;
      if (staticCanvas.width === 0 || staticCanvas.height === 0) return;
      const width = board.width;
      const height = board.height;
      const palette = currentPalette();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);

      if (intensityRef.current === "off") return;

      const moderate = intensityRef.current === "moderate";
      const glowScale = moderate ? 0.55 : 1;
      const dt = Math.min(dtMs, 80) / 1000;
      const nearbyR = moderate ? NEARBY_RADIUS_MODERATE : NEARBY_RADIUS_FULL;

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const pulse of pulses) {
        const track = board.tracks[pulse.trackIdx];
        if (!track) continue;
        pulse.traveled += pulse.speed * dt;
        if (pulse.decay > 0) pulse.bright = Math.max(0, pulse.bright - pulse.decay * dt);
        if (pulse.traveled >= track.totalLen || pulse.bright <= 0.02) continue;

        const head = interpAt(track.points, track.cumLen, pulse.traveled);
        const color = pulse.hue === "green" ? palette.glow : palette.glowCyan;

        // the trace itself brightens under the pulse and fades behind it —
        // stroked along the real preceding vertices, so it follows bends
        const trailStart = Math.max(0, pulse.traveled - pulse.trailLen);
        const startIdx = findSegIndex(track.cumLen, trailStart);
        const headIdx = findSegIndex(track.cumLen, pulse.traveled);
        const startPt = interpAt(track.points, track.cumLen, trailStart);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(track.width + 0.6, 1.8);
        ctx.globalAlpha = 0.9 * glowScale * pulse.bright;
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        for (let i = startIdx + 1; i <= headIdx; i++) ctx.lineTo(track.points[i]!.x, track.points[i]!.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();

        // a tight halo at the head — no wide soft blur
        const haloR = moderate ? 6 : 9;
        const gradient = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, haloR);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.55, color);
        gradient.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.85 * glowScale * pulse.bright;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(head.x, head.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = pulse.bright;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // crisp, sharply-defined flashes on real nearby elements — geometry
        // traced directly, not a diffuse gradient blob
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        for (const chip of board.chips) {
          const cx = clampNum(head.x, chip.x, chip.x + chip.w);
          const cy = clampNum(head.y, chip.y, chip.y + chip.h);
          const d = Math.hypot(head.x - cx, head.y - cy);
          if (d >= nearbyR) continue;
          ctx.globalAlpha = (1 - d / nearbyR) * 0.9 * pulse.bright * glowScale;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);
        }
        for (const pl of board.padsLarge) {
          const cx = clampNum(head.x, pl.x, pl.x + pl.w);
          const cy = clampNum(head.y, pl.y, pl.y + pl.h);
          const d = Math.hypot(head.x - cx, head.y - cy);
          if (d >= nearbyR) continue;
          ctx.globalAlpha = (1 - d / nearbyR) * 0.9 * pulse.bright * glowScale;
          ctx.lineWidth = 1.4;
          roundRectPath(ctx, pl.x, pl.y, pl.w, pl.h, 3);
          ctx.stroke();
        }
        for (const p of board.padsSmall) {
          const d = distPt(head, p);
          if (d >= nearbyR) continue;
          ctx.globalAlpha = (1 - d / nearbyR) * pulse.bright * glowScale;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.square ? 3 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const v of board.vias) {
          const d = distPt(head, v);
          if (d >= nearbyR) continue;
          ctx.globalAlpha = (1 - d / nearbyR) * pulse.bright * glowScale;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 3.6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      pulses = pulses.filter((p) => {
        const t = board!.tracks[p.trackIdx];
        return t !== undefined && p.traveled < t.totalLen && p.bright > 0.02;
      });

      const targetCount = moderate ? 3 : 6;
      const spawnGapMs = moderate ? 2600 : 900;
      if (pulses.length < targetCount && dtMs > 0) {
        lastSpawn += dtMs;
        if (lastSpawn > spawnGapMs) {
          lastSpawn = 0;
          const p = spawnPulse(board, rand);
          if (p) pulses.push(p);
        }
      }
    }

    function loop(now: number) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (intensityRef.current === "off") {
        if (lastFrame !== -1) {
          drawFrame(0);
          lastFrame = -1;
        }
        return;
      }
      const elapsed = now - lastFrame;
      if (lastFrame > 0 && elapsed < TARGET_FRAME_MS) return;
      const dt = lastFrame > 0 ? elapsed : 16;
      lastFrame = now;
      drawFrame(dt);
    }

    function handleVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!running) {
        running = true;
        lastFrame = 0;
        rafId = requestAnimationFrame(loop);
      }
    }

    function handleBurst(event: Event) {
      if (!board || intensityRef.current === "off") return;
      const detail = (event as CustomEvent<CircuitPulseDetail>).detail;
      if (!detail) return;
      const nearest = nearestTrackPosition(board, detail.x, detail.y);
      if (!nearest) return;
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        const p = spawnPulse(board, rand, { trackIdx: nearest.trackIdx, startS: nearest.s - rand() * 40, burst: true });
        if (p) pulses.push(p);
      }
    }

    let resizeTimer: number | undefined;
    function handleResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 250);
    }

    rebuild();
    rafId = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);
    window.addEventListener(CIRCUIT_PULSE_EVENT, handleBurst);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(CIRCUIT_PULSE_EVENT, handleBurst);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="circuit-canvas pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
