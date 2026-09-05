const SLA_IN_THRESHOLD_SECONDS = 8 * 3600; // later than 8:00 in is slow
const SLA_OUT_THRESHOLD_SECONDS = 21 * 3600; // later than 21:00 out is slow

function parseSlaSeconds(sla: string | null): number | null {
  if (!sla) return null;
  const parts = sla.split(":").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

export function isSlaBreached(slaIn: string | null, slaOut: string | null): boolean {
  const inSeconds = parseSlaSeconds(slaIn);
  const outSeconds = parseSlaSeconds(slaOut);
  return (
    (inSeconds !== null && inSeconds > SLA_IN_THRESHOLD_SECONDS) ||
    (outSeconds !== null && outSeconds > SLA_OUT_THRESHOLD_SECONDS)
  );
}
