/** Fired by interactive elements (buttons) on click so the circuit background
 * can spawn a burst of pulses radiating outward from that screen position. */
export const CIRCUIT_PULSE_EVENT = "circuit-pulse-burst";

export type CircuitPulseDetail = { x: number; y: number };

export function emitCircuitPulse(x: number, y: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CircuitPulseDetail>(CIRCUIT_PULSE_EVENT, { detail: { x, y } }));
}
