import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { color, corner, size, space, text } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "accent" | "soft" | "outline" | "danger" | "light";

const variants: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: color.primary, pressed: color.primaryPressed, fg: color.onPrimary },
  accent: { bg: color.accent, pressed: color.accentPressed, fg: color.onPrimary },
  soft: { bg: color.surfaceSoft, pressed: "#CFDDE6", fg: color.heading },
  outline: { bg: "transparent", pressed: color.surfaceIcon, fg: color.heading, border: color.borderStrong },
  danger: { bg: color.danger, pressed: "#97433A", fg: color.onPrimary },
  light: { bg: color.surface, pressed: color.surfaceIcon, fg: color.heading },
};

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  shape?: "pill" | "rounded";
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  accessibilityHint,
  disabled = false,
  fullWidth = false,
  icon,
  iconRight,
  label,
  loading = false,
  onPress,
  shape = "pill",
  size: buttonSize = "md",
  style,
  testID,
  variant = "primary",
}: ButtonProps) {
  const tone = variants[variant];
  const height = buttonSize === "lg" ? size.controlLarge : buttonSize === "sm" ? 38 : size.control;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={buttonSize === "sm" ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? tone.pressed : tone.bg,
          borderColor: tone.border ?? "transparent",
          borderRadius: shape === "pill" ? corner.pill : corner.sm,
          minHeight: height,
          opacity: inactive && !loading ? 0.5 : 1,
          paddingHorizontal: buttonSize === "sm" ? space.sm : space.lg,
        },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={buttonSize === "sm" ? 15 : 18} color={tone.fg} /> : null}
          <Text
            numberOfLines={1}
            style={[text.button, { color: tone.fg, fontSize: buttonSize === "sm" ? 13 : 16 }]}
          >
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={18} color={tone.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderCurve: "continuous",
    borderWidth: 1,
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { transform: [{ scale: 0.985 }] },
  row: { alignItems: "center", flexDirection: "row", gap: space.xs },
});
