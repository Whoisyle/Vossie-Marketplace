import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text as RNText, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components";
import { useTabChrome } from "@/components/nav/TabChrome";
import { haptic } from "@/lib/haptics";
import { Chips as SellerChips, PageTitle, SettingRow, StatTile } from "@/screens/seller/parts";
import { Pill as SellerPill, SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerIconButton, SellerScreen, SellerTopBar, SellerWell, Text, useTone, type PillTone as SellerPillTone } from "@/screens/seller/ui";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";

/**
 * The courier app is the seller app with a courier's content: the same pages (blue for the numbers, white for the work), the same
 * soft raised and pressed-in cards, the same header, buttons, chips, rows and floating bar. Nothing here is see-through.
 */
export const COURIER = {
  amber: "#B0680F",
  amberSoft: "#FCE9D0",
  blue: "#2C5C94",
  blueSoft: "#DCE9F7",
  border: "#D9E3E7",
  card: "#E9EFF3",
  frame: "#3A5D69",
  green: "#2F8A57",
  greenSoft: "#DDF2E5",
  ink: SELLER.ink,
  inkSoft: SELLER.inkSoft,
  muted: "#8A9AA2",
  red: "#B4544A",
  redSoft: "#F8DCD8",
  solid: SELLER.solid,
  solidPressed: SELLER.solidPressed,
  white: "#FFFFFF",
} as const;

export const type = StyleSheet.create({
  body: { color: COURIER.ink, fontSize: 14, lineHeight: 20 },
  caption: { color: COURIER.inkSoft, fontSize: 12 },
  card: { color: COURIER.ink, fontSize: 15, fontWeight: "700" },
  label: { color: COURIER.inkSoft, fontSize: 13 },
  section: { color: COURIER.ink, fontSize: 17, fontWeight: "800" },
  title: { color: COURIER.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.4, lineHeight: 32 },
});

/** The raised look of the page the component is on: use it for anything that should stand out of the page. */
export function useRaised() {
  const look = useTone();
  return { backgroundColor: look.card, boxShadow: look.raised } as const;
}

/** Hide the tab bar while this screen is showing (a request, the pickup, a failed delivery), and bring it back on leaving. */
export function useHideTabBar(hide: boolean) {
  const chrome = useTabChrome();
  useFocusEffect(
    useCallback(() => {
      chrome?.lock(hide);
      return () => chrome?.lock(false);
    }, [chrome, hide]),
  );
}

/** Small text sitting straight on the page: white on a blue page, grey on a white one. */
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

/**
 * One courier page, built on the seller's page: the gradient or the soft white behind a normal scrolling screen, the header with the
 * mark and the Courier mode pill (or a back arrow and a centred title on a detail page), and the title. `tone` is blue for the numbers
 * pages (Home, Earnings, Wallet, Performance) and white for the pages where work is done.
 */
export function CourierPage({
  back,
  bar = true,
  children,
  footer,
  onBack,
  right,
  scroll = true,
  subtitle,
  testID,
  title,
  tone = "white",
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  scroll?: boolean;
  testID?: string;
  children: ReactNode;
  /** True when the tab bar floats over the bottom of this page. */
  bar?: boolean;
  /** Pinned to the bottom: the main button of the page. */
  footer?: ReactNode;
  tone?: "blue" | "white";
}) {
  const router = useRouter();
  const { state } = useDemoStore();
  const unread = state.courier.alerts.filter((alert) => !alert.read).length;
  const bell = <SellerIconButton badge={unread} icon="bell" label={unread ? "Notifications, unread" : "Notifications"} onPress={() => router.push("/courier/home/notifications" as Href)} testID="courier-bell" />;
  return (
    <SellerScreen footer={footer} scroll={scroll} tabs={bar} testID={testID} tone={tone}>
      {back ? <SellerTopBar onBack={onBack} right={right} title={title} /> : <SellerHeader mode="Courier mode" right={bell} />}
      {back ? subtitle ? <Muted style={styles.sub}>{subtitle}</Muted> : null : <PageTitle right={right} subtitle={subtitle} title={title} />}
      {children}
    </SellerScreen>
  );
}

