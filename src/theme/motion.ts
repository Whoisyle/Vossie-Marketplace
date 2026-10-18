/**
 * Shared motion language (docs/ui-ux/motion-plan.md). Use these instead of ad-hoc numbers so every screen
 * feels like the same app: springs for things you touch, eased timing for things the app does.
 */
import { Easing } from "react-native-reanimated";

export const spring = {
  /** Panels, sheets and the navbar pill: settles quickly with a very small overshoot. */
  soft: { damping: 22, mass: 1, stiffness: 170 },
  /** Buttons and chips pressed by a finger. */
  snappy: { damping: 20, mass: 0.8, stiffness: 320 },
  /** Likes, ticks and celebration: visible overshoot. */
  bouncy: { damping: 11, mass: 0.9, stiffness: 240 },
  /** Things that follow a finger or sensor smoothly. */
  follow: { damping: 30, mass: 1, stiffness: 90 },
} as const;

export const duration = {
  fast: 160,
  base: 260,
  slow: 420,
  /** Ambient loops (drifting bubbles, breathing glows). */
  ambientMin: 7_000,
  ambientMax: 14_000,
} as const;

export const ease = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** Gentle sine for ambient motion. */
  sine: Easing.inOut(Easing.sin),
} as const;

/** Scale applied while a control is pressed. */
export const pressScale = 0.96;

/** Deterministic pseudo-random in [0, 1) so ambient motion looks the same on every launch and in tests. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
