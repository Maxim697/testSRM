"use client";

import { useEffect, useState } from "react";

const SYS_VERSION = "2.4.1";

function formatClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Fixed, decorative technical readout in the top-right corner — real
 * wall-clock time, ticking every second. Purely atmospheric: aria-hidden,
 * no interaction. */
export function SystemStatusLine() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first real value can only be known client-side (avoids an SSR/client clock mismatch), then subscribes to a real ticking clock below
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-3 top-1 z-40 font-mono text-[10px] tracking-wide text-text-muted"
    >
      SYS {SYS_VERSION} · ONLINE{now ? ` · ${formatClock(now)}` : ""}
    </div>
  );
}
