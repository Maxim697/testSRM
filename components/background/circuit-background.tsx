"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { generatePcbGraph, mulberry32, type PcbGraph } from "@/components/background/pcb-generate";

/* ==========================================================================
   One procedurally generated circuit-board graph, sized exactly to the
   canvas — no tiling, no repeated artwork, no seams. See pcb-generate.ts
   for how the graph itself is built and guaranteed connected.

   The comet's entire life is governed by exactly ONE rule: it is created
   off-screen (on a stub edge whose far end is marked null in the graph),
   and destroyed the instant it reaches another such null end — a real
   dead end inside the graph, or the screen edge again. There is no other
   timer, animation, or condition anywhere in this file that creates or
   destroys a comet. While traveling it may cross several edges through the
   graph's junctions, but it always moves forward along a real, connected
   path — never past a boundary the graph itself doesn't have.
   ========================================================================== */

type Pt = { x: number; y: number };

const TARGET_FRAME_MS = 1000 / 30;

const COMET_COUNT_FULL = 12;
const COMET_COUNT_MODERATE = 6;
const MAX_HOPS = 60; // safety cap against a comet cycling forever in a loop-heavy pocket

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

type EdgeGeometry = { points: Pt[]; cumLen: number[]; totalLen: number; width: number };

/** A graph edge walked in one direction: dir 1 follows its own point order
 * (fromNodeId -> toNodeId), dir -1 walks it reversed. */
function edgeGeometry(graph: PcbGraph, edgeId: number, dir: 1 | -1): EdgeGeometry {
  const edge = graph.edges[edgeId]!;
  const raw = dir === 1 ? edge.points : edge.points.slice().reverse();
  const points = raw.map(([x, y]) => ({ x, y }));
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width: Math.max(edge.width, 1.3) };
}

