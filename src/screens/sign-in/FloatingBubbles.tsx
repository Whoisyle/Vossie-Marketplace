import { memo, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";

import { useTilt } from "@/lib/useTilt";
import { LinearGradient } from "expo-linear-gradient";

import { gradient } from "@/theme/tokens";
import { seeded } from "@/theme/motion";

/**
 * The sign-in bubbles: soft, alive, and they push each other around.
 *  - every bubble is a real circle with weight (heavier when bigger): they drift on their own,
 *    bump into one another and bounce off, then ease back toward their place in the design
 *  - a finger (or a mouse pointer on the web) is a solid circle too: touching or dragging
 *    shoves the bubbles away and flings them into their neighbours
 *  - `pulse` makes them swell gently (focusing the email field)
 *  - `burst` sends them outward and fades them (pressing Next)
 *  - they shift with the phone's tilt for depth, big ones less than small ones
 * Reduced Motion turns all of it off and leaves the original static layout.
 *
 * Geometry is from design/screens/03-sign-in-microsoft.png on a 560 x 1205 frame.
 */
const BUBBLES = [
  { x: 150, y: 160, r: 165, tone: "accent", depth: 0.35 },
  { x: 470, y: 85, r: 120, tone: "accent", depth: 0.45 },
  { x: 340, y: 255, r: 58, tone: "ink", depth: 1 },
  { x: 520, y: 335, r: 115, tone: "mist", depth: 0.5 },
  { x: 280, y: 605, r: 300, tone: "accent", depth: 0.2 },
  { x: 505, y: 835, r: 68, tone: "mist", depth: 0.9 },
  { x: 165, y: 1005, r: 150, tone: "accent", depth: 0.4 },
  { x: 400, y: 945, r: 60, tone: "ink", depth: 1 },
  { x: 410, y: 1100, r: 105, tone: "mist", depth: 0.55 },
] as const;

const TONES = {
  accent: { colors: gradient.teal, opacity: 1 },
  ink: { colors: gradient.ink, opacity: 0.9 },
  mist: { colors: gradient.mist, opacity: 0.85 },
} as const;

// Physics, in screen points and seconds. Speeds are scaled by the screen width.
const HOME_PULL = 0.22; // how firmly a bubble drifts back to its place in the design
const DRAG = 0.12; // slow loss of speed
const BOUNCE = 0.92; // 1 = perfectly bouncy
const MIN_SPEED = 14;
const MAX_SPEED = 320;
const FINGER_RADIUS = 34;

type Sim = { fx: number; fy: number; t: number; vx: number[]; vy: number[]; x: number[]; y: number[] };

type Props = {
  width: number;
  height: number;
  /** 0 to 1 and back; a gentle swell. */
  pulse: SharedValue<number>;
  /** 0 to 1; bubbles drift outward and fade. */
  burst: SharedValue<number>;
  /** Finger position in screen points, and whether a finger is down (0 or 1). */
  touchX: SharedValue<number>;
  touchY: SharedValue<number>;
  touchActive: SharedValue<number>;
};

export function FloatingBubbles(props: Props) {
  const { height, touchActive, touchX, touchY, width } = props;
  const reduced = useReducedMotion();
  const tilt = useTilt(!reduced);

  const layout = useMemo(
    () => ({
      homeX: BUBBLES.map((bubble) => (bubble.x / 560) * width),
      homeY: BUBBLES.map((bubble) => (bubble.y / 1205) * height),
      // a touch smaller than drawn, so bubbles meet at their soft edges
      hit: BUBBLES.map((bubble) => (bubble.r / 560) * width * 0.94),
      unit: width / 390,
    }),
    [height, width],
  );

  const sim = useSharedValue<Sim>({
    fx: layout.homeX[0] ?? 0,
    fy: layout.homeY[0] ?? 0,
    t: 0,
    vx: BUBBLES.map((_, i) => (seeded(i * 3 + 1) - 0.5) * 2 * 30 * layout.unit),
    vy: BUBBLES.map((_, i) => (seeded(i * 3 + 2) - 0.5) * 2 * 30 * layout.unit),
    x: layout.homeX.slice(),
    y: layout.homeY.slice(),
  });

  useFrameCallback((frame) => {
    "worklet";
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.032);
    if (dt <= 0) return;
    const { hit, homeX, homeY, unit } = layout;
    const count = hit.length;
    const fingerDown = touchActive.get() > 0.4;
    const tx = touchX.get();
    const ty = touchY.get();

    sim.modify((s) => {
      "worklet";
      s.t += dt;
      const fvx = (tx - s.fx) / dt;
      const fvy = (ty - s.fy) / dt;
      s.fx = tx;
      s.fy = ty;
      const drag = Math.exp(-DRAG * dt);
      const minSpeed = MIN_SPEED * unit;
      const maxSpeed = MAX_SPEED * unit;

      for (let i = 0; i < count; i++) {
        s.vx[i] = (s.vx[i]! + (homeX[i]! - s.x[i]!) * HOME_PULL * dt) * drag;
        s.vy[i] = (s.vy[i]! + (homeY[i]! - s.y[i]!) * HOME_PULL * dt) * drag;
        const speed = Math.hypot(s.vx[i]!, s.vy[i]!);
        if (speed > maxSpeed) {
          const f = 1 - Math.min(1, 3 * dt) * (1 - maxSpeed / speed);
          s.vx[i] = s.vx[i]! * f;
          s.vy[i] = s.vy[i]! * f;
        } else if (speed < minSpeed) {
          // never go still: nudge along the current heading, or a slowly turning one
          const angle = speed > 0.5 ? Math.atan2(s.vy[i]!, s.vx[i]!) : s.t * 0.7 + i;
          s.vx[i] = s.vx[i]! + Math.cos(angle) * minSpeed * 1.5 * dt;
          s.vy[i] = s.vy[i]! + Math.sin(angle) * minSpeed * 1.5 * dt;
        }
        s.x[i] = s.x[i]! + s.vx[i]! * dt;
        s.y[i] = s.y[i]! + s.vy[i]! * dt;
      }

      // bubble against bubble: equal-and-opposite bounce, weight = area
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = s.x[j]! - s.x[i]!;
          const dy = s.y[j]! - s.y[i]!;
          const minDist = hit[i]! + hit[j]!;
          const distSq = dx * dx + dy * dy;
          if (distSq >= minDist * minDist || distSq === 0) continue;
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const invI = 1 / (hit[i]! * hit[i]!);
          const invJ = 1 / (hit[j]! * hit[j]!);
          const closing = (s.vx[j]! - s.vx[i]!) * nx + (s.vy[j]! - s.vy[i]!) * ny;
          if (closing < 0) {
            const impulse = (-(1 + BOUNCE) * closing) / (invI + invJ);
            s.vx[i] = s.vx[i]! - impulse * invI * nx;
            s.vy[i] = s.vy[i]! - impulse * invI * ny;
            s.vx[j] = s.vx[j]! + impulse * invJ * nx;
            s.vy[j] = s.vy[j]! + impulse * invJ * ny;
          }
          // ease overlapping bubbles apart, the lighter one giving way more
          const overlap = (minDist - dist) * 0.14;
          const shareI = invI / (invI + invJ);
          s.x[i] = s.x[i]! - nx * overlap * shareI;
          s.y[i] = s.y[i]! - ny * overlap * shareI;
          s.x[j] = s.x[j]! + nx * overlap * (1 - shareI);
          s.y[j] = s.y[j]! + ny * overlap * (1 - shareI);
        }
      }

      // the finger is a solid circle that bubbles cannot overlap
      if (fingerDown) {
        const fingerRadius = FINGER_RADIUS * unit;
        for (let i = 0; i < count; i++) {
          const dx = s.x[i]! - tx;
          const dy = s.y[i]! - ty;
          const minDist = hit[i]! + fingerRadius;
          const distSq = dx * dx + dy * dy;
          if (distSq >= minDist * minDist || distSq === 0) continue;
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const closing = (s.vx[i]! - fvx) * nx + (s.vy[i]! - fvy) * ny;
          if (closing < 0) {
            s.vx[i] = s.vx[i]! - (1 + BOUNCE) * closing * nx;
            s.vy[i] = s.vy[i]! - (1 + BOUNCE) * closing * ny;
          }
          s.x[i] = s.x[i]! + nx * (minDist - dist) * 0.35;
          s.y[i] = s.y[i]! + ny * (minDist - dist) * 0.35;
        }
      }
      return s;
    });
  }, !reduced);

  return (
    <>
      {BUBBLES.map((bubble, index) => (
        <Bubble {...props} bubble={bubble} homeX={layout.homeX[index]!} homeY={layout.homeY[index]!} index={index} key={index} reduced={reduced} sim={sim} tilt={tilt} />
      ))}
    </>
  );
}

