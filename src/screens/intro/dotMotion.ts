/**
 * Pure motion curves for the intro dot. They are worklets so Reanimated can run them on the UI thread,
 * and plain functions so they can be unit tested.
 *
 * A bouncing ball keeps a roughly constant sideways speed and follows a parabola in the air; it only
 * squashes in the instant it touches down. The previous dot eased in and out sideways on every hop,
 * which made it stop at each letter. These curves remove that stop-start.
 */

/** 0 in flight, rising to 1 at the instant of contact; eases in and out so there is no sudden squash. */
export function landingSquash(p: number, squashAtStart: boolean): number {
  "worklet";
  const window = 0.18;
  const end = p > 1 - window ? (p - (1 - window)) / window : 0;
  const start = squashAtStart && p < window ? 1 - p / window : 0;
  const t = Math.max(end, start);
  return t * t * (3 - 2 * t);
}

/** Parabolic lift (negative = up) that is 0 at both ends and `arc` at the top. */
export function hopLift(p: number, arc: number): number {
  "worklet";
  return -arc * 4 * p * (1 - p);
}

/** Sideways progress: constant speed, except the last hop which glides to a stop on the i. */
export function hopRun(p: number, isLast: boolean): number {
  "worklet";
  return isLast ? 1 - Math.pow(1 - p, 1.7) : p;
}

export function hopScales(p: number, squashAtStart: boolean): { x: number; y: number } {
  "worklet";
  const squash = landingSquash(p, squashAtStart);
  const air = Math.sin(Math.PI * p);
  return { x: 1 + 0.26 * squash - 0.05 * air, y: 1 - 0.3 * squash + 0.1 * air };
}

/** Damped bounce after the final landing; t runs 0 to 1 over the settle window. */
export function settleWobble(t: number, amplitude: number): number {
  "worklet";
  if (t <= 0) return 0;
  return -amplitude * Math.exp(-5.5 * t) * Math.abs(Math.sin(t * 13));
}

/** Smoothstep for gentle ramps. */
export function smooth(t: number): number {
  "worklet";
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
