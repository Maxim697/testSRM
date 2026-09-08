"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";
import { PCB_ROUTES } from "@/components/background/pcb-routes";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled dimly as the
   background. Each comet owns one real traced route (pcb-routes.ts,
   extracted from the artwork's own pixels) and is drawn as an actual
   stroke along that route's own points — it can never be anywhere but on
   its trace. Route endpoints are clustered into graph nodes once at module
   load (see buildGraph); a comet always travels from node to node along
   one edge (route), and on arrival either dies there or continues onto a
   different edge leaving that node — never resuming mid-trace.
   ========================================================================== */

type Pt = { x: number; y: number };

const PCB_SCALE = 0.22;
const TARGET_FRAME_MS = 1000 / 30;

const COMET_COUNT_FULL = 13;
const COMET_COUNT_MODERATE = 7;
const RETRACT_DURATION = 0.35; // seconds for the tail to pull into an arrival node
const NODE_CLUSTER_THRESHOLD = 15; // native units

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
/** Strokes the pts[] slice covering arc-length [from, to] plus the exact
 * interpolated endpoints, so the drawn segment follows every real bend. */
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
/** Draws the trailing [headS-tailLen, headS] slice as several successive
 * strokes with increasing width/opacity toward the head, so the tail
 * tapers and fades along the real bent geometry instead of being a flat
 * ribbon. */
function drawTaperedTrail(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  cum: number[],
  headS: number,
  tailLen: number,
  baseWidth: number,
  baseAlpha: number,
  color: [number, number, number],
  segments = 9,
) {
  if (tailLen <= 0.5) return;
  const startS = Math.max(0, headS - tailLen);
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const s0 = startS + (headS - startS) * t0;
    const s1 = startS + (headS - startS) * t1;
    const tMid = (t0 + t1) / 2;
    ctx.strokeStyle = rgba(color, baseAlpha * tMid * tMid);
    ctx.lineWidth = Math.max(0.5, baseWidth * (0.25 + 0.75 * tMid));
    strokeSlice(ctx, pts, cum, s0, s1);
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

/* ==========================================================================
   Graph — route endpoints clustered into shared nodes once at module load
   (routes never change at runtime). A node's edges are every route whose
   start or end landed in that cluster.
   ========================================================================== */

type GraphEdge = { routeIdx: number; nodeA: number; nodeB: number };
type GraphNode = { x: number; y: number; edgeIndices: number[] };

function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  function findOrCreateNode(x: number, y: number): number {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.hypot(nodes[i]!.x - x, nodes[i]!.y - y) < NODE_CLUSTER_THRESHOLD) return i;
    }
    nodes.push({ x, y, edgeIndices: [] });
    return nodes.length - 1;
  }
  PCB_ROUTES.forEach((route, ri) => {
    const first = route.points[0]!;
    const lastPt = route.points[route.points.length - 1]!;
    const nodeA = findOrCreateNode(first[0], first[1]);
    const nodeB = findOrCreateNode(lastPt[0], lastPt[1]);
    const edgeIdx = edges.length;
    edges.push({ routeIdx: ri, nodeA, nodeB });
    nodes[nodeA]!.edgeIndices.push(edgeIdx);
    nodes[nodeB]!.edgeIndices.push(edgeIdx);
  });
  return { nodes, edges };
}
const GRAPH = buildGraph();

function nodeScreenPos(nodeIdx: number, offX: number, offY: number): Pt {
  const n = GRAPH.nodes[nodeIdx]!;
  return { x: n.x * PCB_SCALE + offX, y: n.y * PCB_SCALE + offY };
}

type BuiltEdge = { points: Pt[]; cumLen: number[]; totalLen: number; width: number; toNodeIdx: number };

