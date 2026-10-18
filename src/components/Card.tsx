import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { color, corner, shadow, space, text } from "@/theme/tokens";

type CardVariant = "default" | "soft" | "peach" | "row" | "primary";

const backgrounds: Record<CardVariant, string> = {
  default: color.surface,
  soft: color.surfaceSoft,
  peach: color.surfacePeach,
  row: color.surfaceRow,
  primary: color.primary,
};

export function Card({
  accessibilityLabel,
  children,
  onPress,
  padded = true,
  style,
  testID,
  variant = "default",
}: {
  children: ReactNode;
  variant?: CardVariant;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const cardStyle = [
    styles.card,
    { backgroundColor: backgrounds[variant] },
    variant === "default" && styles.outlined,
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

export function SectionHeader({
  actionLabel = "View all",
  onAction,
  title,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={text.sectionTitle}>
        {title}
      </Text>
      {onAction ? (
        <Pressable
          accessibilityLabel={`${actionLabel}, ${title}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onAction}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.action}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { color: color.textSecondary, fontSize: 13 },
  card: {
    borderCurve: "continuous",
    borderRadius: corner.md,
  },
  outlined: {
    borderColor: color.border,
    borderWidth: 1,
    ...shadow.card,
  },
  padded: { padding: space.md },
  pressed: { opacity: 0.75 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: space.sm,
    marginTop: space.xl,
  },
});
