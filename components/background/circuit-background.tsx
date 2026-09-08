"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";
import { PCB_EDGES, PCB_NODES } from "@/components/background/pcb-graph";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled dimly as the
   background. pcb-graph.ts holds the real node/edge graph extracted from
   that artwork. A comet stores only edgeId + t (0..1 along the edge's own
   polyline) + speed + brightness — it moves node to node along one edge; it
   is created and destroyed ONLY at t=0 or after t reaches 1 (see the
   explicit invariant checks in drawFrame), never mid-edge.
   ========================================================================== */

type Pt = { x: number; y: number };

const PCB_SCALE = 0.22;
const TARGET_FRAME_MS = 1000 / 30;

const COMET_COUNT_FULL = 12;
const COMET_COUNT_MODERATE = 6;

const TAIL_LEN = 140; // px, at full extension
const TAIL_SEGMENTS = 40;
const RETRACT_DURATION = 0.3; // seconds
const FLASH_DURATION = 0.4; // seconds

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
/** Strokes the pts[] slice covering arc-length [from, to], including every
 * real intermediate vertex, so it follows every bend exactly. */
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

/** Three overlapping radial gradients, no hard edges, additive. */
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

/** Tail = trailing [headS-tailLen, headS] arc-length, cut into
 * TAIL_SEGMENTS equal-length pieces, each a plain lineTo between the
 * polyline's own neighbouring points — so it automatically bends where the
 * trace does. Two passes: a wide dim haze, then a narrower full-strength
 * core, both tapering/fading per the segment index formula. */
function drawTail(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  cum: number[],
  headS: number,
  tailLen: number,
  widthPx: number,
  color: [number, number, number],
  brightness: number,
) {
  if (tailLen <= 0.5) return;
  const segLen = tailLen / TAIL_SEGMENTS;
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

/* ==========================================================================
   Graph instancing — nodes/edges live in native artwork coordinates
   (pcb-graph.ts); a comet's actual on-screen geometry is one edge's points
   scaled by PCB_SCALE and translated by whichever visible tile it belongs
   to. Direction is resolved by which end the comet enters from: pcb-graph's
   fromNodeId/toNodeId just label an edge's two ends, travel can go either
   way.
   ========================================================================== */

const NODE_INCIDENT_EDGES: number[][] = PCB_NODES.map(() => []);
for (const e of PCB_EDGES) {
  if (e.fromNodeId !== null) NODE_INCIDENT_EDGES[e.fromNodeId]!.push(e.id);
  if (e.toNodeId !== null) NODE_INCIDENT_EDGES[e.toNodeId]!.push(e.id);
}
const OPEN_EDGE_IDS: number[] = PCB_EDGES.filter((e) => e.fromNodeId === null || e.toNodeId === null).map((e) => e.id);

function nodeScreenPos(nodeId: number, offX: number, offY: number): Pt {
  const n = PCB_NODES[nodeId]!;
  return { x: n.x * PCB_SCALE + offX, y: n.y * PCB_SCALE + offY };
}

type EdgeInstance = { points: Pt[]; cumLen: number[]; totalLen: number; width: number; arrivalNodeId: number | null };

/** Builds one edge's on-screen geometry for a given tile, oriented so t=0
 * is at `enterFromNodeId` (or, if null, at whichever end of the edge is
 * itself open/off-canvas). */
function buildEdgeInstance(edgeId: number, offX: number, offY: number, enterFromNodeId: number | null): EdgeInstance {
  const edge = PCB_EDGES[edgeId]!;
  let reversed: boolean;
  let arrivalNodeId: number | null;
  if (enterFromNodeId !== null) {
    reversed = enterFromNodeId !== edge.fromNodeId;
    arrivalNodeId = reversed ? edge.fromNodeId : edge.toNodeId;
  } else {
    reversed = edge.fromNodeId !== null; // the open end must be toNodeId in that case
    arrivalNodeId = reversed ? edge.fromNodeId : edge.toNodeId;
  }
  const raw = reversed ? edge.points.slice().reverse() : edge.points;
  const points = raw.map(([x, y]) => ({ x: x * PCB_SCALE + offX, y: y * PCB_SCALE + offY }));
  if (enterFromNodeId !== null) points[0] = nodeScreenPos(enterFromNodeId, offX, offY); // snap, no visible hop seam
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) cumLen.push(cumLen[i - 1]! + dist(points[i - 1]!, points[i]!));
  return { points, cumLen, totalLen: cumLen[cumLen.length - 1] ?? 0, width: edge.width * PCB_SCALE, arrivalNodeId };
}

