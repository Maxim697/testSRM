"use client";

import { useEffect, useRef } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";

type Node = { id: number; x: number; y: number; gx: number; gy: number; isChip?: boolean };
type Edge = { a: number; b: number; via: boolean };
type Chip = { x: number; y: number; w: number; h: number };

type Pulse = {
  path: number[]; // node ids
  segment: number; // index into path — current edge is path[segment] -> path[segment+1]
  progress: number; // 0..1 along current segment
  speed: number; // px / sec
  hue: "green" | "cyan";
  trail: number[]; // recently fully-traversed node ids, most recent last
  bright: number; // 0..1 overall brightness multiplier (bursts fade faster)
  decay: number; // per-second brightness decay for burst pulses (0 = none)
};

const CELL = 58;
const NODE_PROB = 0.6;
const ORTHO_EDGE_PROB = 0.52;
const DIAGONAL_EDGE_PROB = 0.22;
const VIA_PROB = 0.35;

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

function buildBoard(width: number, height: number, rand: () => number) {
  const cols = Math.ceil(width / CELL) + 2;
  const rows = Math.ceil(height / CELL) + 2;
  const nodes: Node[] = [];
  const nodeAt = new Map<string, number>(); // "gx,gy" -> node id
  const adjacency = new Map<number, number[]>();
  const edges: Edge[] = [];

  let id = 0;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (rand() > NODE_PROB) continue;
      const jitter = CELL * 0.16;
      const x = gx * CELL + (rand() * 2 - 1) * jitter;
      const y = gy * CELL + (rand() * 2 - 1) * jitter;
      nodes.push({ id, x, y, gx, gy });
      nodeAt.set(`${gx},${gy}`, id);
      adjacency.set(id, []);
      id++;
    }
  }

  function link(aId: number, bId: number) {
    adjacency.get(aId)!.push(bId);
    adjacency.get(bId)!.push(aId);
    edges.push({ a: aId, b: bId, via: rand() < VIA_PROB });
  }

  for (const node of nodes) {
    const east = nodeAt.get(`${node.gx + 1},${node.gy}`);
    const south = nodeAt.get(`${node.gx},${node.gy + 1}`);
    const southEast = nodeAt.get(`${node.gx + 1},${node.gy + 1}`);
    const southWest = nodeAt.get(`${node.gx - 1},${node.gy + 1}`);
    if (east !== undefined && rand() < ORTHO_EDGE_PROB) link(node.id, east);
    if (south !== undefined && rand() < ORTHO_EDGE_PROB) link(node.id, south);
    if (southEast !== undefined && rand() < DIAGONAL_EDGE_PROB) link(node.id, southEast);
    if (southWest !== undefined && rand() < DIAGONAL_EDGE_PROB) link(node.id, southWest);
  }

  // Chips: a handful of rectangular blocks dropped onto the grid, purely
  // decorative (pulses flash them via proximity, they aren't graph nodes).
  const chips: Chip[] = [];
  const chipCount = Math.max(3, Math.round((cols * rows) / 90));
  for (let i = 0; i < chipCount; i++) {
    const gx = Math.floor(rand() * (cols - 4));
    const gy = Math.floor(rand() * (rows - 3));
    const w = (2 + Math.floor(rand() * 2)) * CELL * 0.72;
    const h = (2 + Math.floor(rand() * 2)) * CELL * 0.72;
    chips.push({ x: gx * CELL, y: gy * CELL, w, h });
  }

  return { nodes, adjacency, edges, chips, width, height };
}

type Board = ReturnType<typeof buildBoard>;

