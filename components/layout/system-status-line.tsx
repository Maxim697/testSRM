"use client";

import { useEffect, useState } from "react";
import { useEffectsIntensity } from "@/components/effects-provider";

const SYS_VERSION = "2.4.1";

function formatClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Fixed, decorative technical readout in the top-right corner — real
 * wall-clock time, ticking every second. Purely atmospheric: aria-hidden,
 * no interaction. Off entirely at effects intensity "off". */
export function SystemStatusLine() {
  const { intensity } = useEffectsIntensity();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first real value can only be known client-side (avoids an SSR/client clock mismatch), then subscribes to a real ticking clock below
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (intensity === "off") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-3 top-1 z-40 font-mono text-[10px] tracking-wide text-[#33ff66] opacity-35"
    >
      SYS {SYS_VERSION} · ONLINE{now ? ` · ${formatClock(now)}` : ""}
    </div>
  );
}