/** Fades a block in, a little later for each one that follows. Plain with Reduce Motion. */
export function Rise({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(Math.min(index, 8) * 60).duration(360)} style={style}>
      {children}
    </Animated.View>
  );
}

/** A section title, in the seller's heading. */
export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SellerHeading style={style}>{children}</SellerHeading>;
}

const HERO_COLOURS = ["#4C7888", "#2D5260"] as const;

type CardTone = "plain" | "soft" | "dark" | "warn" | "selected";

/** A card. Plain is the seller's raised card; soft is pressed in; dark is the dark teal card for the big number; warn is amber; selected has a teal edge. */
export function Card({ children, onPress, style, tone = "plain", testID }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; tone?: CardTone; testID?: string }) {
  const look = useTone();
  if (tone === "soft") {
    return (
      <SellerWell style={[styles.well, style]} testID={testID}>
        {children}
      </SellerWell>
    );
  }
  if (tone === "dark") {
    const dark = (
      <>
        <LinearGradient colors={HERO_COLOURS} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <HeroDecor />
        {children}
      </>
    );
    if (!onPress) {
      return (
        <View style={[styles.dark, { boxShadow: look.raised }, style]} testID={testID}>
          {dark}
        </View>
      );
    }
    return (
      <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.dark, { boxShadow: pressed ? look.pressed : look.raised }, style]} testID={testID}>
        {dark}
      </Pressable>
    );
  }
  const extra: ViewStyle = tone === "warn" ? { backgroundColor: COURIER.amberSoft } : tone === "selected" ? { borderColor: COURIER.solid, borderWidth: 2 } : {};
  return (
    <SellerCard onPress={onPress ? () => { haptic.tap(); onPress(); } : undefined} style={[extra, style]} testID={testID}>
      {children}
    </SellerCard>
  );
}

/** Soft rings in the corner of a dark card, so it is not a flat block. Solid colours only. */
export function HeroDecor() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.decor]}>
      <Svg height="100%" width="100%">
        <Circle cx="100%" cy="0" fill="#517C8B" r={86} />
        <Circle cx="100%" cy="0" fill="none" r={120} stroke="#5C8695" strokeWidth={1} />
        <Circle cx="100%" cy="0" fill="none" r={158} stroke="#4F7A89" strokeWidth={1} />
        <Circle cx={18} cy="108%" fill="#43707E" r={64} />
      </Svg>
    </View>
  );
}

export type PillTone = "green" | "amber" | "red" | "blue" | "grey";

const PILL: Record<PillTone, SellerPillTone> = { amber: "warn", blue: "info", green: "success", grey: "neutral", red: "danger" };

export function Pill({ label, tone = "grey", style, testID }: { label: string; tone?: PillTone; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.pillBox, style]} testID={testID}>
      <SellerPill label={label} tone={PILL[tone]} />
    </View>
  );
}

/** A row of equal-width filter chips, the seller's. */
export function Chips<T extends string>({ chips, onChange, value }: { chips: { key: T; label: string; count?: number }[]; value: T; onChange: (key: T) => void; testID?: string }) {
  return <SellerChips items={chips} onChange={onChange} prefix="chip" value={value} />;
}

/** A button: solid to confirm, outline for the other choice, light on a blue page, danger in red. It gives under the finger and ticks. */
export function Button({ disabled, icon, label, onPress, size = "lg", tone = "solid", testID }: { label: string; onPress: () => void; tone?: "solid" | "outline" | "danger" | "light"; icon?: IconName; disabled?: boolean; testID?: string; size?: "sm" | "md" | "lg" }) {
  if (tone === "danger") {
    return (
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={() => { haptic.tap(); onPress(); }} style={[styles.danger, disabled && styles.disabled]} testID={testID}>
        {icon ? <Icon color="#FFFFFF" name={icon} size={18} /> : null}
        <RNText style={styles.dangerText}>{label}</RNText>
      </Pressable>
    );
  }
  return <SellerButton disabled={disabled} icon={icon} label={label} onPress={onPress} size={size} testID={testID} variant={tone === "outline" ? "outline" : tone === "light" ? "light" : "solid"} />;
}

