import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, corner, space } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

/** Account-style row: icon circle, label, optional value, chevron or custom right side. */
export function MenuRow({
  danger = false,
  hint,
  icon,
  label,
  onPress,
  right,
  testID,
  value,
}: {
  label: string;
  icon?: IconName;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  hint?: string;
  testID?: string;
}) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconCircle, danger && styles.dangerCircle]}>
          <Icon name={icon} size={17} color={danger ? color.danger : color.heading} />
        </View>
      ) : null}
      <Text numberOfLines={1} style={[styles.label, danger && styles.dangerLabel]}>
        {label}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color={color.textSecondary} /> : null)}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dangerCircle: { backgroundColor: color.dangerSoft },
  dangerLabel: { color: color.danger },
  iconCircle: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  label: { color: color.text, flex: 1, fontSize: 15, fontWeight: "500" },
  pressed: { backgroundColor: color.backgroundMuted },
  row: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.border,
    borderCurve: "continuous",
    borderRadius: corner.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  value: { color: color.textSecondary, flexShrink: 1, fontSize: 14 },
});