/* ==========================================================================
   Comets
   ========================================================================== */

type Comet = {
  edgeId: number;
  t: number; // 0..1 along the current edge instance
  speed: number; // px/sec
  brightness: number; // 0.4-1.0
  offX: number;
  offY: number;
  hue: "green" | "cyan";
  points: Pt[];
  cumLen: number[];
  totalLen: number;
  width: number;
  arrivalNodeId: number | null;
  state: "flying" | "arriving";
  retractElapsed: number;
};

type Flash = { x: number; y: number; peak: number; age: number };

function makeComet(rand: () => number, edgeId: number, inst: EdgeInstance, offX: number, offY: number): Comet {
  return {
    edgeId,
    t: 0,
    speed: 40 + rand() * 80,
    brightness: 0.4 + rand() * 0.6,
    offX,
    offY,
    hue: rand() < 0.6 ? "green" : "cyan",
    points: inst.points,
    cumLen: inst.cumLen,
    totalLen: inst.totalLen,
    width: Math.max(inst.width, 1.3),
    arrivalNodeId: inst.arrivalNodeId,
    state: "flying",
    retractElapsed: 0,
  };
}

function spawnFromOpenEdge(rand: () => number, tilesX: number, tilesY: number): Comet | null {
  if (OPEN_EDGE_IDS.length === 0) return null;
  const edgeId = OPEN_EDGE_IDS[Math.floor(rand() * OPEN_EDGE_IDS.length)]!;
  const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
  const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
  const inst = buildEdgeInstance(edgeId, offX, offY, null);
  if (inst.totalLen < 20) return null;
  return makeComet(rand, edgeId, inst, offX, offY);
}

