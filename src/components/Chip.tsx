import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { color, corner, space } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

export function Chip({
  count,
  icon,
  label,
  onPress,
  selected = false,
  size = "md",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
  size?: "sm" | "md";
}) {
  const fg = selected ? color.onPrimary : color.heading;
  return (
    <Pressable
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        size === "sm" ? styles.small : styles.medium,
        { backgroundColor: selected ? color.accent : color.surfaceSoft },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text style={[styles.label, { color: fg, fontWeight: selected ? "600" : "500" }]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: selected ? color.onPrimary : color.surface }]}>
          <Text style={[styles.countText, { color: selected ? color.accent : color.heading }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export type FilterOption<T extends string> = {
  key: T;
  label: string;
  icon?: IconName;
  count?: number;
};

/** Horizontally scrolling single-select row of chips. */
export function FilterChips<T extends string>({
  onChange,
  options,
  testID,
  value,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
  testID?: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      testID={testID}
    >
      {options.map((option) => (
        <Chip
          count={option.count}
          icon={option.icon}
          key={option.key}
          label={option.label}
          onPress={() => onChange(option.key)}
          selected={option.key === value}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: 6,
  },
  count: {
    alignItems: "center",
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
  },
  countText: { fontSize: 11, fontWeight: "700" },
  label: { fontSize: 13 },
  medium: { minHeight: 34, paddingHorizontal: space.sm },
  pressed: { opacity: 0.7 },
  row: { gap: space.xs, paddingVertical: space.xxs },
  scroller: { flexGrow: 0, marginHorizontal: -20, paddingHorizontal: 20 },
  small: { minHeight: 28, paddingHorizontal: 10 },
});
