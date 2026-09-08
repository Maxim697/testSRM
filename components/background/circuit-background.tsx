"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";

/* ==========================================================================
   Geometry primitives — every trace is built from horizontal, vertical and
   45° segments only (8-way compass grid), so the board reads as an actual
   routed PCB rather than a point cloud with straight edges to nowhere.
   ========================================================================== */

type Pt = { x: number; y: number };

const GRID = 8;
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

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}
function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function addV(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}
function subV(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function scaleV(a: Pt, k: number): Pt {
  return { x: a.x * k, y: a.y * k };
}
function unitV(a: Pt): Pt {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
}
function distPt(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function leftNormal(d: Pt): Pt {
  return { x: d.y, y: -d.x };
}
function angleToDirIdx(dx: number, dy: number): number {
  const idx = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return ((idx % 8) + 8) % 8;
}

/** Turtle-walks a path of H/V/45° segments toward an optional target,
 * turning by at most 90° per step so bends stay plausible for a trace. */
function buildSpine(rand: () => number, start: Pt, startDirIdx: number, target: Pt | null, maxLen: number): Pt[] {
  const pts: Pt[] = [{ ...start }];
  let cur = { ...start };
  let dirIdx = startDirIdx;
  let travelled = 0;
  let iterations = 0;
  while (travelled < maxLen && iterations < 70) {
    iterations++;
    const runLen = GRID * (2 + Math.floor(rand() * 6));
    const d = DIR_VECS[dirIdx]!;
    const next = { x: cur.x + d.x * runLen, y: cur.y + d.y * runLen };
    pts.push(next);
    cur = next;
    travelled += runLen;
    if (target) {
      if (distPt(cur, target) < GRID * 3) {
        pts.push({ ...target });
        break;
      }
      const desired = angleToDirIdx(target.x - cur.x, target.y - cur.y);
      let diff = (desired - dirIdx + 8) % 8;
      if (diff > 4) diff -= 8;
      const step = diff === 0 ? 0 : diff > 0 ? 1 : -1;
      const magnitude = Math.min(Math.abs(diff), rand() < 0.6 ? 1 : 2);
      dirIdx = (((dirIdx + step * magnitude) % 8) + 8) % 8;
    } else {
      const r = rand();
      if (r < 0.85) {
        if (r >= 0.55) dirIdx = (((dirIdx + (rand() < 0.5 ? 1 : -1)) % 8) + 8) % 8;
      } else {
        dirIdx = (((dirIdx + (rand() < 0.5 ? 2 : -2)) % 8) + 8) % 8;
      }
    }
  }
  return pts;
}

/** Offsets a spine into a parallel lane using a bevel join at each corner —
 * for a 90° turn this naturally produces two 45° cut edges, matching real
 * PCB trace corners; for straight runs it's a simple perpendicular shift. */
function offsetSpine(spine: Pt[], offsetDist: number): Pt[] {
  if (Math.abs(offsetDist) < 0.01) return spine.map((p) => ({ ...p }));
  const out: Pt[] = [];
  for (let i = 0; i < spine.length; i++) {
    const cur = spine[i]!;
    if (i === 0) {
      const d = unitV(subV(spine[i + 1] ?? cur, cur));
      out.push(addV(cur, scaleV(leftNormal(d), offsetDist)));
    } else if (i === spine.length - 1) {
      const d = unitV(subV(cur, spine[i - 1] ?? cur));
      out.push(addV(cur, scaleV(leftNormal(d), offsetDist)));
    } else {
      const dIn = unitV(subV(cur, spine[i - 1]!));
      const dOut = unitV(subV(spine[i + 1]!, cur));
      const nIn = leftNormal(dIn);
      const nOut = leftNormal(dOut);
      if (Math.hypot(nIn.x - nOut.x, nIn.y - nOut.y) < 0.02) {
        out.push(addV(cur, scaleV(nIn, offsetDist)));
      } else {
        out.push(addV(cur, scaleV(nIn, offsetDist)));
        out.push(addV(cur, scaleV(nOut, offsetDist)));
      }
    }
  }
  return out;
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

type Track = {
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number;
  startAnchor: string;
  endAnchor: string;
};

type ChipEdge = { anchorId: string; point: Pt; dirIdx: number; pins: Pt[] };
type Chip = { x: number; y: number; w: number; h: number; edges: ChipEdge[] };
type Connector = { anchorId: string; point: Pt; dirIdx: number; pins: Pt[] };
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
  junctions: Map<string, number[]>;
  anchorPoints: Map<string, Pt>;
};

function makeTrack(points: Pt[], width: number, startAnchor: string, endAnchor: string): Track {
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + distPt(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width, startAnchor, endAnchor };
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
  const junctions = new Map<string, number[]>();
  const anchorPoints = new Map<string, Pt>();
  let deadendSeq = 0;

  function addJunction(id: string, trackIdx: number) {
    const arr = junctions.get(id);
    if (arr) arr.push(trackIdx);
    else junctions.set(id, [trackIdx]);
  }

  const placedRects: { x: number; y: number; w: number; h: number }[] = [];

  const chipCount = clampNum(Math.round((width * height) / 65000), 5, 18);
  for (let i = 0; i < chipCount; i++) {
    for (let attempt = 0; attempt < 14; attempt++) {
      const w = snap(40 + rand() * 80, GRID);
      const h = snap(40 + rand() * 80, GRID);
      const x = snap(24 + rand() * Math.max(1, width - w - 48), GRID);
      const y = snap(24 + rand() * Math.max(1, height - h - 48), GRID);
      const rect = { x, y, w, h };
      if (placedRects.some((r) => rectsOverlap(rect, r, 36))) continue;
      placedRects.push(rect);

      const vertical = rand() < 0.5;
      const edges: ChipEdge[] = [];
      const pinPitch = 10;
      function makeEdge(anchorId: string, point: Pt, dirIdx: number, count: number, pinAt: (p: number) => Pt) {
        const pins: Pt[] = [];
        for (let p = 0; p < count; p++) pins.push(pinAt(p));
        edges.push({ anchorId, point, dirIdx, pins });
        anchorPoints.set(anchorId, point);
      }
      if (vertical) {
        const count = clampNum(Math.floor(h / pinPitch) - 1, 2, 8);
        makeEdge(`chip${i}_l`, { x, y: y + h / 2 }, 4, count, (p) => ({ x, y: y + (h * (p + 1)) / (count + 1) }));
        makeEdge(`chip${i}_r`, { x: x + w, y: y + h / 2 }, 0, count, (p) => ({
          x: x + w,
          y: y + (h * (p + 1)) / (count + 1),
        }));
      } else {
        const count = clampNum(Math.floor(w / pinPitch) - 1, 2, 8);
        makeEdge(`chip${i}_t`, { x: x + w / 2, y }, 6, count, (p) => ({ x: x + (w * (p + 1)) / (count + 1), y }));
        makeEdge(`chip${i}_b`, { x: x + w / 2, y: y + h }, 2, count, (p) => ({
          x: x + (w * (p + 1)) / (count + 1),
          y: y + h,
        }));
      }
      chips.push({ x, y, w, h, edges });
      break;
    }
  }

  const connectorCount = clampNum(Math.round((width * height) / 160000), 2, 8);
  for (let i = 0; i < connectorCount; i++) {
    const x = snap(30 + rand() * Math.max(1, width - 60), GRID);
    const y = snap(30 + rand() * Math.max(1, height - 60), GRID);
    const horizontal = rand() < 0.5;
    const count = 2 + Math.floor(rand() * 5);
    const pitch = 9;
    const dirIdx = horizontal ? (rand() < 0.5 ? 6 : 2) : rand() < 0.5 ? 0 : 4;
    const pins: Pt[] = [];
    for (let p = 0; p < count; p++) pins.push(horizontal ? { x: x + p * pitch, y } : { x, y: y + p * pitch });
    const anchorId = `conn${i}`;
    const point = horizontal
      ? { x: x + ((count - 1) * pitch) / 2, y }
      : { x, y: y + ((count - 1) * pitch) / 2 };
    connectors.push({ anchorId, point, dirIdx, pins });
    anchorPoints.set(anchorId, point);
  }

  const padLargeCount = clampNum(Math.round((width * height) / 260000), 1, 5);
  for (let i = 0; i < padLargeCount; i++) {
    const w = snap(28 + rand() * 40, GRID);
    const h = snap(20 + rand() * 30, GRID);
    const x = snap(30 + rand() * Math.max(1, width - w - 60), GRID);
    const y = snap(30 + rand() * Math.max(1, height - h - 60), GRID);
    const anchorId = `pad${i}`;
    padsLarge.push({ x, y, w, h });
    anchorPoints.set(anchorId, { x: x + w / 2, y: y + h / 2 });
  }

  type Source = { anchorId: string; point: Pt; dirIdx: number; count: number };
  const sources: Source[] = [];
  for (const c of chips) for (const e of c.edges) sources.push({ anchorId: e.anchorId, point: e.point, dirIdx: e.dirIdx, count: e.pins.length });
  for (const c of connectors) sources.push({ anchorId: c.anchorId, point: c.point, dirIdx: c.dirIdx, count: c.pins.length });

  const destPool: { anchorId: string; point: Pt }[] = [];
  for (const c of chips) for (const e of c.edges) destPool.push({ anchorId: e.anchorId, point: e.point });
  for (const c of connectors) destPool.push({ anchorId: c.anchorId, point: c.point });
  for (let i = 0; i < padsLarge.length; i++) destPool.push({ anchorId: `pad${i}`, point: anchorPoints.get(`pad${i}`)! });

  function randomDeadend(near: Pt, dirIdx: number): { anchorId: string; point: Pt } {
    const d = DIR_VECS[dirIdx]!;
    const len = GRID * (6 + Math.floor(rand() * 14));
    const point = {
      x: clampNum(near.x + d.x * len, 12, width - 12),
      y: clampNum(near.y + d.y * len, 12, height - 12),
    };
    const anchorId = `dead${deadendSeq++}`;
    anchorPoints.set(anchorId, point);
    return { anchorId, point };
  }

  function routeBundle(source: Source) {
    const K = clampNum(source.count, 3, 6);
    const gap = 8 + rand() * 8;
    let dest = destPool.length > 0 ? destPool[Math.floor(rand() * destPool.length)]! : null;
    if (!dest || dest.anchorId === source.anchorId || rand() < 0.35) {
      dest = randomDeadend(source.point, source.dirIdx);
    }
    const stub = GRID * (1 + Math.floor(rand() * 2));
    const spineStart = addV(source.point, scaleV(DIR_VECS[source.dirIdx]!, stub));
    const maxLen = Math.min(Math.max(distPt(spineStart, dest.point) * 1.6, GRID * 20), 2600);
    const spine = buildSpine(rand, spineStart, source.dirIdx, dest.point, maxLen);
    for (let k = 0; k < K; k++) {
      const offset = (k - (K - 1) / 2) * gap;
      const trackPts = [source.point, ...offsetSpine(spine, offset)];
      const width = 1 + rand();
      const track = makeTrack(trackPts, width, source.anchorId, dest.anchorId);
      const idx = tracks.length;
      tracks.push(track);
      addJunction(source.anchorId, idx);
      addJunction(dest.anchorId, idx);
      if (rand() < 0.12 && trackPts.length > 2) {
        const viaIdx = 1 + Math.floor(rand() * (trackPts.length - 2));
        vias.push({ x: trackPts[viaIdx]!.x, y: trackPts[viaIdx]!.y });
      }
    }
    if (dest.anchorId.startsWith("dead")) padsSmall.push({ x: dest.point.x, y: dest.point.y, square: rand() < 0.5 });
  }

  for (const s of sources) routeBundle(s);

  const fillerTarget = clampNum(Math.round((width * height) / 90000), 6, 26);
  for (let i = 0; i < fillerTarget; i++) {
    const x = snap(20 + rand() * Math.max(1, width - 40), GRID);
    const y = snap(20 + rand() * Math.max(1, height - 40), GRID);
    routeBundle({ anchorId: `filler${i}`, point: { x, y }, dirIdx: Math.floor(rand() * 8), count: 3 + Math.floor(rand() * 4) });
  }

  return { width, height, tracks, chips, connectors, padsSmall, padsLarge, vias, junctions, anchorPoints };
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

  for (const v of board.vias) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(2,4,3,0.65)";
  for (const v of board.vias) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = traceColor;

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
   Pulse routing — a pulse walks the exact points of one or more tracks
   stitched end-to-end at shared component anchors, so it always follows
   real trace geometry (bends included) and never cuts across empty space.
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
  pts: Pt[];
  cum: number[];
  total: number;
  hopOffsets: { anchorId: string; atS: number }[];
  traveled: number;
  trailLen: number;
  speed: number;
  hue: "green" | "cyan";
  bright: number;
  decay: number;
};

function buildPulsePath(board: Board, rand: () => number, opts: { startTrackIdx?: number; forceForward?: boolean; burst?: boolean }) {
  if (board.tracks.length === 0) return null;
  const hops = opts.burst ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 4);
  const startTrackIdx = opts.startTrackIdx ?? Math.floor(rand() * board.tracks.length);
  const startTrack = board.tracks[startTrackIdx];
  if (!startTrack || startTrack.points.length < 2) return null;

  const forward = opts.forceForward ?? rand() < 0.5;
  let pts = forward ? startTrack.points.slice() : startTrack.points.slice().reverse();
  const usedTracks = new Set<number>([startTrackIdx]);
  let currentAnchor = forward ? startTrack.endAnchor : startTrack.startAnchor;
  const hopOffsets: { anchorId: string; atS: number }[] = [];
  let accLen = startTrack.totalLen;

  for (let h = 0; h < hops; h++) {
    const candidates = (board.junctions.get(currentAnchor) ?? []).filter((idx) => !usedTracks.has(idx));
    if (candidates.length === 0) break;
    const nextIdx = candidates[Math.floor(rand() * candidates.length)]!;
    usedTracks.add(nextIdx);
    const nextTrack = board.tracks[nextIdx]!;
    const nextForward = nextTrack.startAnchor === currentAnchor;
    const nextPts = nextForward ? nextTrack.points : nextTrack.points.slice().reverse();
    hopOffsets.push({ anchorId: currentAnchor, atS: accLen });
    pts = pts.concat(nextPts.slice(1));
    accLen += nextTrack.totalLen;
    currentAnchor = nextForward ? nextTrack.endAnchor : nextTrack.startAnchor;
  }

  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + distPt(pts[i - 1]!, pts[i]!));
  return { pts, cum, total: cum[cum.length - 1] ?? 0, hopOffsets };
}

