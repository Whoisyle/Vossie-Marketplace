import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  type SharedValue,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTilt } from "@/lib/useTilt";
import { color } from "@/theme/tokens";
import { duration, ease, seeded } from "@/theme/motion";

/**
 * The sign-in bubbles: soft, slow, alive.
 *  - they drift on their own at different speeds (nothing loops in sync)
 *  - they lean toward a finger that touches the screen
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
  accent: { backgroundColor: color.accent, opacity: 1 },
  ink: { backgroundColor: color.ink, opacity: 0.88 },
  mist: { backgroundColor: color.mist, opacity: 0.8 },
} as const;

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
  const reduced = useReducedMotion();
  const tilt = useTilt(!reduced);
  return (
    <>
      {BUBBLES.map((bubble, index) => (
        <Bubble {...props} bubble={bubble} index={index} key={index} reduced={reduced} tilt={tilt} />
      ))}
    </>
  );
}

const Bubble = memo(function Bubble({
  bubble,
  burst,
  height,
  index,
  pulse,
  reduced,
  tilt,
  touchActive,
  touchX,
  touchY,
  width,
}: Props & {
  bubble: (typeof BUBBLES)[number];
  index: number;
  reduced: boolean;
  tilt: { x: SharedValue<number>; y: SharedValue<number> };
}) {
  const radius = (bubble.r / 560) * width;
  const centerX = (bubble.x / 560) * width;
  const centerY = (bubble.y / 1205) * height;
  const driftX = useSharedValue(seeded(index + 1));
  const driftY = useSharedValue(seeded(index + 11));

  useEffect(() => {
    if (reduced) return;
    const span = duration.ambientMax - duration.ambientMin;
    const loop = (value: SharedValue<number>, seed: number) => {
      const from = value.get();
      value.set(
        withDelay(
          Math.round(seeded(seed) * 1_500),
          withRepeat(withTiming(from > 0.5 ? 0 : 1, { duration: duration.ambientMin + seeded(seed + 3) * span, easing: ease.sine }), -1, true),
        ),
      );
    };
    loop(driftX, index * 2 + 1);
    loop(driftY, index * 2 + 2);
    return () => {
      cancelAnimation(driftX);
      cancelAnimation(driftY);
    };
  }, [driftX, driftY, index, reduced]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: TONES[bubble.tone].opacity };
    // slow wander, a bit larger for small bubbles
    const wander = 10 + 26 * bubble.depth;
    let dx = interpolate(driftX.get(), [0, 1], [-wander, wander]);
    let dy = interpolate(driftY.get(), [0, 1], [-wander * 0.8, wander * 0.8]);

    // depth from tilt
    dx += tilt.x.get() * 22 * bubble.depth;
    dy += tilt.y.get() * 22 * bubble.depth;

    // lean toward a finger that is close
    const toX = touchX.get() - (centerX + dx);
    const toY = touchY.get() - (centerY + dy);
    const reach = 260;
    const near = Math.max(0, 1 - Math.hypot(toX, toY) / reach);
    const pull = touchActive.get() * near * 0.16;
    dx += toX * pull;
    dy += toY * pull;

    // burst: leave the centre of the screen
    const b = burst.get();
    dx += (centerX - width / 2) * b * 0.7;
    dy += (centerY - height / 2) * b * 0.7;

    const breathe = 1 + 0.025 * Math.sin(driftX.get() * Math.PI);
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
          backgroundColor: TONES[bubble.tone].backgroundColor,
          borderRadius: radius,
          height: radius * 2,
          left: centerX - radius,
          top: centerY - radius,
          width: radius * 2,
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  bubble: { position: "absolute" },
});
