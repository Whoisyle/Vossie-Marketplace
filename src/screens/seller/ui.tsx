import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { Backdrop, Icon, Screen, Wordmark, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

/**
 * The look of seller mode (owner designs, 2026-10-20): a full-screen gradient from a soft grey-teal at the top to a
 * deep teal at the bottom, with light cards on it. The colours come from the Vossie slate and mist.
 */
export const SELLER = {
  bgBottom: "#3A5D69",
  bgMid: "#587F8D",
  bgTop: "#80A0A9",
  card: "rgba(243,247,248,0.96)",
  cardMuted: "#DDE6E9",
  ink: "#1E2B33",
  inkSoft: "#5F6E76",
  solid: "#38606F",
  solidPressed: "#2C4E5B",
  white: "#FFFFFF",
} as const;

/** The gradient, a dotted texture and slowly drifting contour lines in white. Sits behind every seller screen. */
export function SellerBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[SELLER.bgTop, SELLER.bgMid, SELLER.bgBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <Pattern height={16} id="sellerDots" patternUnits="userSpaceOnUse" width={16}>
            <Circle cx={2} cy={2} fill="rgba(255,255,255,0.16)" r={1} />
          </Pattern>
        </Defs>
        <Rect fill="url(#sellerDots)" height="100%" width="100%" />
      </Svg>
      <Backdrop tone="teal" />
    </View>
  );
}

/** A seller page: the gradient behind a normal scrolling screen. `tabs` leaves room for the bottom bar. */
export function SellerScreen({
  children,
  footer,
  scroll = true,
  tabs = true,
  testID,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  /** False on the setup pages, which have no tab bar. */
  tabs?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.page}>
      <SellerBackground />
      <Screen background="transparent" backdrop="none" footer={footer} inTabs={tabs} scroll={scroll} testID={testID}>
        {children}
      </Screen>
    </View>
  );
}

/** The wordmark with the "Seller mode" pill, and an optional control on the right, such as the bell. */
export function SellerHeader({ right }: { right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Wordmark tone="white" width={116} />
        <View style={styles.modePill}>
          <Text style={styles.modePillText}>Seller mode</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

/** A title row for detail pages: a back arrow, the title, and a control on the right. */
export function SellerTopBar({ onBack, right, title }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={onBack ?? (() => router.back())} style={styles.backButton}>
        <Icon color="#FFFFFF" name="arrow-left" size={22} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.topTitle}>
        {title}
      </Text>
      <View style={styles.topRight}>{right}</View>
    </View>
  );
}

/** A round icon button for the header, with an optional count. */
export function SellerIconButton({ badge, icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; badge?: number; testID?: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.iconButton} testID={testID}>
      <Icon color="#FFFFFF" name={icon} size={20} />
      {badge ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function SellerHeading({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Text accessibilityRole="header" style={[styles.heading, style as never]}>
      {children}
    </Text>
  );
}

/** A light card on the gradient. Pressable when `onPress` is given. */
export function SellerCard({ children, onPress, style, testID }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; testID?: string }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]} testID={testID}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

type ButtonVariant = "solid" | "glass" | "outline" | "light" | "dark";

/** The seller buttons: dark and solid to confirm, glass on the gradient, outline to decline. They give under the finger and tick. */
export function SellerButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
  size = "md",
  style,
  testID,
  variant = "solid",
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const press = useSharedValue(0);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.04 }] }));
  const look = BUTTONS[variant];
  return (
    <Animated.View style={[size === "lg" && styles.fullWidth, scale, style]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled }}
        disabled={disabled || loading}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        onPressIn={() => press.set(withTiming(1, { duration: 70 }))}
        onPressOut={() => press.set(withSpring(0, spring.snappy))}
        style={[styles.button, size === "lg" && styles.buttonLg, size === "sm" && styles.buttonSm, look.box, disabled && styles.buttonDisabled]}
        testID={testID}
      >
        {loading ? <ActivityIndicator color={look.text} size="small" /> : null}
        {!loading && icon ? <Icon color={look.text} name={icon} size={size === "sm" ? 14 : 18} /> : null}
        <Text style={[styles.buttonText, size === "sm" && styles.buttonTextSm, { color: look.text }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const BUTTONS: Record<ButtonVariant, { box: ViewStyle; text: string }> = {
  dark: { box: { backgroundColor: "#14232C" }, text: "#FFFFFF" },
  glass: { box: { backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.32)", borderWidth: 1 }, text: "#FFFFFF" },
  light: { box: { backgroundColor: "#FFFFFF" }, text: SELLER.solid },
  outline: { box: { backgroundColor: "transparent", borderColor: SELLER.solid, borderWidth: 1.5 }, text: SELLER.solid },
  solid: { box: { backgroundColor: SELLER.solid }, text: "#FFFFFF" },
};

export type PillTone = "info" | "warn" | "success" | "danger" | "neutral";

const PILLS: Record<PillTone, { bg: string; fg: string }> = {
  danger: { bg: "#F8DCD8", fg: "#B4544A" },
  info: { bg: "#DCE9F7", fg: "#2C5C94" },
  neutral: { bg: "#E4EAED", fg: "#4B5B64" },
  success: { bg: "#DDF2E5", fg: "#2F8A57" },
  warn: { bg: "#FCE9D0", fg: "#B0680F" },
};

/** A small status label. When its words change it flips over, so a document going from In review to Verified is seen. */
export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState({ label, tone });
  const flip = useSharedValue(0);
  useEffect(() => {
    if (reduced || (shown.label === label && shown.tone === tone)) return;
    flip.set(withTiming(1, { duration: 130 }));
    const timer = setTimeout(() => {
      setShown({ label, tone });
      flip.set(withSpring(0, spring.bouncy));
    }, 130);
    return () => clearTimeout(timer);
  }, [flip, label, reduced, shown.label, shown.tone, tone]);
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 400 }, { rotateX: `${flip.get() * 90}deg` }] }));
  const current = reduced ? { label, tone } : shown;
  const look = PILLS[current.tone];
  return (
    <Animated.View style={[styles.pill, { backgroundColor: look.bg }, style]}>
      <Text style={[styles.pillText, { color: look.fg }]}>{current.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  button: { alignItems: "center", borderCurve: "continuous", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.45 },
  buttonLg: { borderRadius: 28, minHeight: 56 },
  buttonSm: { minHeight: 36, paddingHorizontal: 14 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  buttonTextSm: { fontSize: 13 },
  card: { backgroundColor: SELLER.card, borderCurve: "continuous", borderRadius: 24, boxShadow: "0 8px 22px rgba(18, 36, 44, 0.18)", padding: 16 },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  fullWidth: { alignSelf: "stretch" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 6 },
  heading: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginBottom: 10, marginTop: 20 },
  iconBadge: { alignItems: "center", backgroundColor: "#FFE14A", borderRadius: 9, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 4, position: "absolute", right: -2, top: -2 },
  iconBadgeText: { color: "#1E2B33", fontSize: 10, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  modePill: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  modePillText: { color: SELLER.ink, fontSize: 10, fontWeight: "800" },
  page: { backgroundColor: SELLER.bgBottom, flex: 1 },
  pill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },
  topBar: { alignItems: "center", flexDirection: "row", gap: 6, paddingTop: 6 },
  topRight: { alignItems: "flex-end", minWidth: 40 },
  topTitle: { color: "#FFFFFF", flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
});
