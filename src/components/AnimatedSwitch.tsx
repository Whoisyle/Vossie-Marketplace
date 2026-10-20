import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color } from "@/theme/tokens";

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB = 27;
const INSET = 2;
const TRAVEL = TRACK_WIDTH - THUMB - INSET * 2;

/**
 * The toggle from the reference animation: the track fills with the brand slate, the thumb slides across with a
 * spring and stretches while it travels. Same props as React Native's Switch (value, onValueChange), so it drops
 * in anywhere. Reduce Motion swaps the slide for a short fade.
 */
export function AnimatedSwitch({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  value,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  onValueChange?: (value: boolean) => void;
  value: boolean;
}) {
  const reduced = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);
  const stretch = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      on.set(withTiming(value ? 1 : 0, { duration: 140 }));
      return;
    }
    stretch.set(withSpring(1, spring.snappy, () => stretch.set(withSpring(0, spring.bouncy))));
    on.set(withSpring(value ? 1 : 0, spring.bouncy));
  }, [on, reduced, stretch, value]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(Math.min(1, Math.max(0, on.get())), [0, 1], [color.borderStrong, color.primary]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: INSET + on.get() * TRAVEL }, { scaleX: 1 + stretch.get() * 0.22 + press.get() * 0.12 }],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: interpolate(on.get(), [0, 1], [0, 0.18], "clamp") }));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => {
        haptic.select();
        onValueChange?.(!value);
      }}
      onPressIn={() => press.set(withTiming(1, { duration: 90 }))}
      onPressOut={() => press.set(withTiming(0, { duration: 140 }))}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View pointerEvents="none" style={[styles.halo, halo]} />
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  halo: { backgroundColor: color.mist, borderRadius: TRACK_HEIGHT / 2, bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  thumb: {
    backgroundColor: color.onPrimary,
    borderRadius: THUMB / 2,
    boxShadow: "0 2px 5px rgba(30, 42, 56, 0.28)",
    height: THUMB,
    left: 0,
    position: "absolute",
    top: INSET,
    width: THUMB,
  },
  track: { borderCurve: "continuous", borderRadius: TRACK_HEIGHT / 2, height: TRACK_HEIGHT, width: TRACK_WIDTH },
});
