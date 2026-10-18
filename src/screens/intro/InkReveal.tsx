import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import { INK, MIST, introTimeline, rangeProgress, type FrameMetrics } from "./VossieIntroTransition";
import { smooth } from "./dotMotion";

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1).factory();
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();

/**
 * Liquid ink: the landed dot swells into a navy flood with a soft blue-grey edge and loose blobs running
 * ahead of the front, then drains away leaving a few droplets. The blobs are fixed (not random) so every
 * launch and every test frame looks the same.
 *
 * angle: direction from the dot; reach: how far out (fraction of the cover radius); size: blob radius
 * (fraction of the cover radius); lead: how early it starts on expand; lag: how long it hangs on in drain.
 */
const BLOBS = [
  { angle: -2.6, reach: 0.62, size: 0.34, lead: 0.0, lag: 0.34 },
  { angle: -1.5, reach: 0.7, size: 0.3, lead: 0.06, lag: 0.12 },
  { angle: -0.5, reach: 0.58, size: 0.36, lead: 0.02, lag: 0.28 },
  { angle: 0.4, reach: 0.66, size: 0.28, lead: 0.1, lag: 0.4 },
  { angle: 1.3, reach: 0.74, size: 0.33, lead: 0.04, lag: 0.18 },
  { angle: 2.2, reach: 0.6, size: 0.31, lead: 0.12, lag: 0.3 },
  { angle: 3.0, reach: 0.68, size: 0.27, lead: 0.08, lag: 0.22 },
] as const;

type InkRevealProps = {
  clock: SharedValue<number>;
  frame: FrameMetrics;
  reducedMotion: boolean;
  viewportHeight: number;
  viewportWidth: number;
};

export function InkReveal({ clock, frame, reducedMotion, viewportHeight, viewportWidth }: InkRevealProps) {
  const diameter = 51.3647 * frame.scale;
  const centerX = frame.left + 838.5267 * frame.scale;
  const centerY = frame.top + 1323.2055 * frame.scale;
  const coverRadius =
    Math.hypot(Math.max(centerX, viewportWidth - centerX), Math.max(centerY, viewportHeight - centerY)) + 4;
  const coverScale = (coverRadius * 2) / diameter;

  const coreStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0, transform: [{ scale: 0.01 }] };
    const value = clock.get();
    const prepare = rangeProgress(value, introTimeline.portalPrepare);
    const expand = EASE_IN_OUT(rangeProgress(value, introTimeline.portalExpand));
    const retract = EASE_IN_OUT(rangeProgress(value, introTimeline.sharedLogoTransition));
    // the dot breathes in as it gathers, then the flood runs out from it
    const gathered = interpolate(prepare, [0, 0.5, 1], [0.92, 0.74, 1], Extrapolation.CLAMP);
    const expanded = gathered + (coverScale - gathered) * expand;
    const visible = value >= introTimeline.portalPrepare[0] && value < introTimeline.sharedLogoTransition[1];
    return {
      opacity: visible ? 1 : 0,
      transform: [{ scale: expanded * (0.01 + 0.99 * (1 - retract)) }],
    };
  });

  // a slightly larger, lighter disc rides just ahead of the front: the soft mist edge
  const edgeStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0, transform: [{ scale: 0.01 }] };
    const value = clock.get();
    const expand = EASE_IN_OUT(rangeProgress(value, introTimeline.portalExpand));
    const retract = EASE_IN_OUT(rangeProgress(value, introTimeline.sharedLogoTransition));
    const front = coverScale * expand;
    const drain = 1 - retract;
    const active = expand > 0 && value < introTimeline.sharedLogoTransition[1];
    return {
      opacity: active ? 0.55 * smooth(expand * 6) * (retract > 0 ? smooth(drain * 4) : 1) : 0,
      transform: [{ scale: Math.max(0.01, (front * 1.045 + 0.04) * (0.01 + 0.99 * drain)) }],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.disc,
          { backgroundColor: MIST, borderRadius: diameter / 2, height: diameter, left: centerX - diameter / 2, top: centerY - diameter / 2, width: diameter },
          edgeStyle,
        ]}
      />
      {BLOBS.map((blob, index) => (
        <Blob
          blob={blob}
          centerX={centerX}
          centerY={centerY}
          clock={clock}
          coverRadius={coverRadius}
          diameter={diameter}
          key={index}
          reducedMotion={reducedMotion}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.disc,
          { backgroundColor: INK, borderRadius: diameter / 2, height: diameter, left: centerX - diameter / 2, top: centerY - diameter / 2, width: diameter },
          coreStyle,
        ]}
      />
    </>
  );
}

function Blob({
  blob,
  centerX,
  centerY,
  clock,
  coverRadius,
  diameter,
  reducedMotion,
}: {
  blob: (typeof BLOBS)[number];
  centerX: number;
  centerY: number;
  clock: SharedValue<number>;
  coverRadius: number;
  diameter: number;
  reducedMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0 };
    const value = clock.get();
    const expandRaw = rangeProgress(value, introTimeline.portalExpand);
    const grow = EASE_OUT(Math.min(1, Math.max(0, (expandRaw - blob.lead) / (1 - blob.lead))));
    const retractRaw = rangeProgress(value, introTimeline.sharedLogoTransition);
    // drain: blobs let go at different moments and shrink to droplets before they vanish
    const drain = EASE_IN_OUT(Math.min(1, Math.max(0, (retractRaw - blob.lag * 0.4) / (1 - blob.lag * 0.4))));
    const droplet = 1 - drain * 0.88;
    const level = grow * droplet;
    const radius = blob.size * coverRadius * level;
    const travel = blob.reach * coverRadius * grow * (1 - drain * 0.7);
    const visible = value >= introTimeline.portalExpand[0] && value < introTimeline.sharedLogoTransition[1];
    return {
      opacity: visible ? 1 : 0,
      transform: [
        { translateX: Math.cos(blob.angle) * travel },
        { translateY: Math.sin(blob.angle) * travel },
        { scale: Math.max(0.001, (radius * 2) / diameter) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.disc,
        { backgroundColor: INK, borderRadius: diameter / 2, height: diameter, left: centerX - diameter / 2, top: centerY - diameter / 2, width: diameter },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  disc: { position: "absolute" },
});
