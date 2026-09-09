/** TEMPORARY, unconditional visible build marker — no dependency on effects
 * intensity, theme, auth, or any client-side JS running correctly, so
 * there's zero ambiguity about whether a given page load is running the
 * current deployed code. A Server Component reading Vercel's own
 * automatically-injected env var (no dashboard config needed, and no
 * NEXT_PUBLIC_ prefix required since this only ever runs server-side) —
 * so the hash shown is always exactly what's actually deployed, not a
 * string someone has to remember to bump by hand. Remove once the jitter
 * investigation is done. */
export function BuildMarker() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const label = sha ? sha.slice(0, 7) : "local-dev";
  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 999998,
        background: "#ff2f2f",
        color: "#fff",
        font: "bold 13px monospace",
        padding: "4px 8px",
        pointerEvents: "none",
      }}
    >
      BUILD {label}
    </div>
  );
}
