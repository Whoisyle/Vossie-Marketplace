import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color } from "@/theme/tokens";

import { Icon } from "./Icon";

export const STAR_GOLD = "#E8A317";

/**
 * Stars from 1 to 5. Read-only it shows the average (halves are drawn as a half-filled star). With `onChange`
 * each star can be tapped; the stars up to your choice pop in turn, with a soft vibration.
 */
export function StarRating({
  onChange,
  size = 16,
  value,
}: {
  value: number;
  onChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
}) {
  return (
    <View
      accessibilityLabel={onChange ? `Rating, ${value || "none"} of 5` : `${value.toFixed(1)} out of 5 stars`}
      accessibilityRole={onChange ? "adjustable" : "image"}
      accessibilityValue={onChange ? { max: 5, min: 1, now: value || undefined } : undefined}
      style={styles.row}
    >
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <Star
          fill={Math.max(0, Math.min(1, value - (star - 1)))}
          interactive={Boolean(onChange)}
          key={star}
          onPress={() => {
            haptic.select();
            onChange?.(star);
          }}
          pop={onChange ? value : 0}
          size={size}
          star={star}
        />
      ))}
    </View>
  );
}

function Star({
  fill,
  interactive,
  onPress,
  pop,
  size,
  star,
}: {
  fill: number;
  interactive: boolean;
  onPress: () => void;
  pop: number;
  size: number;
  star: number;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (interactive && pop >= star) {
      scale.set(withDelay((star - 1) * 45, withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, spring.bouncy))));
    }
  }, [interactive, pop, scale, star]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const body = (
    <Animated.View style={[{ height: size, width: size }, style]}>
      <Icon color={color.borderStrong} name="star" size={size} />
      <View style={[styles.fill, { width: size * fill }]}>
        <Icon color={STAR_GOLD} name="star" size={size} />
      </View>
    </Animated.View>
  );
  if (!interactive) return body;
  return (
    <Pressable
      accessibilityLabel={`${star} star${star > 1 ? "s" : ""}`}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={styles.hit}
    >
      {body}
    </Pressable>
  );
}

/** Large "4.8" with the star row and a count underneath. */
export function RatingSummary({ average, count }: { average: number; count: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.average}>{count ? average.toFixed(1) : "–"}</Text>
      <StarRating size={16} value={average} />
      <Text style={styles.count}>{count} review{count === 1 ? "" : "s"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  average: { color: color.heading, fontSize: 38, fontWeight: "800" },
  count: { color: color.textMuted, fontSize: 12 },
  fill: { bottom: 0, left: 0, overflow: "hidden", position: "absolute", top: 0 },
  hit: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 40 },
  row: { alignItems: "center", flexDirection: "row", gap: 2 },
  summary: { alignItems: "center", gap: 4 },
});
