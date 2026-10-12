import type { TextStyle } from "react-native";
import { Platform } from "react-native";
import { Color } from "expo-router";

export const colors = {
  brandCream: "#F4EBDD",
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: "#132016",
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: "#526058",
  })!,
  background: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: "#F6F8F4",
  })!,
  surface: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: "#FFFFFF",
  })!,
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: "#D8DED9",
  })!,
  accent: Platform.select({
    ios: Color.ios.systemGreen,
    android: Color.android.dynamic.primary,
    default: "#1F6B45",
  })!,
  success: "#16834B",
  onAccent: "#FFFFFF",
} as const;

/**
 * Vossie brand tokens. Keep screen-level styling on these values so the
 * native app stays consistent with the supplied wordmark and palette board.
 */
export const brand = {
  navy: "#29475B",
  teal: "#567C8D",
  sky: "#C8D9E6",
  cream: "#F5EFE6",
  white: "#FFFFFF",
  sage: "#98AA9D",
  ink: "#2D3536",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const motion = {
  splashHold: 4800,
} as const;

export const type = {
  title: { fontSize: 22, fontWeight: "700", color: colors.label },
  headline: { fontSize: 17, fontWeight: "600", color: colors.label },
  body: { fontSize: 17, fontWeight: "400", color: colors.label },
  subhead: { fontSize: 15, fontWeight: "400", color: colors.secondaryLabel },
  caption: { fontSize: 12, fontWeight: "500", color: colors.secondaryLabel },
} as const satisfies Record<string, TextStyle>;
