import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, type TextProps, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { Backdrop, Icon, Screen, Wordmark, type IconName } from "@/components";
import { setBarTone } from "@/components/nav/barTone";
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

/**
 * Seller pages come in two tones (owner choice, 2026-10-20): blue pages for the numbers (Home, Payouts, Analytics, Reviews)
 * and white pages for the work (Products, Orders, forms, settings). Both are soft and raised ("neumorphic"): cards stand
 * out of the page with a light shadow on one side and a dark one on the other, and inputs are pressed in.
 */
export type Tone = "blue" | "white";

export type ToneLook = {
  /** Text sitting straight on the page. */
  page: string;
  pageSoft: string;
  pageBg: string;
  card: string;
  raised: string;
  pressed: string;
  chip: string;
  chipOn: string;
  chipText: string;
  chipTextOn: string;
  wordmark: "brand" | "white";
  well: string;
};

export const TONES: Record<Tone, ToneLook> = {
  blue: {
    card: "#EEF3F6",
    chip: "rgba(255,255,255,0.14)",
    chipOn: "#FFFFFF",
    chipText: "#FFFFFF",
    chipTextOn: SELLER.solid,
    page: "#FFFFFF",
    pageBg: SELLER.bgBottom,
    pageSoft: "rgba(255,255,255,0.85)",
    pressed: "inset 3px 3px 7px rgba(10, 26, 34, 0.38), inset -3px -3px 7px rgba(255, 255, 255, 0.16)",
    raised: "-5px -5px 12px rgba(255, 255, 255, 0.16), 8px 8px 18px rgba(10, 26, 34, 0.42)",
    well: "#DCE6EA",
    wordmark: "white",
  },
  white: {
    card: "#E9EFF3",
    chip: "#E9EFF3",
    chipOn: SELLER.solid,
    chipText: SELLER.inkSoft,
    chipTextOn: "#FFFFFF",
    page: SELLER.ink,
    pageBg: "#E9EFF3",
    pageSoft: SELLER.inkSoft,
    pressed: "inset 3px 3px 7px rgba(150, 166, 180, 0.55), inset -3px -3px 7px rgba(255, 255, 255, 0.95)",
    raised: "-6px -6px 14px rgba(255, 255, 255, 0.95), 7px 7px 16px rgba(150, 166, 180, 0.5)",
    well: "#E0E8ED",
    wordmark: "brand",
  },
};

const ToneContext = createContext<Tone>("blue");

/** The tone of the seller page this component is on. */
export function useTone(): ToneLook & { tone: Tone } {
  const tone = useContext(ToneContext);
  return { ...TONES[tone], tone };
}

/**
 * Text for seller pages. Text written in white for a blue page turns dark on a white page, so each screen is written
 * once and both tones work.
 */
export function Text({ style, ...rest }: TextProps) {
  const { page, pageSoft } = useTone();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const colour = flat?.color;
  const swapped = colour === "#FFFFFF" ? page : typeof colour === "string" && colour.startsWith("rgba(255,255,255") ? pageSoft : undefined;
  return <RNText {...rest} style={swapped ? [style, { color: swapped }] : style} />;
}

/** A pressed-in area: where something is typed or chosen. */
export function SellerWell({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const look = useTone();
  return (
    <View style={[styles.well, { backgroundColor: look.well, boxShadow: look.pressed }, style]} testID={testID}>
      {children}
    </View>
  );
}

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
  tone = "blue",
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  /** False on the setup pages, which have no tab bar. */
  tabs?: boolean;
  testID?: string;
  /** Blue for the numbers pages, white for the pages where work is done. */
  tone?: Tone;
}) {
  // the tab bar takes the opposite colour to the page: dark on white pages, light on blue ones
  useFocusEffect(
    useCallback(() => {
      setBarTone(tone === "white" ? "dark" : "light");
    }, [tone]),
  );
  return (
    <ToneContext.Provider value={tone}>
      <View style={[styles.page, { backgroundColor: TONES[tone].pageBg }]}>
        {tone === "blue" ? <SellerBackground /> : <Backdrop tone="mist" />}
        <Screen background="transparent" backdrop="none" footer={footer} inTabs={tabs} scroll={scroll} testID={testID}>
          {children}
        </Screen>
      </View>
    </ToneContext.Provider>
  );
}

