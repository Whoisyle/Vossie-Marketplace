import { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { color, corner, space } from "@/theme/tokens";

/** A soft grey block that pulses while content loads. Reduce Motion keeps it still. */
export function Skeleton({
  height = 16,
  radius = corner.sm,
  style,
  width = "100%",
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 750 }), withTiming(0, { duration: 750 })), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.get() * 0.45 }));
  return <Animated.View style={[styles.block, { borderRadius: radius, height, width }, animated, style]} />;
}

/** The shape of a screen full of listings: heading, banner and two rows of cards. */
export function ListingsSkeleton({ testID = "skeleton" }: { testID?: string }) {
  return (
    <View accessibilityLabel="Loading" accessibilityLiveRegion="polite" style={styles.wrap} testID={testID}>
      <Skeleton height={22} width="55%" />
      <Skeleton height={14} width="35%" />
      <Skeleton height={52} radius={26} style={styles.gap} />
      <Skeleton height={180} radius={corner.xl} style={styles.gap} />
      {[0, 1].map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton height={168} radius={corner.md} width="49%" />
          <Skeleton height={168} radius={corner.md} width="49%" />
        </View>
      ))}
    </View>
  );
}

/**
 * True for a moment the first time a screen opens in a session, so the skeleton shows while "data loads".
 * Off in tests. Once a screen has shown, coming back to it shows content straight away.
 */
const seen = new Set<string>();
export function useFirstLoad(key: string, ms = 450, enabled = !process.env.JEST_WORKER_ID): boolean {
  const [loading, setLoading] = useState(() => enabled && !seen.has(key));
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      seen.add(key);
      setLoading(false);
    }, ms);
    return () => clearTimeout(timer);
  }, [key, loading, ms]);
  return loading;
}

/** For tests: forget which screens have already loaded. */
export function resetFirstLoads() {
  seen.clear();
}

const styles = StyleSheet.create({
  block: { backgroundColor: color.mist },
  gap: { marginTop: space.xs },
  row: { flexDirection: "row", gap: space.xs, justifyContent: "space-between", marginTop: space.xs },
  wrap: { gap: space.xs, marginTop: space.sm },
});