/** A small round button, for call, chat and filters. */
export function RoundButton({ icon, label, onPress, dark = false, testID }: { icon: IconName; label: string; onPress: () => void; dark?: boolean; testID?: string }) {
  const look = useTone();
  if (!dark) return <SellerIconButton icon={icon} label={label} onPress={() => { haptic.tap(); onPress(); }} testID={testID} />;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={6} onPress={() => { haptic.tap(); onPress(); }} style={[styles.round, { backgroundColor: SELLER.solid, boxShadow: look.raised }]} testID={testID}>
      <Icon color="#FFFFFF" name={icon} size={18} />
    </Pressable>
  );
}

/** A number with a small label above it, in a raised tile: Today, Done, Rating. */
export function Stat({ label, value, testID }: { label: string; value: string; icon?: IconName; testID?: string }) {
  return <StatTile label={label} testID={testID} value={value} />;
}

/** Pickup above, drop-off below, joined by a line: the two ends of a delivery. */
export function RouteLine({ dropoff, pickup }: { pickup: { title: string; sub: string }; dropoff: { title: string; sub: string } }) {
  return (
    <View style={styles.routeRow}>
      <View style={styles.routeRail}>
        <View style={styles.routeFrom} />
        <View style={styles.routeLine} />
        <View style={styles.routeTo} />
      </View>
      <View style={styles.flex}>
        <View style={styles.routeStop}>
          <RNText style={type.card}>{pickup.title}</RNText>
          <RNText style={type.caption}>{pickup.sub}</RNText>
        </View>
        <View style={styles.routeStop}>
          <RNText style={type.card}>{dropoff.title}</RNText>
          <RNText style={type.caption}>{dropoff.sub}</RNText>
        </View>
      </View>
    </View>
  );
}

/** A row of a facts table: label on the left, value on the right. */
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <RNText style={type.label}>{label}</RNText>
      <RNText style={styles.factValue}>{value}</RNText>
    </View>
  );
}

/** A switch that slides. */
export function Toggle({ label, on, onChange, onDark = false, testID }: { on: boolean; onChange: (on: boolean) => void; label: string; testID?: string; /** On a dark card: a light track with a dark knob. */ onDark?: boolean }) {
  const x = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    x.set(withSpring(on ? 1 : 0, spring.snappy));
  }, [on, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * 22 }] }));
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={8} onPress={() => { haptic.tap(); onChange(!on); }} style={[styles.toggle, on && styles.toggleOn, onDark && styles.toggleDark]} testID={testID}>
      <Animated.View style={[styles.knob, onDark && styles.knobDark, knob]} />
    </Pressable>
  );
}

/** A row in a list: an icon tile, the words, and a chevron or a switch, the seller's setting row. Danger is red, for logging out. */
export function MenuRow({ detail, icon, label, onPress, onToggle, testID, toggle, tone }: { icon: IconName; label: string; detail?: string; onPress?: () => void; testID?: string; tone?: "danger"; toggle?: boolean; onToggle?: (value: boolean) => void }) {
  if (tone === "danger") {
    return (
      <SellerCard onPress={onPress} style={styles.dangerRow} testID={testID}>
        <View style={[styles.dangerIcon]}>
          <Icon color={COURIER.red} name={icon} size={20} />
        </View>
        <RNText style={[type.card, { color: COURIER.red }]}>{label}</RNText>
      </SellerCard>
    );
  }
  return (
    <View style={styles.menuGap}>
      <SettingRow hint={detail} icon={icon} label={label} onPress={onPress} onToggle={onToggle} testID={testID} toggle={toggle} />
    </View>
  );
}