function spawnAtNode(rand: () => number, tilesX: number, tilesY: number): Comet | null {
  if (PCB_NODES.length === 0) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const nodeId = Math.floor(rand() * PCB_NODES.length);
    const incident = NODE_INCIDENT_EDGES[nodeId]!;
    if (incident.length === 0) continue;
    const edgeId = incident[Math.floor(rand() * incident.length)]!;
    const offX = Math.floor(rand() * tilesX) * PCB_TILE_W * PCB_SCALE;
    const offY = Math.floor(rand() * tilesY) * PCB_TILE_H * PCB_SCALE;
    const inst = buildEdgeInstance(edgeId, offX, offY, nodeId);
    if (inst.totalLen < 20) continue;
    return makeComet(rand, edgeId, inst, offX, offY);
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
      const fill = rgba(palette.glow, 0.05); // background scheme: alpha 0.05
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
      return rand() < 0.5 ? spawnFromOpenEdge(rand, tilesX, tilesY) ?? spawnAtNode(rand, tilesX, tilesY) : spawnAtNode(rand, tilesX, tilesY);
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
      const palette = currentPalette();

      // --- advance: t only ever changes while 0 <= t < 1 (flying); once it
      // reaches 1 the comet enters a fixed-position "arriving" retraction
      // that is not further motion along the edge. Comets are appended to
      // `nextComets` — never spliced mid-array — from exactly two places:
      // spawnOne() (t starts at 0) and the retraction-complete branch below
      // (also t=0, on a different edge). Removal (leaving a comet out of
      // `nextComets`) only happens when t has reached 1 with no node to
      // arrive at, or after a completed retraction. Never for 0 < t < 1.
      const nextComets: Comet[] = [];
      for (const comet of comets) {
        if (comet.state === "flying") {
          if (comet.totalLen > 0) comet.t += (comet.speed * dt) / comet.totalLen;
          if (comet.t < 1) {
            nextComets.push(comet);
            continue;
          }
          comet.t = 1;
          if (comet.arrivalNodeId === null) {
            continue; // destroyed: reached t=1 with no node (exited the canvas)
          }
          comet.state = "arriving";
          comet.retractElapsed = 0;
          const pos = nodeScreenPos(comet.arrivalNodeId, comet.offX, comet.offY);
          flashes.push({ x: pos.x, y: pos.y, peak: comet.brightness * 1.3, age: 0 });
          nextComets.push(comet);
          continue;
        }

        // arriving: head fixed at the node, tail retracts over 300ms
        comet.retractElapsed += dt;
        if (comet.retractElapsed < RETRACT_DURATION) {
          nextComets.push(comet);
          continue;
        }
        // retraction complete — resolve fate now (never during 0<t<1)
        const nodeId = comet.arrivalNodeId!;
        const incident = NODE_INCIDENT_EDGES[nodeId]!.filter((eid) => eid !== comet.edgeId);
        if (incident.length > 0 && rand() < 0.5) {
          const nextEdgeId = incident[Math.floor(rand() * incident.length)]!;
          const inst = buildEdgeInstance(nextEdgeId, comet.offX, comet.offY, nodeId);
          if (inst.totalLen >= 20) {
            nextComets.push(makeComet(rand, nextEdgeId, inst, comet.offX, comet.offY));
          }
        }
        // else: destroyed (either no other edge, or the coin flip said stop)
      }
      comets = nextComets;

      // --- draw ---
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";

      for (const comet of comets) {
        const rgb = comet.hue === "green" ? palette.glow : palette.glowCyan;
        const bright = comet.brightness * (moderate ? 0.7 : 1);
        const headS = comet.state === "arriving" ? comet.totalLen : comet.t * comet.totalLen;
        const tailLen = comet.state === "arriving" ? TAIL_LEN * Math.max(0, 1 - comet.retractElapsed / RETRACT_DURATION) : TAIL_LEN;

        drawTail(ctx, comet.points, comet.cumLen, headS, tailLen, comet.width, rgb, bright);
        const head = interpAt(comet.points, comet.cumLen, headS);
        drawHead(ctx, head, comet.width, rgb, bright);
      }

      for (const f of flashes) {
        f.age += dt;
        const progress = f.age / FLASH_DURATION;
        if (progress >= 1) continue;
        const strength = f.peak * (1 - progress);
        const radius = 14;
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        gradient.addColorStop(0, rgba(palette.glow, 0.6 * strength));
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      flashes = flashes.filter((f) => f.age / FLASH_DURATION < 1);

      ctx.globalCompositeOperation = "source-over";

      const targetCount = moderate ? COMET_COUNT_MODERATE : COMET_COUNT_FULL;
      if (comets.length < targetCount) {
        const c = spawnOne();
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
      if (!detail || PCB_EDGES.length === 0) return;
      const tileScreenW = PCB_TILE_W * PCB_SCALE;
      const tileScreenH = PCB_TILE_H * PCB_SCALE;
      const tx = Math.max(0, Math.min(tilesX - 1, Math.floor(detail.x / tileScreenW)));
      const ty = Math.max(0, Math.min(tilesY - 1, Math.floor(detail.y / tileScreenH)));
      const offX = tx * tileScreenW;
      const offY = ty * tileScreenH;

      let bestEdgeId = -1;
      let bestFromNode: number | null = null;
      let bestDistSq = Infinity;
      for (const edge of PCB_EDGES) {
        const startNode = edge.fromNodeId ?? edge.toNodeId;
        const inst = buildEdgeInstance(edge.id, offX, offY, startNode);
        for (const p of inst.points) {
          const ddx = detail.x - p.x;
          const ddy = detail.y - p.y;
          const distSq = ddx * ddx + ddy * ddy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestEdgeId = edge.id;
            bestFromNode = startNode;
          }
        }
      }
      if (bestEdgeId < 0) return;
      const inst = buildEdgeInstance(bestEdgeId, offX, offY, bestFromNode);
      const burstCount = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < burstCount; i++) {
        const c = makeComet(rand, bestEdgeId, inst, offX, offY);
        c.speed = 100 + rand() * 80;
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