function buildEdgePoints(edge: GraphEdge, fromNodeIdx: number, offX: number, offY: number): BuiltEdge {
  const route = PCB_ROUTES[edge.routeIdx]!;
  const forward = fromNodeIdx === edge.nodeA;
  const toNodeIdx = forward ? edge.nodeB : edge.nodeA;
  const raw = forward ? route.points : route.points.slice().reverse();
  const points = raw.map(([x, y]) => ({ x: x * PCB_SCALE + offX, y: y * PCB_SCALE + offY }));
  points[0] = nodeScreenPos(fromNodeIdx, offX, offY); // snap so hops never visibly jump
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width: route.width * PCB_SCALE, toNodeIdx };
}

/* ==========================================================================
   Comets
   ========================================================================== */

type HaloLayer = { radiusMult: number; opacityMult: number; offsetX: number; offsetY: number; pulseSpeed: number; phase: number };

type Comet = {
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number;
  edgeIdx: number;
  toNodeIdx: number;
  offX: number;
  offY: number;
  traveled: number;
  speed: number;
  hue: "green" | "cyan";
  brightness: number; // 0.4-1.0, individual
  headRadius: number;
  tailLen: number; // 80-150px
  halo: HaloLayer[];
  state: "flying" | "arriving" | "retracted";
  retractProgress: number;
};

type Flash = { x: number; y: number; strength: number; radius: number };

function makeComet(rand: () => number, built: BuiltEdge, edgeIdx: number, offX: number, offY: number, startS: number): Comet {
  const halo: HaloLayer[] = Array.from({ length: 3 + Math.floor(rand() * 2) }, () => ({
    radiusMult: 0.6 + rand() * 1.3,
    opacityMult: 0.3 + rand() * 0.5,
    offsetX: (rand() - 0.5) * 6,
    offsetY: (rand() - 0.5) * 6,
    pulseSpeed: 0.6 + rand() * 1.2,
    phase: rand() * Math.PI * 2,
  }));
  return {
    points: built.points,
    cumLen: built.cumLen,
    totalLen: built.totalLen,
    width: Math.max(built.width, 1.3),
    edgeIdx,
    toNodeIdx: built.toNodeIdx,
    offX,
    offY,
    traveled: startS,
    speed: 32 + rand() * 42,
    hue: rand() < 0.6 ? "green" : "cyan",
    brightness: 0.4 + rand() * 0.6,
    headRadius: Math.max(built.width * (1 + rand() * 0.7), 1.6),
    tailLen: 80 + rand() * 70,
    halo,
    state: "flying",
    retractProgress: 0,
  };
}

function spawnAtNode(rand: () => number, tilesX: number, tilesY: number): Comet | null {
  if (GRAPH.nodes.length === 0) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const nodeIdx = Math.floor(rand() * GRAPH.nodes.length);
    const node = GRAPH.nodes[nodeIdx]!;
    if (node.edgeIndices.length === 0) continue;
    const edgeIdx = node.edgeIndices[Math.floor(rand() * node.edgeIndices.length)]!;
    const edge = GRAPH.edges[edgeIdx]!;
    const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
    const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
    const built = buildEdgePoints(edge, nodeIdx, offX, offY);
    if (built.totalLen < 20) continue;
    return makeComet(rand, built, edgeIdx, offX, offY, 0);
  }
  return null;
}