/** The wordmark with the "Seller mode" pill, and an optional control on the right, such as the bell. */
export function SellerHeader({ right }: { right?: ReactNode }) {
  const look = useTone();
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Wordmark tone={look.wordmark} width={116} />
        <View style={[styles.modePill, look.tone === "white" && { backgroundColor: SELLER.solid }]}>
          <RNText style={[styles.modePillText, look.tone === "white" && { color: "#FFFFFF" }]}>Seller mode</RNText>
        </View>
      </View>
      {right}
    </View>
  );
}

/** A title row for detail pages: a back arrow, the title, and a control on the right. */
export function SellerTopBar({ onBack, right, title }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const router = useRouter();
  const look = useTone();
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={onBack ?? (() => router.back())} style={[styles.backButton, { backgroundColor: look.card, boxShadow: look.raised }]}>
        <Icon color={SELLER.solid} name="arrow-left" size={20} />
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
  const look = useTone();
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.iconButton, { backgroundColor: look.card, boxShadow: look.raised }]} testID={testID}>
      <Icon color={SELLER.solid} name={icon} size={20} />
      {badge ? (
        <View style={styles.iconBadge}>
          <RNText style={styles.iconBadgeText}>{badge > 9 ? "9+" : badge}</RNText>
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
  const look = useTone();
  const raised: ViewStyle = { backgroundColor: look.card, boxShadow: look.raised };
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, raised, style, pressed && { boxShadow: look.pressed, transform: [{ scale: 0.99 }] }]} testID={testID}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, raised, style]} testID={testID}>
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
  const tone = useTone();
  const look = buttonLook(variant, tone);
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
        <RNText style={[styles.buttonText, size === "sm" && styles.buttonTextSm, { color: look.text }]}>{label}</RNText>
      </Pressable>
    </Animated.View>
  );
}

/** On a white page the glass button becomes a solid one and the light one a raised one, so nothing disappears. */
function buttonLook(variant: ButtonVariant, tone: ToneLook & { tone: Tone }): { box: ViewStyle; text: string } {
  if (tone.tone === "white") {
    if (variant === "glass" || variant === "solid") return { box: { backgroundColor: SELLER.solid, boxShadow: tone.raised }, text: "#FFFFFF" };
    if (variant === "light" || variant === "outline") return { box: { backgroundColor: tone.card, boxShadow: tone.raised }, text: SELLER.solid };
    return { box: { backgroundColor: "#14232C", boxShadow: tone.raised }, text: "#FFFFFF" };
  }
  const base = BUTTONS[variant];
  return variant === "solid" || variant === "light" || variant === "dark" ? { box: { ...base.box, boxShadow: tone.raised }, text: base.text } : base;
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
      <RNText style={[styles.pillText, { color: look.fg }]}>{current.label}</RNText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  button: { alignItems: "center", borderCurve: "continuous", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.45 },
  buttonLg: { borderRadius: 28, minHeight: 56 },
  buttonSm: { minHeight: 36, paddingHorizontal: 14 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  buttonTextSm: { fontSize: 13 },
  card: { borderCurve: "continuous", borderRadius: 24, padding: 16 },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  fullWidth: { alignSelf: "stretch" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 6 },
  heading: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginBottom: 10, marginTop: 20 },
  iconBadge: { alignItems: "center", backgroundColor: "#FFE14A", borderRadius: 9, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 4, position: "absolute", right: -2, top: -2 },
  iconBadgeText: { color: "#1E2B33", fontSize: 10, fontWeight: "900" },
  iconButton: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  modePill: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  modePillText: { color: SELLER.ink, fontSize: 10, fontWeight: "800" },
  page: { backgroundColor: SELLER.bgBottom, flex: 1 },
  pill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },
  well: { borderCurve: "continuous", borderRadius: 16 },
  topBar: { alignItems: "center", flexDirection: "row", gap: 6, paddingTop: 6 },
  topRight: { alignItems: "flex-end", minWidth: 40 },
  topTitle: { color: "#FFFFFF", flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
});
