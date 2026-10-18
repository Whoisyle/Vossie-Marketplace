import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, space } from "@/theme/tokens";

/** Single-choice row used for payment methods and pickers. */
export function RadioRow({
  left,
  onPress,
  selected,
  subtitle,
  testID,
  title,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  left?: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      {left}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  radio: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.borderStrong,
    borderWidth: 2,
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  radioDot: { backgroundColor: color.primary, borderRadius: 5, height: 10, width: 10 },
  radioSelected: { backgroundColor: color.surface, borderColor: color.primary, borderWidth: 2 },
  row: { alignItems: "center", flexDirection: "row", gap: space.md, minHeight: 52, paddingVertical: space.xs },
  subtitle: { color: color.textMuted, fontSize: 11, marginTop: 2 },
  text: { flex: 1 },
  title: { color: color.text, fontSize: 15, fontWeight: "600" },
});
