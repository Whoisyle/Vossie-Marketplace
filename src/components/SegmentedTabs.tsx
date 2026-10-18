import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, corner, space } from "@/theme/tokens";

/** Equal-width tabs with a pill that slides under the chosen one. */
export function SegmentedTabs<T extends string>({
  onChange,
  options,
  value,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.key === value));
  const segment = width > 0 ? (width - PADDING * 2) / options.length : 0;
  const x = useSharedValue(0);
  const placed = useSharedValue(0);

  useEffect(() => {
    if (segment === 0) return;
    if (placed.get() === 0) {
      x.set(index * segment);
      placed.set(1);
    } else {
      x.set(withSpring(index * segment, spring.soft));
    }
  }, [index, placed, segment, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View accessibilityRole="tablist" onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.track}>
      {segment > 0 ? <Animated.View pointerEvents="none" style={[styles.pill, { width: segment }, pill]} /> : null}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.key}
            onPress={() => {
              if (!selected) haptic.select();
              onChange(option.key);
            }}
            style={styles.tab}
          >
            <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
              {option.count !== undefined ? ` ${option.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PADDING = 4;

const styles = StyleSheet.create({
  label: { color: color.textSecondary, fontSize: 13, fontWeight: "600" },
  labelSelected: { color: color.onPrimary },
  pill: {
    backgroundColor: color.primary,
    borderRadius: corner.pill,
    bottom: PADDING,
    left: PADDING,
    position: "absolute",
    top: PADDING,
  },
  tab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 40 },
  track: {
    backgroundColor: color.surfaceSoft,
    borderRadius: corner.pill,
    flexDirection: "row",
    marginVertical: space.xs,
    padding: PADDING,
  },
});
