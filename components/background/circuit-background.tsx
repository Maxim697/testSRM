"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_BOARD_ID, PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled as the background,
   with a second bright copy of the same artwork revealed only where a set
   of moving soft round glow spots sit, via an SVG <mask>. The spot's own
   shape carries no direction or rigid length — it's a round gradient blob,
   so unlike a shape riding a path (which stays a straight rigid rect even
   as it bends around corners, and reads as short diagonal strokes wherever
   it happens to cross a trace instead of following it) a blob always looks
   correct regardless of its travel line: because the mask can only ever
   reveal pixels the artwork actually painted, whatever traces the blob
   currently overlaps light up together, and light moving from one trace to
   the next as the blob drifts reads as current flowing through the board.
   ========================================================================== */

type Blob = { id: number; x0: number; y0: number; x1: number; y1: number; radius: number; duration: number; delay: number };
type Ripple = { id: number; x: number; y: number };

const BLOB_POOL_SIZE = 10;
const BLOB_COUNT_FULL = 8;
const BLOB_COUNT_MODERATE = 5;

/** The board is drawn at this fraction of its native size so ~150-200
 * traces fit across a screen width (median trace is ~10 native units
 * wide, measured directly off the artwork's pixels), instead of ~20 at
 * native scale. */
const PCB_SCALE = 0.22;

function buildBlobPool(): Blob[] {
  return Array.from({ length: BLOB_POOL_SIZE }, (_, i) => {
    // seed each blob along the top or left edge (a bit outside it, so it
    // fades in before entering) and send it generally down-and-right; since
    // every pattern tile repeat renders the exact same animated content
    // shifted by a tile size, a blob exiting one tile's edge lines up with
    // the same blob entering the neighbouring tile repeat, so the motion
    // reads as continuous across tile seams with no extra wrap-around logic.
    const fromLeft = Math.random() < 0.5;
    const x0 = fromLeft ? -300 : Math.random() * (PCB_TILE_W + 600) - 300;
    const y0 = fromLeft ? Math.random() * (PCB_TILE_H + 600) - 300 : -300;
    const angle = ((20 + Math.random() * 50) * Math.PI) / 180; // 20-70° from horizontal, always down-right
    const travel = PCB_TILE_W + PCB_TILE_H;
    const duration = 16 + Math.random() * 14; // slow drift
    return {
      id: i,
      x0,
      y0,
      x1: x0 + Math.cos(angle) * travel,
      y1: y0 + Math.sin(angle) * travel,
      radius: 340 + Math.random() * 340, // native units -> ~150-300px on screen at PCB_SCALE
      duration,
      delay: -Math.random() * duration, // negative delay: start already mid-flight, staggered
    };
  });
}

export function CircuitBackground() {
  const { intensity } = useEffectsIntensity();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleSeq = useRef(0);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    function updateSize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    function handleBurst(event: Event) {
      if (intensityRef.current === "off") return;
      const detail = (event as CustomEvent<CircuitPulseDetail>).detail;
      if (!detail) return;
      const id = rippleSeq.current++;
      // click coords are screen px; wrap into one on-screen tile, then back
      // into the pattern's native (pre-PCB_SCALE) coordinate space
      const tileScreenW = PCB_TILE_W * PCB_SCALE;
      const tileScreenH = PCB_TILE_H * PCB_SCALE;
      const localX = ((detail.x % tileScreenW) + tileScreenW) % tileScreenW;
      const localY = ((detail.y % tileScreenH) + tileScreenH) % tileScreenH;
      const x = localX / PCB_SCALE;
      const y = localY / PCB_SCALE;
      setRipples((prev) => [...prev, { id, x, y }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    }
    window.addEventListener(CIRCUIT_PULSE_EVENT, handleBurst);
    return () => window.removeEventListener(CIRCUIT_PULSE_EVENT, handleBurst);
  }, []);

  const blobPool = useMemo(() => buildBlobPool(), []);
  const blobs = blobPool.slice(0, intensity === "moderate" ? BLOB_COUNT_MODERATE : BLOB_COUNT_FULL);

  if (size.w === 0 || size.h === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="circuit-canvas pointer-events-none fixed inset-0 z-0 h-full w-full"
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="xMinYMin slice"
    >
      <defs>
        {/* static CC0 vector artwork bundled at build time, not user content */}
        <g id={PCB_BOARD_ID} dangerouslySetInnerHTML={{ __html: PCB_MARKUP }} />

        <filter id="pcb-glow-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>

        <radialGradient id="pcb-blob-gradient">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <pattern
          id="pcb-tile-base"
          patternUnits="userSpaceOnUse"
          width={PCB_TILE_W * PCB_SCALE}
          height={PCB_TILE_H * PCB_SCALE}
          viewBox={`0 0 ${PCB_TILE_W} ${PCB_TILE_H}`}
        >
          <use href={`#${PCB_BOARD_ID}`} className="pcb-tile-base-use" />
        </pattern>
        <pattern
          id="pcb-tile-glow"
          patternUnits="userSpaceOnUse"
          width={PCB_TILE_W * PCB_SCALE}
          height={PCB_TILE_H * PCB_SCALE}
          viewBox={`0 0 ${PCB_TILE_W} ${PCB_TILE_H}`}
        >
          <use href={`#${PCB_BOARD_ID}`} className="pcb-tile-glow-use" />
        </pattern>

        <pattern
          id="pcb-tile-mask"
          patternUnits="userSpaceOnUse"
          width={PCB_TILE_W * PCB_SCALE}
          height={PCB_TILE_H * PCB_SCALE}
          viewBox={`0 0 ${PCB_TILE_W} ${PCB_TILE_H}`}
        >
          <g filter="url(#pcb-glow-blur)">
            {blobs.map((b) => (
              <circle
                key={b.id}
                className="pcb-blob"
                r={b.radius}
                fill="url(#pcb-blob-gradient)"
                style={
                  {
                    "--blob-x0": `${b.x0}px`,
                    "--blob-y0": `${b.y0}px`,
                    "--blob-x1": `${b.x1}px`,
                    "--blob-y1": `${b.y1}px`,
                    animationDuration: `${b.duration}s`,
                    animationDelay: `${b.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
            {ripples.map((r) => (
              <circle key={r.id} className="pcb-ripple" cx={r.x} cy={r.y} r={6} fill="none" stroke="#fff" />
            ))}
          </g>
        </pattern>

        <mask id="pcb-pulse-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <rect width="100%" height="100%" fill="url(#pcb-tile-mask)" />
        </mask>
      </defs>

      <rect width="100%" height="100%" fill="url(#pcb-tile-base)" />
      <g className="pcb-glow-layer" mask="url(#pcb-pulse-mask)">
        <rect width="100%" height="100%" fill="url(#pcb-tile-glow)" />
      </g>
    </svg>
  );
}