function drawStaticBoard(ctx: CanvasRenderingContext2D, board: Board, traceColor: string) {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.strokeStyle = traceColor;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  ctx.beginPath();
  for (const edge of board.edges) {
    const a = board.nodes[edge.a]!;
    const b = board.nodes[edge.b]!;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // vias
  ctx.fillStyle = traceColor;
  for (const edge of board.edges) {
    if (!edge.via) continue;
    const a = board.nodes[edge.a]!;
    const b = board.nodes[edge.b]!;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.beginPath();
    ctx.arc(mx, my, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // pads
  for (const node of board.nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // chips
  for (const chip of board.chips) {
    ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);
    const pinCount = 3;
    for (let i = 1; i <= pinCount; i++) {
      const px = chip.x + (chip.w * i) / (pinCount + 1);
      ctx.beginPath();
      ctx.moveTo(px, chip.y);
      ctx.lineTo(px, chip.y - 5);
      ctx.moveTo(px, chip.y + chip.h);
      ctx.lineTo(px, chip.y + chip.h + 5);
      ctx.stroke();
    }
  }
}

function pickPath(board: Board, rand: () => number, startId: number | null, hops: number): number[] {
  const nodeIds = board.nodes.map((n) => n.id);
  if (nodeIds.length === 0) return [];
  let current = startId ?? nodeIds[Math.floor(rand() * nodeIds.length)]!;
  const path = [current];
  let previous = -1;
  for (let i = 0; i < hops; i++) {
    const neighbors = board.adjacency.get(current) ?? [];
    if (neighbors.length === 0) break;
    const candidates = neighbors.filter((n) => n !== previous);
    const pool = candidates.length > 0 ? candidates : neighbors;
    const next = pool[Math.floor(rand() * pool.length)]!;
    path.push(next);
    previous = current;
    current = next;
  }
  return path;
}

function spawnPulse(board: Board, rand: () => number, startId: number | null = null, burst = false): Pulse | null {
  const hops = burst ? 2 + Math.floor(rand() * 3) : 6 + Math.floor(rand() * 10);
  const path = pickPath(board, rand, startId, hops);
  if (path.length < 2) return null;
  return {
    path,
    segment: 0,
    progress: 0,
    speed: burst ? 260 + rand() * 160 : 70 + rand() * 110,
    hue: rand() < 0.6 ? "green" : "cyan",
    trail: [],
    bright: 1,
    decay: burst ? 0.9 + rand() * 0.6 : 0,
  };
}

function nearestNode(board: Board, x: number, y: number): number | null {
  let bestId: number | null = null;
  let bestDist = Infinity;
  for (const node of board.nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = node.id;
    }
  }
  return bestId;
}

const TARGET_FRAME_MS = 1000 / 30;

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
    const flashes = new Map<number, number>(); // node id -> flash strength 0..1

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
        // viewport not sized yet (e.g. mid-navigation in an embedded preview) — try again next frame
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
      const count = intensityRef.current === "moderate" ? 2 : 5;
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

      const off = intensityRef.current === "off";
      if (off) return;

      const moderate = intensityRef.current === "moderate";
      const glowScale = moderate ? 0.55 : 1;
      const dt = Math.min(dtMs, 80) / 1000;

      ctx.globalCompositeOperation = "lighter";

      for (const pulse of pulses) {
        const a = board.nodes[pulse.path[pulse.segment]!]!;
        const b = board.nodes[pulse.path[pulse.segment + 1]!]!;
        const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        pulse.progress += (pulse.speed * dt) / segLen;

        if (pulse.decay > 0) pulse.bright = Math.max(0, pulse.bright - pulse.decay * dt);

        while (pulse.progress >= 1) {
          pulse.progress -= 1;
          pulse.segment += 1;
          const passedNode = pulse.path[pulse.segment];
          if (passedNode !== undefined) {
            flashes.set(passedNode, 1);
            pulse.trail.push(passedNode);
            if (pulse.trail.length > 4) pulse.trail.shift();
          }
          if (pulse.segment >= pulse.path.length - 1) break;
        }

        if (pulse.segment >= pulse.path.length - 1 || pulse.bright <= 0.02) continue;

        const na = board.nodes[pulse.path[pulse.segment]!]!;
        const nb = board.nodes[pulse.path[pulse.segment + 1]!]!;
        const px = na.x + (nb.x - na.x) * pulse.progress;
        const py = na.y + (nb.y - na.y) * pulse.progress;
        const color = pulse.hue === "green" ? palette.glow : palette.glowCyan;

        // fading trail behind the pulse head, along the segment already covered
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.85 * glowScale * pulse.bright;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(px, py);
        ctx.stroke();

        // glow blob
        const radius = moderate ? 16 : 26;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.5 * glowScale * pulse.bright;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1 * pulse.bright;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // node/pad/chip flashes, fading out
      ctx.globalAlpha = 1;
      for (const [nodeId, strength] of flashes) {
        const node = board.nodes[nodeId];
        if (!node || strength <= 0.02) {
          flashes.delete(nodeId);
          continue;
        }
        const radius = 10;
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
        gradient.addColorStop(0, palette.glow);
        gradient.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.6 * strength * glowScale;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        flashes.set(nodeId, strength - dt * 1.6);
      }

      // chip flashes (proximity-based, checked against active pulses)
      for (const chip of board.chips) {
        const cx = chip.x + chip.w / 2;
        const cy = chip.y + chip.h / 2;
        let lit = 0;
        for (const pulse of pulses) {
          const na = board.nodes[pulse.path[pulse.segment]];
          if (!na) continue;
          const d = Math.hypot(na.x - cx, na.y - cy);
          const reach = Math.max(chip.w, chip.h);
          if (d < reach) lit = Math.max(lit, (1 - d / reach) * pulse.bright);
        }
        if (lit > 0.02) {
          ctx.globalAlpha = 0.35 * lit * glowScale;
          ctx.strokeStyle = palette.glowCyan;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      pulses = pulses.filter((p) => p.segment < p.path.length - 1 && p.bright > 0.02);

      const targetCount = moderate ? 2 : 5;
      const spawnGapMs = moderate ? 3200 : 1400;
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
      const startId = nearestNode(board, detail.x, detail.y);
      if (startId === null) return;
      const burstCount = 3 + Math.floor(rand() * 2);
      for (let i = 0; i < burstCount; i++) {
        const p = spawnPulse(board, rand, startId, true);
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
