"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";
import { CIRCUIT_PULSE_EVENT, type CircuitPulseDetail } from "@/lib/circuit-pulse-event";
import { PCB_BOARD_ID, PCB_MARKUP, PCB_TILE_H, PCB_TILE_W } from "@/components/background/pcb-source";
import { PCB_ROUTES } from "@/components/background/pcb-routes";

/* ==========================================================================
   Real vector PCB artwork (CC0, see pcb-source.ts) tiled as the background,
   with a second bright copy of the same artwork revealed only where a set
   of moving soft-edged light shapes sit, via an SVG <mask>. Because the
   mask only ever reveals real trace pixels, the moving lights read as
   travelling along the actual traces without needing a centerline path —
   the dark space between traces simply never lights up.
   ========================================================================== */

type Light = { id: number; routeIndex: number; duration: number; delay: number; length: number; thickness: number };
type Ripple = { id: number; x: number; y: number };

const LIGHT_POOL_SIZE = 10;
const LIGHT_COUNT_FULL = 7;
const LIGHT_COUNT_MODERATE = 4;

/** The board is drawn at this fraction of its native size so ~150-200
 * traces fit across a screen width (median trace is ~10 native units
 * wide, measured directly off the artwork's pixels — see the tracing
 * session that generated pcb-routes.ts), instead of ~20 at native scale. */
const PCB_SCALE = 0.22;

function buildLightPool(): Light[] {
  return Array.from({ length: LIGHT_POOL_SIZE }, (_, i) => {
    const duration = 9 + Math.random() * 8;
    return {
      id: i,
      routeIndex: i % PCB_ROUTES.length,
      duration,
      delay: -Math.random() * duration, // negative delay: start already mid-flight, staggered
      // native units — at PCB_SCALE these render as ~150-250px long and
      // at most as thick as a single trace (median trace width ~10 native)
      length: 680 + Math.random() * 440,
      thickness: 6 + Math.random() * 4,
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

  const lightPool = useMemo(() => buildLightPool(), []);
  const lights = lightPool.slice(0, intensity === "moderate" ? LIGHT_COUNT_MODERATE : LIGHT_COUNT_FULL);

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

        <filter id="pcb-light-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>

        <linearGradient id="pcb-light-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>

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
          <g filter="url(#pcb-light-blur)">
            {lights.map((l) => (
              <g
                key={l.id}
                className="pcb-light"
                style={{
                  offsetPath: `path("${PCB_ROUTES[l.routeIndex]}")`,
                  offsetRotate: "auto",
                  animationDuration: `${l.duration}s`,
                  animationDelay: `${l.delay}s`,
                }}
              >
                <rect
                  x={-l.length}
                  y={-l.thickness / 2}
                  width={l.length}
                  height={l.thickness}
                  rx={l.thickness / 2}
                  fill="url(#pcb-light-gradient)"
                />
              </g>
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
