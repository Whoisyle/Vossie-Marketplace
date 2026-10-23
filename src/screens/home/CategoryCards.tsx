import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { color, corner, space } from "@/theme/tokens";

export type CategoryCardItem<T extends string> = { key: T; label: string; icon: IconName };

/**
 * Two columns of category cards: a white icon tile, the name and a chevron. The chosen category is tinted;
 * tapping it again clears it.
 */
export function CategoryCards<T extends string>({
  items,
  onSelect,
  value,
}: {
  items: CategoryCardItem<T>[];
  value: T;
  onSelect: (key: T) => void;
}) {
  return (
    <View style={styles.grid} testID="category-cards">
      {items.map((item, index) => {
        const selected = item.key === value;
        return (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} key={item.key} style={styles.cell}>
            <Pressable
              accessibilityLabel={`${item.label} category`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.select();
                onSelect(item.key);
              }}
              style={({ pressed }) => [styles.card, selected && styles.cardOn, pressed && styles.pressed]}
              testID={`category-${item.key}`}
            >
              <View style={styles.tile}>
                <Icon color={color.accent} name={item.icon} size={22} />
              </View>
              <Text numberOfLines={1} style={[styles.label, selected && styles.labelOn]}>
                {item.label}
              </Text>
              <Icon color={selected ? color.onPrimary : color.heading} name="chevron-right" size={16} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: color.surfaceRow,
    borderColor: "transparent",
    borderCurve: "continuous",
    borderRadius: corner.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: space.xs,
    padding: 8,
  },
  cardOn: { backgroundColor: color.accent },
  cell: { width: "48.5%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, justifyContent: "space-between" },
  label: { color: color.text, flex: 1, fontSize: 14.5, fontWeight: "700" },
  labelOn: { color: color.onPrimary },
  pressed: { opacity: 0.8 },
  tile: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
});