export function Empty({ detail, icon, title }: { icon: IconName; title: string; detail: string }) {
  return (
    <SellerCard style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon color={COURIER.solid} name={icon} size={24} />
      </View>
      <RNText style={type.card}>{title}</RNText>
      <RNText style={[type.caption, styles.center]}>{detail}</RNText>
    </SellerCard>
  );
}

function useRing(value: SharedValue<number>, active: boolean) {
  return useAnimatedStyle(() => ({ opacity: active ? (1 - value.get()) * 0.55 : 0, transform: [{ scale: 0.5 + value.get() * 1.1 }] }));
}

/** Rings that grow and fade out from a dot while the courier is online, like a radar looking for jobs. Still when offline or with Reduce Motion. */
export function Radar({ active, size = 46 }: { active: boolean; size?: number }) {
  const reduced = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (!active || reduced) {
      a.set(0);
      b.set(0);
      return;
    }
    a.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1));
    b.set(withRepeat(withSequence(withTiming(0, { duration: 1100 }), withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) })), -1));
  }, [a, active, b, reduced]);
  const one = useRing(a, active);
  const two = useRing(b, active);
  return (
    <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }} testID="radar">
      <Animated.View style={[styles.ring, { borderRadius: size / 2, height: size, width: size }, one]} />
      <Animated.View style={[styles.ring, { borderRadius: size / 2, height: size, width: size }, two]} />
      <View style={[styles.radarDot, active && styles.radarDotOn]}>
        <Icon color={active ? COURIER.solid : "#FFFFFF"} name="power" size={16} />
      </View>
    </View>
  );
}

export const COURIER_TABS: { name: string; label: string; icon: IconName }[] = [
  { icon: "home", label: "Home", name: "home" },
  { icon: "search", label: "Jobs", name: "jobs" },
  { icon: "truck", label: "Active", name: "active" },
  { icon: "credit-card", label: "Earnings", name: "earnings" },
  { icon: "user", label: "Account", name: "account" },
];

const styles = StyleSheet.create({
  center: { textAlign: "center" },
  danger: { alignItems: "center", backgroundColor: COURIER.red, borderRadius: 30, flexDirection: "row", gap: 8, height: 56, justifyContent: "center" },
  dangerIcon: { alignItems: "center", backgroundColor: COURIER.redSoft, borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  dangerRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 4 },
  dangerText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  dark: { borderCurve: "continuous", borderRadius: 24, overflow: "hidden", padding: 16 },
  decor: { overflow: "hidden" },
  disabled: { opacity: 0.45 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
  emptyIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  fact: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  factValue: { color: COURIER.ink, flexShrink: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  flex: { flex: 1 },
  knob: { backgroundColor: "#FFFFFF", borderRadius: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.3)", height: 26, left: 3, position: "absolute", top: 3, width: 26 },
  knobDark: { backgroundColor: COURIER.solid },
  menuGap: { marginBottom: 12 },
  muted: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 6 },
  pillBox: { alignSelf: "flex-start" },
  radarDot: { alignItems: "center", backgroundColor: "#5C8695", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  radarDotOn: { backgroundColor: "#FFFFFF" },
  ring: { borderColor: "#FFFFFF", borderWidth: 2, position: "absolute" },
  round: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  routeFrom: { backgroundColor: "#FFFFFF", borderColor: COURIER.solid, borderRadius: 7, borderWidth: 3, height: 14, width: 14 },
  routeLine: { backgroundColor: COURIER.solid, flex: 1, marginVertical: 2, opacity: 0.5, width: 2 },
  routeRail: { alignItems: "center", paddingVertical: 4, width: 18 },
  routeRow: { flexDirection: "row", gap: 10 },
  routeStop: { minHeight: 44 },
  routeTo: { backgroundColor: COURIER.solid, borderRadius: 7, height: 14, width: 14 },
  sub: { marginTop: -4 },
  toggle: { backgroundColor: "#C3CED3", borderRadius: 16, height: 32, width: 54 },
  toggleDark: { backgroundColor: "#FFFFFF" },
  toggleOn: { backgroundColor: COURIER.solid },
  well: { borderRadius: 20, padding: 14 },
});
