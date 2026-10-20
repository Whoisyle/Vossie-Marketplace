import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { ease } from "@/theme/motion";

/** How long the turn takes. Slow enough to read as a physical card, quick enough not to be waited for. */
export const FLIP_MS = 620;

/**
 * A card that turns over on tap to show its back. Both faces are the same size and sit on top of each other; the
 * pair rotates around the vertical axis and the face pointing away is hidden. With Reduce Motion on the faces
 * cross-fade instead of turning. Controlled with `flipped` and `onFlip`, or on its own when `flipped` is left out.
 */
export function FlipCard({
  back,
  flipped,
  front,
  height,
  label,
  onFlip,
  testID,
  width,
}: {
  front: ReactNode;
  back: ReactNode;
  width: number;
  height: number;
  /** What the card is, for screen readers. "Tap to turn over" is added. */
  label: string;
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
  testID?: string;
}) {
  const [own, setOwn] = useState(false);
  const isFlipped = flipped ?? own;
  const reduced = useReducedMotion();
  const turn = useSharedValue(isFlipped ? 1 : 0);
  // follows the prop, so a card turned back by its parent animates too
  useEffect(() => {
    turn.set(withTiming(isFlipped ? 1 : 0, { duration: reduced ? 160 : FLIP_MS, easing: ease.inOut }));
  }, [isFlipped, reduced, turn]);

  const frontStyle = useAnimatedStyle(() => {
    const t = turn.get();
    return reduced
      ? { opacity: 1 - t }
      : { opacity: t < 0.5 ? 1 : 0, transform: [{ perspective: 1100 }, { rotateY: `${t * 180}deg` }] };
  });
  const backStyle = useAnimatedStyle(() => {
    const t = turn.get();
    return reduced
      ? { opacity: t }
      : { opacity: t < 0.5 ? 0 : 1, transform: [{ perspective: 1100 }, { rotateY: `${t * 180 - 180}deg` }] };
  });

  return (
    <Pressable
      accessibilityHint={isFlipped ? "Turns the card back to the front" : "Turns the card over to see the back"}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        haptic.select();
        const next = !isFlipped;
        setOwn(next);
        onFlip?.(next);
      }}
      style={{ height, width }}
      testID={testID}
    >
      <Animated.View pointerEvents="none" style={[styles.face, frontStyle]}>
        {front}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.face, backStyle]}>
        <View>{back}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: "hidden", left: 0, position: "absolute", top: 0 },
});
