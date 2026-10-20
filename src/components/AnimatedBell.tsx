import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { spring } from "@/theme/motion";
import { color } from "@/theme/tokens";

import { Icon } from "./Icon";

/**
 * The notification bell from the reference animation: when something new arrives the bell swings as if ringing and
 * a dark badge pops onto its corner with a spring. Reduce Motion skips the swing and just shows the badge.
 */
export function AnimatedBell({ count = 0, size = 20, unread = false }: { count?: number; size?: number; unread?: boolean }) {
  const reduced = useReducedMotion();
  const swing = useSharedValue(0);
  const pop = useSharedValue(unread ? 1 : 0);

  useEffect(() => {
    if (!unread) {
      pop.set(withTiming(0, { duration: 140 }));
      return;
    }
    if (reduced) {
      pop.set(1);
      return;
    }
    swing.set(
      withSequence(
        withTiming(-16, { duration: 70 }),
        withTiming(14, { duration: 110 }),
        withTiming(-10, { duration: 110 }),
        withTiming(6, { duration: 100 }),
        withTiming(0, { duration: 90 }),
      ),
    );
    pop.set(withDelay(260, withSpring(1, spring.bouncy)));
  }, [pop, reduced, swing, unread]);

  // the bell swings from its top, like a hanging bell
  const bell = useAnimatedStyle(() => ({
    transform: [{ translateY: -size * 0.45 }, { rotate: `${swing.get()}deg` }, { translateY: size * 0.45 }],
  }));
  const badge = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.get()), transform: [{ scale: pop.get() }] }));

  return (
    <>
      <Animated.View style={bell}>
        <Icon color={color.heading} name="bell" size={size} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[count > 0 ? styles.badgeCount : styles.badgeDot, badge]}>
        {count > 0 ? <Text style={styles.count}>{count > 9 ? "9+" : count}</Text> : null}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  badgeCount: {
    alignItems: "center",
    backgroundColor: color.ink,
    borderColor: color.background,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: 8,
    top: 8,
  },
  badgeDot: {
    backgroundColor: color.ink,
    borderColor: color.background,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    position: "absolute",
    right: 12,
    top: 11,
    width: 10,
  },
  count: { color: color.onPrimary, fontSize: 10, fontWeight: "800" },
});
