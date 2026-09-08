"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";
import { PCB_EDGES } from "@/components/background/pcb-graph";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled dimly as the
   background. Each comet walks one real edge (pcb-graph.ts) start to end.

   The comet's entire life is governed by exactly ONE rule: it is created
   off-screen, and destroyed the instant it reaches the far end of its edge
   (a dead end — a pad, a via, wherever that trace's real geometry stops).
   There is no other timer, animation, or condition anywhere in this file
   that creates or destroys a comet. No lifespan, no arrival retraction, no
   flash duration, no chance-based continuation onto another edge.
   ========================================================================== */

type Pt = { x: number; y: number };

const PCB_SCALE = 0.22;
const TARGET_FRAME_MS = 1000 / 30;

const COMET_COUNT_FULL = 12;
const COMET_COUNT_MODERATE = 6;

const TAIL_LEN = 140; // px
const TAIL_SEGMENTS = 40;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [Number.isNaN(r) ? 125 : r, Number.isNaN(g) ? 255 : g, Number.isNaN(b) ? 196 : b];
}
function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, a)})`;
}
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

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
  const t = Math.max(0, Math.min(1, (s - cum[i]!) / segLen));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function strokeSlice(ctx: CanvasRenderingContext2D, pts: Pt[], cum: number[], from: number, to: number) {
  if (to - from < 0.01) return;
  const a = interpAt(pts, cum, from);
  const b = interpAt(pts, cum, to);
  const startIdx = findSegIndex(cum, from);
  const endIdx = findSegIndex(cum, to);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  for (let i = startIdx + 1; i <= endIdx; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawHead(ctx: CanvasRenderingContext2D, pos: Pt, widthPx: number, color: [number, number, number], brightness: number) {
  const layers: { r: number; color: [number, number, number]; alpha: number }[] = [
    { r: widthPx * 0.6, color: [255, 255, 255], alpha: 1.0 },
    { r: widthPx * 2, color, alpha: 0.5 },
    { r: widthPx * 5, color, alpha: 0.15 },
  ];
  for (const layer of layers) {
    if (layer.r <= 0.05) continue;
    const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, layer.r);
    g.addColorStop(0, rgba(layer.color, layer.alpha * brightness));
    g.addColorStop(1, rgba(layer.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, layer.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTail(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  cum: number[],
  headS: number,
  widthPx: number,
  color: [number, number, number],
  brightness: number,
) {
  const segLen = TAIL_LEN / TAIL_SEGMENTS;
  ctx.lineCap = "round";

  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const p = i / 39;
    const opacity = (1 - p) * (1 - p);
    const hazeWidth = widthPx * (1.5 + p * 2.5);
    const a = Math.max(0, headS - i * segLen);
    const b = Math.max(0, headS - (i + 1) * segLen);
    if (a <= b) continue;
    ctx.strokeStyle = rgba(color, opacity * 0.25 * brightness);
    ctx.lineWidth = hazeWidth;
    strokeSlice(ctx, pts, cum, b, a);
  }

  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const p = i / 39;
    const opacity = (1 - p) * (1 - p);
    const coreWidth = widthPx * (1 - p * 0.3);
    const a = Math.max(0, headS - i * segLen);
    const b = Math.max(0, headS - (i + 1) * segLen);
    if (a <= b) continue;
    ctx.strokeStyle = rgba(color, opacity * brightness);
    ctx.lineWidth = coreWidth;
    strokeSlice(ctx, pts, cum, b, a);
  }
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

// Only edges with a verified real pad/via ending (see pcb-graph.ts) ever
// get a comet — the rest end at an arbitrary tracer cutoff with nothing to
// crash into, so nothing travels on them.
const TRAVELABLE_EDGE_IDS: number[] = PCB_EDGES.filter((e) => e.hasRealEnd).map((e) => e.id);

type EdgeInstance = { points: Pt[]; cumLen: number[]; totalLen: number; width: number };

function buildEdgeInstance(edgeId: number, offX: number, offY: number): EdgeInstance {
  const edge = PCB_EDGES[edgeId]!;
  const points = edge.points.map(([x, y]) => ({ x: x * PCB_SCALE + offX, y: y * PCB_SCALE + offY }));
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width: Math.max(edge.width * PCB_SCALE, 1.3) };
}

type Comet = {
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number;
  traveled: number; // px along points, 0..totalLen
  speed: number; // px/sec
  brightness: number;
  hue: "green" | "cyan";
};

/** The only way a comet is created: pick a random edge/tile instance and a
 * random starting position along it that happens to fall outside the
 * current viewport, so it always enters visibly from off-screen. Travel is
 * always forward (increasing arc-length) toward that edge's own far end —
 * a dead end, full stop. */
function spawnComet(rand: () => number, tilesX: number, tilesY: number, width: number, height: number): Comet | null {
  if (TRAVELABLE_EDGE_IDS.length === 0) return null;
  const margin = 30;
  for (let attempt = 0; attempt < 12; attempt++) {
    const edgeId = TRAVELABLE_EDGE_IDS[Math.floor(rand() * TRAVELABLE_EDGE_IDS.length)]!;
    const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
    const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
    const inst = buildEdgeInstance(edgeId, offX, offY);
    if (inst.totalLen < 40) continue;
    const startS = rand() * inst.totalLen * 0.85;
    const p = interpAt(inst.points, inst.cumLen, startS);
    const offscreen = p.x < -margin || p.x > width + margin || p.y < -margin || p.y > height + margin;
    if (!offscreen) continue;
    return {
      points: inst.points,
      cumLen: inst.cumLen,
      totalLen: inst.totalLen,
      width: inst.width,
      traveled: startS,
      speed: 40 + rand() * 80,
      brightness: 0.4 + rand() * 0.6,
      hue: rand() < 0.6 ? "green" : "cyan",
    };
  }
  return null;
}

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

    let bgPattern: CanvasPattern | null = null;
    let comets: Comet[] = [];
    const rand = mulberry32(Date.now() & 0xffffffff);
    let rafId = 0;
    let lastFrame = 0;
    let running = true;
    let dpr = 1;
    let tilesX = 1;
    let tilesY = 1;
    let viewW = 0;
    let viewH = 0;

    function currentPalette() {
      const styles = getComputedStyle(document.documentElement);
      return {
        glow: hexToRgb(styles.getPropertyValue("--circuit-glow").trim() || "#7dffc4"),
        glowCyan: hexToRgb(styles.getPropertyValue("--circuit-glow-cyan").trim() || "#6df0ff"),
      };
    }

    // Builds the tiled background pattern from the (async, data-URI) SVG
    // image. This must NEVER be a prerequisite for sizing the canvas or the
    // comet grid — if this image is ever slow or fails to load, resize()
    // still has to have already run, or the canvas is stuck at the browser's
    // default 300x150 and every comet's off-screen check is computed against
    // a zero-sized viewport (which is what caused comets to vanish entirely
    // except for a stray one clipped into a corner).
    function buildBgPattern() {
      if (!ctx) return;
      const palette = currentPalette();
      const fill = rgba(palette.glow, 0.05);
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${PCB_TILE_W}" height="${PCB_TILE_H}" viewBox="0 0 ${PCB_TILE_W} ${PCB_TILE_H}"><g fill="${fill}">${PCB_MARKUP}</g></svg>`;
      const img = new Image();
      img.onload = () => {
        const tileW = Math.max(1, Math.round(PCB_TILE_W * PCB_SCALE));
        const tileH = Math.max(1, Math.round(PCB_TILE_H * PCB_SCALE));
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileW;
        tileCanvas.height = tileH;
        const tctx = tileCanvas.getContext("2d");
        if (tctx) {
          tctx.drawImage(img, 0, 0, tileW, tileH);
          bgPattern = ctx.createPattern(tileCanvas, "repeat");
        }
        drawFrame(0);
      };
      img.onerror = () => {
        // No background pattern this session, but the comet grid (already
        // sized by resize(), called independently) keeps animating fine.
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    }

    function resize() {
      if (!canvas || !ctx) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width <= 0 || height <= 0) {
        requestAnimationFrame(resize);
        return;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewW = width;
      viewH = height;
      tilesX = Math.ceil(width / (PCB_TILE_W * PCB_SCALE)) + 1;
      tilesY = Math.ceil(height / (PCB_TILE_H * PCB_SCALE)) + 1;
      // A resize only ever ADDS comets (up to the target count) — it must
      // never remove one that's mid-flight, since off-screen-to-dead-end
      // is the only life cycle that exists.
      drawFrame(0);
    }

    function drawFrame(dtMs: number) {
      if (!canvas || !ctx) return;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.clearRect(0, 0, width, height);
      if (bgPattern) {
        ctx.fillStyle = bgPattern;
        ctx.fillRect(0, 0, width, height);
      }

      if (intensityRef.current === "off") return;

      const moderate = intensityRef.current === "moderate";
      const dt = Math.min(dtMs, 80) / 1000;
      const palette = currentPalette();

      // Advance. The ONLY removal condition: traveled has reached totalLen
      // (the edge's own dead end). Nothing else in this loop can drop a
      // comet.
      const nextComets: Comet[] = [];
      for (const comet of comets) {
        comet.traveled += comet.speed * dt;
        if (comet.traveled < comet.totalLen) nextComets.push(comet);
      }
      comets = nextComets;

      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";

      for (const comet of comets) {
        const rgb = comet.hue === "green" ? palette.glow : palette.glowCyan;
        const bright = comet.brightness * (moderate ? 0.7 : 1);
        const headS = comet.traveled;
        drawTail(ctx, comet.points, comet.cumLen, headS, comet.width, rgb, bright);
        const head = interpAt(comet.points, comet.cumLen, headS);
        drawHead(ctx, head, comet.width, rgb, bright);
      }

      ctx.globalCompositeOperation = "source-over";

      const targetCount = moderate ? COMET_COUNT_MODERATE : COMET_COUNT_FULL;
      if (comets.length < targetCount) {
        const c = spawnComet(rand, tilesX, tilesY, viewW, viewH);
        if (c) comets.push(c);
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
      if (intensityRef.current === "off") return;
      const detail = (event as CustomEvent<CircuitPulseDetail>).detail;
      if (!detail || TRAVELABLE_EDGE_IDS.length === 0) return;
      const tileScreenW = PCB_TILE_W * PCB_SCALE;
      const tileScreenH = PCB_TILE_H * PCB_SCALE;
      const tx = Math.max(0, Math.min(tilesX - 1, Math.floor(detail.x / tileScreenW)));
      const ty = Math.max(0, Math.min(tilesY - 1, Math.floor(detail.y / tileScreenH)));
      const offX = tx * tileScreenW;
      const offY = ty * tileScreenH;

      let bestEdgeId = -1;
      let bestS = 0;
      let bestDistSq = Infinity;
      for (const ei of TRAVELABLE_EDGE_IDS) {
        const inst = buildEdgeInstance(ei, offX, offY);
        for (let i = 1; i < inst.points.length; i++) {
          const a = inst.points[i - 1]!;
          const b = inst.points[i]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const lenSq = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((detail.x - a.x) * dx + (detail.y - a.y) * dy) / lenSq));
          const cx = a.x + dx * t;
          const cy = a.y + dy * t;
          const ddx = detail.x - cx;
          const ddy = detail.y - cy;
          const distSq = ddx * ddx + ddy * ddy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestEdgeId = ei;
            bestS = inst.cumLen[i - 1]! + t * Math.sqrt(lenSq);
          }
        }
      }
      if (bestEdgeId < 0) return;
      const inst = buildEdgeInstance(bestEdgeId, offX, offY);
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        comets.push({
          points: inst.points,
          cumLen: inst.cumLen,
          totalLen: inst.totalLen,
          width: inst.width,
          traveled: Math.max(0, bestS - rand() * 25),
          speed: 100 + rand() * 80,
          brightness: 0.4 + rand() * 0.6,
          hue: rand() < 0.6 ? "green" : "cyan",
        });
      }
    }

    let resizeTimer: number | undefined;
    function handleResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    }

    // Size the canvas and comet grid right away, synchronously — this must
    // not wait on the background image (see buildBgPattern above).
    resize();
    buildBgPattern();
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
