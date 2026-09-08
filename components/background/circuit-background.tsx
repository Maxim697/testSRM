"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";
import { PCB_ROUTES } from "@/components/background/pcb-routes";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled dimly as the
   background. Pulses are NOT a shape riding a detached path and they are
   NOT a soft blob revealing whatever happens to sit under it — each pulse
   owns one real traced route (pcb-routes.ts, extracted directly from the
   artwork's own pixels) and is drawn as an actual stroke along that
   route's own points, at that route's own measured width. A pulse can
   never be anywhere but on its trace, because its geometry literally IS a
   slice of the trace's point list.
   ========================================================================== */

type Pt = { x: number; y: number };

const PCB_SCALE = 0.22;
const TARGET_FRAME_MS = 1000 / 30;

const PULSE_COUNT_FULL = 20;
const PULSE_COUNT_MODERATE = 10;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [Number.isNaN(r) ? 125 : r, Number.isNaN(g) ? 255 : g, Number.isNaN(b) ? 196 : b];
}
function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
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
/** Strokes the pts[] slice covering arc-length [from, to] plus the exact
 * interpolated endpoints, so the drawn segment follows every real bend. */
function strokeSlice(ctx: CanvasRenderingContext2D, pts: Pt[], cum: number[], from: number, to: number) {
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

type Pulse = {
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number; // screen px, matches the route's own measured width
  padArcLens: number[];
  traveled: number;
  speed: number;
  hue: "green" | "cyan";
  trailLen: number; // 40-80px
  haloRadius: number; // 15-20px
};

type Flash = { x: number; y: number; strength: number };

function spawnPulse(rand: () => number, tilesX: number, tilesY: number): Pulse | null {
  if (PCB_ROUTES.length === 0 || tilesX <= 0 || tilesY <= 0) return null;
  const route = PCB_ROUTES[Math.floor(rand() * PCB_ROUTES.length)]!;
  const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
  const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
  const points = route.points.map(([x, y]) => ({ x: x * PCB_SCALE + offX, y: y * PCB_SCALE + offY }));
  if (points.length < 2) return null;
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
  const totalLen = cumLen[cumLen.length - 1] ?? 0;
  if (totalLen < 20) return null;
  const padArcLens = route.padIndices.map((idx) => cumLen[Math.min(idx, cumLen.length - 1)]!);
  return {
    points,
    cumLen,
    totalLen,
    width: Math.max(route.width * PCB_SCALE, 1.3),
    padArcLens,
    traveled: 0,
    speed: 35 + rand() * 45,
    hue: rand() < 0.6 ? "green" : "cyan",
    trailLen: 40 + rand() * 40,
    haloRadius: 15 + rand() * 5,
  };
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
    let pulses: Pulse[] = [];
    let flashes: Flash[] = [];
    const rand = mulberry32(Date.now() & 0xffffffff);
    let rafId = 0;
    let lastFrame = 0;
    let lastSpawn = 0;
    let running = true;
    let dpr = 1;
    let tilesX = 1;
    let tilesY = 1;

    function currentPalette() {
      const styles = getComputedStyle(document.documentElement);
      return {
        glow: hexToRgb(styles.getPropertyValue("--circuit-glow").trim() || "#7dffc4"),
        glowCyan: hexToRgb(styles.getPropertyValue("--circuit-glow-cyan").trim() || "#6df0ff"),
      };
    }

    function buildBgPattern(callback: () => void) {
      if (!ctx) return;
      const palette = currentPalette();
      const fill = rgba(palette.glow, 0.05); // background ~5% brightness
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
        callback();
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    }

    function rebuildPulses() {
      pulses = [];
      flashes = [];
      const count = intensityRef.current === "moderate" ? PULSE_COUNT_MODERATE : PULSE_COUNT_FULL;
      for (let i = 0; i < count; i++) {
        const p = spawnPulse(rand, tilesX, tilesY);
        if (p) {
          p.traveled = rand() * p.totalLen; // stagger initial positions
          pulses.push(p);
        }
      }
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
      tilesX = Math.ceil(width / (PCB_TILE_W * PCB_SCALE)) + 1;
      tilesY = Math.ceil(height / (PCB_TILE_H * PCB_SCALE)) + 1;
      rebuildPulses();
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

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const pulse of pulses) {
        const prevTraveled = pulse.traveled;
        pulse.traveled += pulse.speed * dt;
        if (pulse.traveled >= pulse.totalLen) continue;

        for (const padArc of pulse.padArcLens) {
          if (prevTraveled < padArc && pulse.traveled >= padArc) {
            const p = interpAt(pulse.points, pulse.cumLen, padArc);
            flashes.push({ x: p.x, y: p.y, strength: 1 });
          }
        }

        const rgb = pulse.hue === "green" ? palette.glow : palette.glowCyan;
        const from = Math.max(0, pulse.traveled - pulse.trailLen);
        const to = pulse.traveled;

        // soft halo — wide, low-opacity, so it only weakly lights whatever
        // real geometry (neighbouring traces, pads) sits nearby
        ctx.strokeStyle = rgba(rgb, moderate ? 0.08 : 0.15);
        ctx.lineWidth = pulse.haloRadius * 2;
        strokeSlice(ctx, pulse.points, pulse.cumLen, from, to);

        // crisp core — exactly the trace's own width, up to 60% bright
        ctx.strokeStyle = rgba(rgb, moderate ? 0.4 : 0.6);
        ctx.lineWidth = pulse.width;
        strokeSlice(ctx, pulse.points, pulse.cumLen, from, to);
      }

      // pad flashes — small, tight, fading
      for (const f of flashes) {
        if (f.strength <= 0.02) continue;
        const rgb = palette.glow;
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
        gradient.addColorStop(0, rgba(rgb, 0.5 * f.strength));
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 10, 0, Math.PI * 2);
        ctx.fill();
        f.strength -= dt * 2.2;
      }
      flashes = flashes.filter((f) => f.strength > 0.02);

      ctx.globalCompositeOperation = "source-over";

      pulses = pulses.filter((p) => p.traveled < p.totalLen);
      const targetCount = moderate ? PULSE_COUNT_MODERATE : PULSE_COUNT_FULL;
      const spawnGapMs = moderate ? 260 : 130;
      if (pulses.length < targetCount && dtMs > 0) {
        lastSpawn += dtMs;
        if (lastSpawn > spawnGapMs) {
          lastSpawn = 0;
          const p = spawnPulse(rand, tilesX, tilesY);
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
      if (intensityRef.current === "off") return;
      const detail = (event as CustomEvent<CircuitPulseDetail>).detail;
      if (!detail) return;
      const tileScreenW = PCB_TILE_W * PCB_SCALE;
      const tileScreenH = PCB_TILE_H * PCB_SCALE;
      const tx = Math.max(0, Math.min(tilesX - 1, Math.floor(detail.x / tileScreenW)));
      const ty = Math.max(0, Math.min(tilesY - 1, Math.floor(detail.y / tileScreenH)));
      const offX = tx * tileScreenW;
      const offY = ty * tileScreenH;

      // nearest point among routes instantiated at this tile only
      let best: { routeIdx: number; s: number } | null = null;
      let bestDistSq = Infinity;
      for (let ri = 0; ri < PCB_ROUTES.length; ri++) {
        const route = PCB_ROUTES[ri]!;
        let acc = 0;
        for (let i = 1; i < route.points.length; i++) {
          const a = { x: route.points[i - 1]![0] * PCB_SCALE + offX, y: route.points[i - 1]![1] * PCB_SCALE + offY };
          const b = { x: route.points[i]![0] * PCB_SCALE + offX, y: route.points[i]![1] * PCB_SCALE + offY };
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
            best = { routeIdx: ri, s: acc + t * Math.sqrt(lenSq) };
          }
          acc += Math.sqrt(lenSq);
        }
      }
      if (!best) return;
      const route = PCB_ROUTES[best.routeIdx]!;
      const points = route.points.map(([x, y]) => ({ x: x * PCB_SCALE + offX, y: y * PCB_SCALE + offY }));
      const cumLen = [0];
      for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
      const totalLen = cumLen[cumLen.length - 1] ?? 0;
      const padArcLens = route.padIndices.map((idx) => cumLen[Math.min(idx, cumLen.length - 1)]!);
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        pulses.push({
          points,
          cumLen,
          totalLen,
          width: Math.max(route.width * PCB_SCALE, 1.3),
          padArcLens,
          traveled: Math.max(0, best.s - rand() * 30),
          speed: 90 + rand() * 70,
          hue: rand() < 0.6 ? "green" : "cyan",
          trailLen: 40 + rand() * 40,
          haloRadius: 15 + rand() * 5,
        });
      }
    }

    let resizeTimer: number | undefined;
    function handleResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 200);
    }

    buildBgPattern(() => {
      resize();
    });
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
