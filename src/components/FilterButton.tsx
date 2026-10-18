import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { duration } from "@/theme/motion";
import { color, corner, gradient } from "@/theme/tokens";

import { Icon } from "./Icon";

/** The dark square beside a search bar that opens the filters sheet; shows how many filters are on. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.08 }] }));
  return (
    <Pressable
      accessibilityLabel={count > 0 ? `Filters, ${count} active` : "Filters"}
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={() => press.set(withTiming(1, { duration: 80 }))}
      onPressOut={() => press.set(withTiming(0, { duration: duration.base }))}
      testID="open-filters"
    >
      <Animated.View style={[styles.filter, style]}>
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <Icon color={color.onPrimary} name="sliders" size={20} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: color.mist,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    position: "absolute",
    right: 6,
    top: 6,
  },
  badgeText: { color: color.ink, fontSize: 10, fontWeight: "800" },
  filter: {
    alignItems: "center",
    borderRadius: corner.lg,
    boxShadow: "0 8px 16px rgba(30, 42, 56, 0.22)",
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
});
