/**
 * TEMPORARY debugging aid for isolating which visual effect (if any) is
 * behind the reported table jitter — safe to leave live in production
 * (it's a pure visual toggle, no data/auth implications) but meant to be
 * removed once the culprit is found. Nothing about the real effects is
 * deleted or rewritten here; this only overrides whether each one is
 * switched on, so every step can be checked on the actual deployed site
 * without a redeploy per step.
 *
 * ?fxdebug=<comma-separated keys> on any URL enables *only* those effects
 * and forces every other one off, regardless of the normal effects-
 * intensity setting. ?fxdebug= (empty) or ?fxdebug=off enables none.
 * Omitting ?fxdebug entirely leaves normal behavior completely untouched.
 *
 * Keys: cursor, typing, flicker, sweep, glow, vignette.
 */
export const FX_DEBUG_KEYS = ["cursor", "typing", "flicker", "sweep", "glow", "vignette"] as const;
export type FxDebugKey = (typeof FX_DEBUG_KEYS)[number];

export function readFxDebugParam(): Set<FxDebugKey> | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("fxdebug")) return null;
  const raw = params.get("fxdebug") ?? "";
  const enabled = new Set<FxDebugKey>();
  for (const part of raw.split(",")) {
    const key = part.trim();
    if ((FX_DEBUG_KEYS as readonly string[]).includes(key)) enabled.add(key as FxDebugKey);
  }
  return enabled; // may be empty — that's "all off", still a real override
}

/** true/false = forced by ?fxdebug, null = no override present, use normal logic. */
export function fxDebugOverride(key: FxDebugKey): boolean | null {
  const enabled = readFxDebugParam();
  if (enabled === null) return null;
  return enabled.has(key);
}