function spawnPulse(
  board: Board,
  rand: () => number,
  opts: { startTrackIdx?: number; forceForward?: boolean; burst?: boolean } = {},
): Pulse | null {
  const built = buildPulsePath(board, rand, opts);
  if (!built || built.total <= 1) return null;
  const burst = opts.burst ?? false;
  return {
    pts: built.pts,
    cum: built.cum,
    total: built.total,
    hopOffsets: built.hopOffsets,
    traveled: 0,
    trailLen: 60 + rand() * 60,
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
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = clampNum(t, 0, 1);
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
    const flashes = new Map<string, number>();

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
      flashes.clear();
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

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const pulse of pulses) {
        const prevTraveled = pulse.traveled;
        pulse.traveled += pulse.speed * dt;
        if (pulse.decay > 0) pulse.bright = Math.max(0, pulse.bright - pulse.decay * dt);

        for (const hop of pulse.hopOffsets) {
          if (prevTraveled < hop.atS && pulse.traveled >= hop.atS) flashes.set(hop.anchorId, 1);
        }

        if (pulse.traveled >= pulse.total || pulse.bright <= 0.02) continue;

        const head = interpAt(pulse.pts, pulse.cum, pulse.traveled);
        const color = pulse.hue === "green" ? palette.glow : palette.glowCyan;

        // brightening trail along the actual bent trace geometry
        const trailStart = Math.max(0, pulse.traveled - pulse.trailLen);
        const startIdx = findSegIndex(pulse.cum, trailStart);
        const headIdx = findSegIndex(pulse.cum, pulse.traveled);
        const startPt = interpAt(pulse.pts, pulse.cum, trailStart);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.85 * glowScale * pulse.bright;
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        for (let i = startIdx + 1; i <= headIdx; i++) ctx.lineTo(pulse.pts[i]!.x, pulse.pts[i]!.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();

        // glow blob — additive blend over the static layer, so any nearby
        // trace/pad/chip drawn underneath brightens automatically
        const radius = moderate ? 32 : 52;
        const gradient = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.45 * glowScale * pulse.bright;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1 * pulse.bright;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // junction flashes — a pad/pin/chip edge briefly lighting up as a
      // pulse actually passes through it
      ctx.globalAlpha = 1;
      for (const [anchorId, strength] of flashes) {
        const pt = board.anchorPoints.get(anchorId);
        if (!pt || strength <= 0.02) {
          flashes.delete(anchorId);
          continue;
        }
        const radius = 14;
        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        gradient.addColorStop(0, palette.glow);
        gradient.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.55 * strength * glowScale;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
        flashes.set(anchorId, strength - dt * 1.6);
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      pulses = pulses.filter((p) => p.traveled < p.total && p.bright > 0.02);

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
      const track = board.tracks[nearest.trackIdx]!;
      const forceForward = nearest.s < track.totalLen / 2;
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        const p = spawnPulse(board, rand, { startTrackIdx: nearest.trackIdx, forceForward, burst: true });
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
