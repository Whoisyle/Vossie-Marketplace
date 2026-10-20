import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { spring } from "@/theme/motion";
import { color } from "@/theme/tokens";

const STEP = 18;
const DOT = 6;
const THUMB = 14;
const PAD = 5;
const HEIGHT = THUMB + PAD * 2 - 2;

/**
 * Page indicator from the reference animation: a dark pill of small dots with a white bead that slides to the
 * current page, stretching into a blob while it travels and settling with a small bounce. Tapping a dot goes to
 * that page. Reduce Motion moves the bead with a short fade instead of the stretch.
 */
export function PageDots({
  count,
  label = "Show page",
  onSelect,
  page,
}: {
  count: number;
  page: number;
  onSelect?: (index: number) => void;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const position = useSharedValue(page);
  const stretch = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      position.set(withTiming(page, { duration: 140 }));
      return;
    }
    const distance = Math.abs(page - position.get());
    stretch.set(withSpring(Math.min(1, distance / 2 + 0.4), spring.snappy, () => stretch.set(withSpring(0, spring.bouncy))));
    position.set(withSpring(page, spring.soft));
  }, [page, position, reduced, stretch]);

  const bead = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + position.get() * STEP }, { scaleX: 1 + stretch.get() * 0.9 }, { scaleY: 1 - stretch.get() * 0.12 }],
  }));

  if (count < 2) return null;
  return (
    <View accessibilityRole="tablist" style={[styles.track, { width: PAD * 2 + (count - 1) * STEP + THUMB }]} testID="page-dots">
      {Array.from({ length: count }, (_, index) => (
        <Pressable
          accessibilityLabel={`${label} ${index + 1} of ${count}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: index === page }}
          hitSlop={{ bottom: 12, top: 12 }}
          key={index}
          onPress={() => onSelect?.(index)}
          style={[styles.hit, { left: PAD + index * STEP + (THUMB - STEP) / 2 }]}
        >
          <View style={[styles.dot, { opacity: index === page ? 0 : index > page ? 0.6 : 0.35 }]} />
        </Pressable>
      ))}
      <Animated.View pointerEvents="none" style={[styles.bead, bead]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bead: { backgroundColor: color.onPrimary, borderRadius: THUMB / 2, height: THUMB, left: 0, position: "absolute", top: (HEIGHT - THUMB) / 2, width: THUMB },
  dot: { backgroundColor: color.mist, borderRadius: DOT / 2, height: DOT, width: DOT },
  hit: { alignItems: "center", height: HEIGHT, justifyContent: "center", position: "absolute", top: 0, width: STEP },
  track: { alignSelf: "center", backgroundColor: color.ink, borderCurve: "continuous", borderRadius: HEIGHT / 2, height: HEIGHT },
});