type Comet = {
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number;
  traveled: number; // px along points, 0..totalLen, for the CURRENT edge only
  edgeId: number;
  dir: 1 | -1;
  hopsLeft: number;
  speed: number; // px/sec
  brightness: number;
  hue: "green" | "cyan";
};

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

    let comets: Comet[] = [];
    const rand = mulberry32(Date.now() & 0xffffffff);
    const boardSeed = Date.now() & 0xffffffff;
    let rafId = 0;
    let lastFrame = 0;
    let lastDrawWall = Date.now();
    let running = true;
    let dpr = 1;

    let graph: PcbGraph = { nodes: [], edges: [], adjacency: new Map() };
    let exitEdgeIds: number[] = [];
    let board: HTMLCanvasElement | null = null;

    function currentPalette() {
      const styles = getComputedStyle(document.documentElement);
      return {
        glow: hexToRgb(styles.getPropertyValue("--circuit-glow").trim() || "#7dffc4"),
        glowCyan: hexToRgb(styles.getPropertyValue("--circuit-glow-cyan").trim() || "#6df0ff"),
      };
    }

    // Renders the (static) generated board once into an off-screen canvas at
    // full resolution, so every animation frame only has to blit it, not
    // re-stroke a thousand traces.
    function buildBoard(width: number, height: number) {
      const glow = currentPalette().glow;
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(width * dpr));
      off.height = Math.max(1, Math.round(height * dpr));
      const octx = off.getContext("2d");
      if (octx) {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.strokeStyle = rgba(glow, 0.08);
        octx.lineCap = "round";
        for (const edge of graph.edges) {
          octx.lineWidth = Math.max(edge.width, 1.3);
          octx.beginPath();
          octx.moveTo(edge.points[0]![0], edge.points[0]![1]);
          octx.lineTo(edge.points[1]![0], edge.points[1]![1]);
          octx.stroke();
        }
      }
      board = off;
    }

    function regenerateGraph(width: number, height: number) {
      graph = generatePcbGraph(width, height, boardSeed);
      exitEdgeIds = graph.edges.filter((e) => e.toNodeId === null).map((e) => e.id);
      buildBoard(width, height);
      // The old graph's edges no longer exist in any comparable form —
      // mid-flight comets can't be meaningfully carried across a full
      // regeneration, so the grid restarts clean.
      comets = [];
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
      regenerateGraph(width, height);
      drawFrame(0);
    }

    /** The only way a comet is created: pick a random off-screen stub edge
     * (the graph's own null-ended edges) and start right at its far,
     * off-canvas point, traveling inward. */
    function spawnComet(): Comet | null {
      if (exitEdgeIds.length === 0) return null;
      const edgeId = exitEdgeIds[Math.floor(rand() * exitEdgeIds.length)]!;
      const geo = edgeGeometry(graph, edgeId, -1); // -1: walk from the null (off-screen) end toward the real node
      if (geo.totalLen < 1) return null;
      return {
        points: geo.points,
        cumLen: geo.cumLen,
        totalLen: geo.totalLen,
        width: geo.width,
        traveled: 0,
        edgeId,
        dir: -1,
        hopsLeft: MAX_HOPS,
        speed: 40 + rand() * 80,
        brightness: 0.4 + rand() * 0.6,
        hue: rand() < 0.6 ? "green" : "cyan",
      };
    }

    /** Advances a comet by dtSec, hopping across graph junctions as needed.
     * Returns false the instant it runs off the graph's edge (a real dead
     * end, or back out past the screen) — the only removal condition. */
    function advanceComet(comet: Comet, dtSec: number): boolean {
      let remaining = comet.traveled + comet.speed * dtSec;
      while (remaining >= comet.totalLen) {
        const overshoot = remaining - comet.totalLen;
        const edge = graph.edges[comet.edgeId]!;
        const reachedNodeId = comet.dir === 1 ? edge.toNodeId : edge.fromNodeId;
        if (reachedNodeId === null) return false; // dead end, full stop
        if (comet.hopsLeft <= 0) return false;
        comet.hopsLeft--;
        const incident = graph.adjacency.get(reachedNodeId) ?? [];
        const options = incident.filter((eid) => eid !== comet.edgeId);
        const pool = options.length > 0 ? options : incident;
        if (pool.length === 0) return false; // isolated node, shouldn't happen but stop cleanly
        const nextEdgeId = pool[Math.floor(rand() * pool.length)]!;
        const nextEdge = graph.edges[nextEdgeId]!;
        const nextDir: 1 | -1 = nextEdge.fromNodeId === reachedNodeId ? 1 : -1;
        const geo = edgeGeometry(graph, nextEdgeId, nextDir);
        comet.edgeId = nextEdgeId;
        comet.dir = nextDir;
        comet.points = geo.points;
        comet.cumLen = geo.cumLen;
        comet.totalLen = geo.totalLen;
        comet.width = geo.width;
        remaining = overshoot;
      }
      comet.traveled = remaining;
      return true;
    }

    function drawFrame(dtMs: number) {
      if (!canvas || !ctx) return;
      lastDrawWall = Date.now();
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.clearRect(0, 0, width, height);
      if (board) ctx.drawImage(board, 0, 0, width, height);

      if (intensityRef.current === "off") return;

      const moderate = intensityRef.current === "moderate";
      const dt = Math.min(dtMs, 80) / 1000;
      const palette = currentPalette();

      // Advance (and possibly hop) every comet. The ONLY removal condition:
      // advanceComet returns false because it reached a real dead end or
      // exited back off-screen. Nothing else in this loop can drop a comet.
      const nextComets: Comet[] = [];
      for (const comet of comets) {
        if (advanceComet(comet, dt)) nextComets.push(comet);
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
        const c = spawnComet();
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
      if (!detail || graph.edges.length === 0) return;

      let bestEdgeId = -1;
      let bestS = 0;
      let bestDistSq = Infinity;
      for (const edge of graph.edges) {
        const [ax, ay] = edge.points[0]!;
        const [bx, by] = edge.points[1]!;
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((detail.x - ax) * dx + (detail.y - ay) * dy) / lenSq));
        const cx = ax + dx * t;
        const cy = ay + dy * t;
        const ddx = detail.x - cx;
        const ddy = detail.y - cy;
        const distSq = ddx * ddx + ddy * ddy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestEdgeId = edge.id;
          bestS = t * Math.sqrt(lenSq);
        }
      }
      if (bestEdgeId < 0) return;
      const geo = edgeGeometry(graph, bestEdgeId, 1);
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        comets.push({
          points: geo.points,
          cumLen: geo.cumLen,
          totalLen: geo.totalLen,
          width: geo.width,
          traveled: Math.max(0, bestS - rand() * 25),
          edgeId: bestEdgeId,
          dir: 1,
          hopsLeft: MAX_HOPS,
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

    // Watchdog: browsers can throttle or altogether stop scheduling
    // requestAnimationFrame for a tab (background-tab power saving, a
    // discarded/frozen tab waking back up, etc.) with no visibilitychange
    // fired for us to react to — the loop just goes quiet forever.
    // Separately, window.innerWidth/innerHeight can occasionally read 0 for
    // one tick right when resize() runs, leaving the canvas (and graph)
    // stuck at a stale size forever since nothing else retries it.
    // setInterval isn't throttled the way rAF is, so once a second this
    // both re-generates the board if it no longer matches the real window
    // and force-restarts the rAF chain if no frame has actually been drawn
    // recently while the tab is visible.
    const watchdog = window.setInterval(() => {
      if (document.hidden || !canvas) return;
      if (window.innerWidth > 0 && window.innerHeight > 0) {
        const expectedDpr = Math.min(window.devicePixelRatio || 1, 2);
        const expectedW = Math.round(window.innerWidth * expectedDpr);
        const expectedH = Math.round(window.innerHeight * expectedDpr);
        if (canvas.width !== expectedW || canvas.height !== expectedH) resize();
      }
      if (Date.now() - lastDrawWall > 1500) {
        cancelAnimationFrame(rafId);
        running = true;
        lastFrame = 0;
        rafId = requestAnimationFrame(loop);
      }
    }, 1000);

    resize();
    rafId = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);
    window.addEventListener(CIRCUIT_PULSE_EVENT, handleBurst);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.clearInterval(watchdog);
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