function spawnOffscreen(rand: () => number, tilesX: number, tilesY: number, width: number, height: number): Comet | null {
  const margin = 40;
  for (let attempt = 0; attempt < 10; attempt++) {
    const edgeIdx = Math.floor(rand() * GRAPH.edges.length);
    const edge = GRAPH.edges[edgeIdx]!;
    const fromNodeIdx = rand() < 0.5 ? edge.nodeA : edge.nodeB;
    const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
    const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
    const built = buildEdgePoints(edge, fromNodeIdx, offX, offY);
    if (built.totalLen < 40) continue;
    const startS = rand() * built.totalLen * 0.85;
    const p = interpAt(built.points, built.cumLen, startS);
    const offscreen = p.x < -margin || p.x > width + margin || p.y < -margin || p.y > height + margin;
    if (!offscreen) continue;
    return makeComet(rand, built, edgeIdx, offX, offY, startS);
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
    let flashes: Flash[] = [];
    const rand = mulberry32(Date.now() & 0xffffffff);
    let rafId = 0;
    let lastFrame = 0;
    let lastSpawn = 0;
    let clock = 0;
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

    function spawnOne(): Comet | null {
      return rand() < 0.55
        ? spawnOffscreen(rand, tilesX, tilesY, viewW, viewH)
        : spawnAtNode(rand, tilesX, tilesY);
    }

    function rebuildComets() {
      comets = [];
      flashes = [];
      const count = intensityRef.current === "moderate" ? COMET_COUNT_MODERATE : COMET_COUNT_FULL;
      for (let i = 0; i < count; i++) {
        const c = spawnOne();
        if (c) comets.push(c);
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
      viewW = width;
      viewH = height;
      tilesX = Math.ceil(width / (PCB_TILE_W * PCB_SCALE)) + 1;
      tilesY = Math.ceil(height / (PCB_TILE_H * PCB_SCALE)) + 1;
      rebuildComets();
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
      clock += dt;
      const palette = currentPalette();
      const offscreenMargin = 60;

      // --- advance state ---
      for (const comet of comets) {
        if (comet.state === "flying") {
          comet.traveled += comet.speed * dt;
          const head = interpAt(comet.points, comet.cumLen, Math.min(comet.traveled, comet.totalLen));
          if (head.x < -offscreenMargin || head.x > width + offscreenMargin || head.y < -offscreenMargin || head.y > height + offscreenMargin) {
            comet.state = "retracted"; // silent off-screen removal, no node event
            comet.retractProgress = -1; // marker: skip fate resolution below
            continue;
          }
          if (comet.traveled >= comet.totalLen) {
            comet.state = "arriving";
            comet.retractProgress = 0;
            const node = nodeScreenPos(comet.toNodeIdx, comet.offX, comet.offY);
            flashes.push({ x: node.x, y: node.y, strength: 1, radius: 12 });
          }
        } else if (comet.state === "arriving") {
          comet.retractProgress += dt / RETRACT_DURATION;
          if (comet.retractProgress >= 1) comet.state = "retracted";
        }
      }

      // --- resolve fate for comets that just finished retracting at a node ---
      const survivors: Comet[] = [];
      for (const comet of comets) {
        if (comet.state !== "retracted") {
          survivors.push(comet);
          continue;
        }
        if (comet.retractProgress < 0) continue; // off-screen: just gone
        const node = GRAPH.nodes[comet.toNodeIdx]!;
        const otherEdges = node.edgeIndices.filter((ei) => ei !== comet.edgeIdx);
        if (otherEdges.length > 0 && rand() < 0.5) {
          const nextEdgeIdx = otherEdges[Math.floor(rand() * otherEdges.length)]!;
          const nextEdge = GRAPH.edges[nextEdgeIdx]!;
          const built = buildEdgePoints(nextEdge, comet.toNodeIdx, comet.offX, comet.offY);
          if (built.totalLen >= 20) {
            survivors.push({
              ...comet,
              points: built.points,
              cumLen: built.cumLen,
              totalLen: built.totalLen,
              width: Math.max(built.width, 1.3),
              edgeIdx: nextEdgeIdx,
              toNodeIdx: built.toNodeIdx,
              traveled: 0,
              state: "flying",
              retractProgress: 0,
            });
            continue;
          }
        }
        // dies here — node continues to fade via the flash already queued
      }
      comets = survivors;

      // --- global brightness budget: many bright comets dim each other down ---
      const activeBrightness = comets.reduce((sum, c) => sum + c.brightness, 0);
      const targetCount = moderate ? COMET_COUNT_MODERATE : COMET_COUNT_FULL;
      const budget = targetCount * 0.62;
      const globalDim = activeBrightness > budget ? budget / activeBrightness : 1;

      // --- draw ---
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const comet of comets) {
        if (comet.state === "retracted") continue;
        const rgb = comet.hue === "green" ? palette.glow : palette.glowCyan;
        const fade = comet.state === "arriving" ? Math.max(0, 1 - comet.retractProgress) : 1;
        const bright = comet.brightness * globalDim * fade * (moderate ? 0.7 : 1);
        if (bright <= 0.01) continue;
        const headS = comet.state === "arriving" ? comet.totalLen : Math.min(comet.traveled, comet.totalLen);
        const tailLen = comet.tailLen * fade;

        // uneven halo — 3-4 slightly offset, differently-pulsing layers
        for (const layer of comet.halo) {
          const pulsate = 0.7 + 0.3 * Math.sin(clock * layer.pulseSpeed + layer.phase);
          ctx.save();
          ctx.translate(layer.offsetX, layer.offsetY);
          ctx.strokeStyle = rgba(rgb, bright * layer.opacityMult * pulsate * 0.4);
          ctx.lineWidth = comet.headRadius * 2 * layer.radiusMult;
          strokeSlice(ctx, comet.points, comet.cumLen, Math.max(0, headS - tailLen), headS);
          ctx.restore();
        }

        // tapered, fading tail along the real bent geometry
        drawTaperedTrail(ctx, comet.points, comet.cumLen, headS, tailLen, comet.width, bright * 0.65, rgb);

        // bright head dot
        const head = interpAt(comet.points, comet.cumLen, headS);
        ctx.fillStyle = rgba(rgb, bright);
        ctx.beginPath();
        ctx.arc(head.x, head.y, comet.headRadius * fade, 0, Math.PI * 2);
        ctx.fill();
      }

      // node/pad flashes — small, tight, fading
      for (const f of flashes) {
        if (f.strength <= 0.02) continue;
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        gradient.addColorStop(0, rgba(palette.glow, 0.55 * f.strength * globalDim));
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        f.strength -= dt * 1.8;
      }
      flashes = flashes.filter((f) => f.strength > 0.02);

      ctx.globalCompositeOperation = "source-over";

      if (comets.length < targetCount && dtMs > 0) {
        lastSpawn += dtMs;
        const spawnGapMs = moderate ? 340 : 180;
        if (lastSpawn > spawnGapMs) {
          lastSpawn = 0;
          const c = spawnOne();
          if (c) comets.push(c);
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
      if (!detail || GRAPH.edges.length === 0) return;
      const tileScreenW = PCB_TILE_W * PCB_SCALE;
      const tileScreenH = PCB_TILE_H * PCB_SCALE;
      const tx = Math.max(0, Math.min(tilesX - 1, Math.floor(detail.x / tileScreenW)));
      const ty = Math.max(0, Math.min(tilesY - 1, Math.floor(detail.y / tileScreenH)));
      const offX = tx * tileScreenW;
      const offY = ty * tileScreenH;

      // nearest edge/point at this tile
      let bestEdgeIdx = -1;
      let bestFromNode = -1;
      let bestS = 0;
      let bestDistSq = Infinity;
      for (let ei = 0; ei < GRAPH.edges.length; ei++) {
        const edge = GRAPH.edges[ei]!;
        const built = buildEdgePoints(edge, edge.nodeA, offX, offY);
        let acc = 0;
        for (let i = 1; i < built.points.length; i++) {
          const a = built.points[i - 1]!;
          const b = built.points[i]!;
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
            bestEdgeIdx = ei;
            bestFromNode = edge.nodeA;
            bestS = acc + t * Math.sqrt(lenSq);
          }
          acc += Math.sqrt(lenSq);
        }
      }
      if (bestEdgeIdx < 0) return;
      const edge = GRAPH.edges[bestEdgeIdx]!;
      const built = buildEdgePoints(edge, bestFromNode, offX, offY);
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        const c = makeComet(rand, built, bestEdgeIdx, offX, offY, Math.max(0, bestS - rand() * 25));
        c.speed = 95 + rand() * 70;
        comets.push(c);
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
