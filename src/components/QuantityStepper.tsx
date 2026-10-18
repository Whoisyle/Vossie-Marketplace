import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, corner } from "@/theme/tokens";

import { Icon } from "./Icon";

export function QuantityStepper({
  max = 20,
  min = 1,
  onChange,
  value,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        accessibilityRole="button"
        accessibilityState={{ disabled: value <= min }}
        disabled={value <= min}
        hitSlop={6}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [styles.button, (pressed || value <= min) && styles.dim]}
      >
        <Icon name="minus" size={14} color={color.heading} />
      </Pressable>
      <Text accessibilityLabel={`Quantity ${value}`} accessibilityLiveRegion="polite" style={styles.value}>
        {value}
      </Text>
      <Pressable
        accessibilityLabel="Increase quantity"
        accessibilityRole="button"
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        hitSlop={6}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.button, (pressed || value >= max) && styles.dim]}
      >
        <Icon name="plus" size={14} color={color.heading} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  dim: { opacity: 0.5 },
  stepper: {
    alignItems: "center",
    backgroundColor: color.surfaceSoft,
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: 18,
    height: 44,
    paddingHorizontal: 8,
  },
  value: { color: color.text, fontSize: 16, fontWeight: "700", minWidth: 16, textAlign: "center" },
});