const Bubble = memo(function Bubble({
  bubble,
  burst,
  height,
  homeX,
  homeY,
  index,
  pulse,
  reduced,
  sim,
  tilt,
  width,
}: Props & {
  bubble: (typeof BUBBLES)[number];
  homeX: number;
  homeY: number;
  index: number;
  reduced: boolean;
  sim: SharedValue<Sim>;
  tilt: { x: SharedValue<number>; y: SharedValue<number> };
}) {
  const radius = (bubble.r / 560) * width;

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: TONES[bubble.tone].opacity };
    const s = sim.get();
    // where physics has moved it from its place in the design
    let dx = (s.x[index] ?? homeX) - homeX;
    let dy = (s.y[index] ?? homeY) - homeY;

    // depth from tilt
    dx += tilt.x.get() * 22 * bubble.depth;
    dy += tilt.y.get() * 22 * bubble.depth;

    // burst: leave the centre of the screen
    const b = burst.get();
    dx += (homeX - width / 2) * b * 0.7;
    dy += (homeY - height / 2) * b * 0.7;

    const breathe = 1 + 0.025 * Math.sin(s.t * 0.6 + index);
    const scale = breathe + pulse.get() * (0.04 + 0.05 * bubble.depth) + b * 0.35;
    return {
      opacity: TONES[bubble.tone].opacity * (1 - b),
      transform: [{ translateX: dx }, { translateY: dy }, { scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          borderRadius: radius,
          height: radius * 2,
          left: homeX - radius,
          top: homeY - radius,
          width: radius * 2,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={TONES[bubble.tone].colors}
        end={{ x: 0.85, y: 1 }}
        start={{ x: 0.15, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bubble: { overflow: "hidden", position: "absolute" },
});
