"use client";

import { useEffect } from "react";
import { FX_DEBUG_KEYS, readFxDebugParam } from "@/lib/fx-debug";

/** Sets data-x-<key>="on"/"off" on <html> for each CSS-driven effect when
 * ?fxdebug is present in the URL, so globals.css can force that specific
 * effect regardless of the normal effects-intensity setting. See
 * lib/fx-debug.ts. No-op (touches nothing) when ?fxdebug is absent. */
export function FxDebugController() {
  useEffect(() => {
    const enabled = readFxDebugParam();
    if (enabled === null) return;
    document.documentElement.setAttribute("data-fxdebug", "1");
    for (const key of FX_DEBUG_KEYS) {
      document.documentElement.setAttribute(`data-x-${key}`, enabled.has(key) ? "on" : "off");
    }
    // ?fxdebug= (nothing enabled) is the Step 1 baseline — also kill every
    // other incidental CSS animation/transition in the app (badge pulse,
    // caret blink, skeleton blocks, button/input transitions...), not just
    // the 6 named effects.
    if (enabled.size === 0) {
      document.documentElement.setAttribute("data-fxdebug-blank", "1");
    }
  }, []);

  return null;
}
