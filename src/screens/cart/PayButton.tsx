import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components";
import { haptic } from "@/lib/haptics";
import { duration, spring } from "@/theme/motion";
import { color, corner, gradient, size, text } from "@/theme/tokens";

export type PayState = "idle" | "processing" | "success" | "failed";

/**
 * The Pay Now button with four states: idle, processing, success (green tick pops) and failed (red, shakes).
 * Reduce Motion keeps the colour and icon changes but drops the pop and the shake.
 */
export function PayButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void;
  state: PayState;
}) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === "success") {
      haptic.success();
      if (!reduced) {
        pop.set(0.8);
        pop.set(withSpring(1, spring.bouncy));
      }
    } else if (state === "failed") {
      haptic.error();
      if (!reduced) {
        shake.set(
          withSequence(
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 80 }),
            withTiming(-6, { duration: 70 }),
            withTiming(6, { duration: 70 }),
            withTiming(0, { duration: 50 }),
          ),
        );
      }
    }
  }, [pop, reduced, shake, state]);

  const motion = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }, { scale: pop.get() }] }));
  const busy = state === "processing";
  const tint = state === "success" ? color.success : state === "failed" ? color.danger : null;
  const text_ =
    state === "processing" ? "Processing payment…" : state === "success" ? "Payment successful" : state === "failed" ? "Payment failed, tap to retry" : label;

  return (
    <Animated.View style={motion}>
      <Pressable
        accessibilityLabel={text_}
        accessibilityLiveRegion="polite"
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy || state === "success" }}
        disabled={busy || state === "success"}
        onPress={() => {
          haptic.press();
          onPress();
        }}
        style={[styles.base, tint ? { backgroundColor: tint } : null]}
        testID="pay-now"
      >
        {tint ? null : (
          <LinearGradient
            colors={gradient.primary}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.row}>
          {busy ? <ActivityIndicator color={color.onPrimary} /> : null}
          {state === "success" ? <Icon color={color.onPrimary} name="check-circle" size={20} /> : null}
          {state === "failed" ? <Icon color={color.onPrimary} name="alert-circle" size={20} /> : null}
          <Text numberOfLines={1} style={[text.button, styles.label]}>
            {text_}
          </Text>
          {state === "idle" ? <Icon color={color.onPrimary} name="arrow-right" size={18} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** How long the processing state lasts in the demo, and how long the success tick stays before moving on. */
export const PROCESSING_MS = 1400;
export const SUCCESS_HOLD_MS = duration.slow + 500;

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: color.primary,
    borderCurve: "continuous",
    borderRadius: corner.pill,
    justifyContent: "center",
    minHeight: size.controlLarge,
    overflow: "hidden",
  },
  label: { color: color.onPrimary },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
});
