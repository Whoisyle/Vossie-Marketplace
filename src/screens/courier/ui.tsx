import { useRouter, type Href } from "expo-router";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Wordmark, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";

/** The courier app's colours, taken from the courier designs: a teal frame, a white sheet, soft grey-blue cards. */
export const COURIER = {
  amber: "#B7791F",
  amberSoft: "#FFF1D6",
  band: "#DADFE1",
  blue: "#2C6E9E",
  blueSoft: "#E3EFF8",
  border: "#D9E3E7",
  card: "#EFF4F6",
  frame: "#3B6370",
  green: "#2F8A57",
  greenSoft: "#E1F3E8",
  ink: "#1E2B33",
  inkSoft: "#5F6E76",
  muted: "#8A9AA2",
  red: "#B4544A",
  redSoft: "#FBE3DF",
  solid: "#3B6370",
  solidPressed: "#2F5360",
  white: "#FFFFFF",
} as const;

/** The serif the page titles are set in. It is loaded by the courier layout; until it is, the system serif is used. */
export const SERIF = "Lora_600SemiBold";

export const type = StyleSheet.create({
  body: { color: COURIER.ink, fontSize: 14, lineHeight: 20 },
  caption: { color: COURIER.inkSoft, fontSize: 12 },
  card: { color: COURIER.ink, fontSize: 15, fontWeight: "700" },
  label: { color: COURIER.inkSoft, fontSize: 13 },
  section: { color: COURIER.ink, fontSize: 16, fontWeight: "700" },
  title: { color: COURIER.ink, fontFamily: SERIF, fontSize: 28, lineHeight: 34 },
});

/** The tab bar hides on the pages where the designs have none (a request, the pickup, a failed delivery). */
type Chrome = { hidden: boolean; setHidden: (hidden: boolean) => void };
const ChromeContext = createContext<Chrome | null>(null);

export function CourierChromeProvider({ children }: { children: (hidden: boolean) => ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return <ChromeContext value={value}>{children(hidden)}</ChromeContext>;
}

/** Hide the tab bar while this screen is showing. */
export function useHideTabBar(hide: boolean) {
  const chrome = use(ChromeContext);
  const setHidden = chrome?.setHidden;
  useEffect(() => {
    setHidden?.(hide);
    return () => setHidden?.(false);
  }, [hide, setHidden]);
}

/** The strip across the top: the Vossie mark, the Courier pill and the bell with a dot when something is new. */
export function CourierTopBar() {
  const router = useRouter();
  const { state } = useDemoStore();
  const insets = useSafeAreaInsets();
  const unread = state.courier.alerts.some((alert) => !alert.read);
  return (
    <View style={[styles.band, { paddingTop: insets.top + 6 }]}>
      <Wordmark tone="brand" width={92} />
      <View style={styles.bandRight}>
        <Pressable accessibilityLabel="Courier mode" accessibilityRole="button" onPress={() => router.push("/courier/account" as Href)} style={styles.courierPill} testID="courier-pill">
          <Icon color="#FFFFFF" name="truck" size={13} />
          <Text style={styles.courierPillText}>Courier</Text>
        </Pressable>
        <Pressable accessibilityLabel={unread ? "Notifications, new" : "Notifications"} accessibilityRole="button" onPress={() => router.push("/courier/home/notifications" as Href)} style={styles.bell} testID="courier-bell">
          <Icon color={COURIER.ink} name="bell" size={18} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

/** The teal frame with the white sheet every courier page sits in. The tab bar floats at the bottom of the sheet. */
export function CourierFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <CourierTopBar />
      <View style={[styles.frame, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <View style={styles.sheet}>{children}</View>
      </View>
    </View>
  );
}

/**
 * One page inside the sheet: an optional back button, the serif title and its grey line, an optional round button on the
 * right, then the content. It leaves room under the content for the tab bar unless the bar is hidden.
 */
export function CourierPage({
  back,
  children,
  right,
  scroll = true,
  subtitle,
  testID,
  title,
  onBack,
  bar = true,
  footer,
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
  /** Pinned to the bottom, above the tab bar: the main button of the page. */
  footer?: ReactNode;
}) {
  const router = useRouter();
  const head = (
    <View style={styles.head}>
      {back ? (
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={8} onPress={onBack ?? (() => router.back())} style={styles.back} testID="courier-back">
          <Icon color={COURIER.ink} name="chevron-left" size={20} />
        </Pressable>
      ) : null}
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={type.title}>
          {title}
        </Text>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  const bottom = footer ? 96 : bar ? 104 : 24;
  if (!scroll) {
    return (
      <View style={styles.page} testID={testID}>
        <View style={styles.pad}>{head}</View>
        <View style={[styles.flex, styles.pad, { paddingBottom: bottom }]}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    );
  }
  return (
    <View style={styles.page} testID={testID}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: bottom + (footer ? 24 : 0) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {head}
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
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

export function Card({ children, onPress, style, tone = "plain", testID }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; tone?: "plain" | "soft" | "dark" | "warn" | "selected"; testID?: string }) {
  const look = tone === "soft" ? styles.cardSoft : tone === "dark" ? styles.cardDark : tone === "warn" ? styles.cardWarn : tone === "selected" ? styles.cardSelected : styles.cardPlain;
  if (!onPress) {
    return (
      <View style={[styles.card, look, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, look, style, pressed && styles.pressed]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export type PillTone = "green" | "amber" | "red" | "blue" | "grey";

export function Pill({ label, tone = "grey", style, testID }: { label: string; tone?: PillTone; style?: StyleProp<ViewStyle>; testID?: string }) {
  const [bg, fg] = tone === "green" ? [COURIER.greenSoft, COURIER.green] : tone === "amber" ? [COURIER.amberSoft, COURIER.amber] : tone === "red" ? [COURIER.redSoft, COURIER.red] : tone === "blue" ? [COURIER.blueSoft, COURIER.blue] : [COURIER.card, COURIER.inkSoft];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]} testID={testID}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** A row of equal-width filter chips; the chosen one is dark. */
export function Chips<T extends string>({ chips, onChange, value, testID }: { chips: { key: T; label: string; count?: number }[]; value: T; onChange: (key: T) => void; testID?: string }) {
  return (
    <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} testID={testID}>
      {chips.map((chip) => {
        const on = chip.key === value;
        return (
          <Pressable accessibilityLabel={chip.label} accessibilityRole="tab" accessibilityState={{ selected: on }} key={chip.key} onPress={() => { haptic.tap(); onChange(chip.key); }} style={[styles.chip, on && styles.chipOn]} testID={`chip-${chip.key}`}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {chip.label}
              {chip.count !== undefined && chip.count > 0 ? ` ${chip.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Button({ disabled, icon, label, onPress, tone = "solid", testID }: { label: string; onPress: () => void; tone?: "solid" | "outline" | "danger" | "light"; icon?: IconName; disabled?: boolean; testID?: string }) {
  const solid = tone === "solid";
  const [bg, fg, border] = tone === "outline" ? ["#FFFFFF", COURIER.solid, COURIER.solid] : tone === "danger" ? [COURIER.red, "#FFFFFF", COURIER.red] : tone === "light" ? [COURIER.card, COURIER.solid, COURIER.card] : [COURIER.solid, "#FFFFFF", COURIER.solid];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: border }, solid && pressed && { backgroundColor: COURIER.solidPressed }, !solid && pressed && styles.pressed, disabled && styles.disabled]}
      testID={testID}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
      {icon ? <Icon color={fg} name={icon} size={18} /> : null}
    </Pressable>
  );
}

/** A small round button, for call, chat and filters. */
export function RoundButton({ icon, label, onPress, dark = false, testID }: { icon: IconName; label: string; onPress: () => void; dark?: boolean; testID?: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={6} onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.round, dark && styles.roundDark, pressed && styles.pressed]} testID={testID}>
      <Icon color={dark ? "#FFFFFF" : COURIER.solid} name={icon} size={18} />
    </Pressable>
  );
}

/** A number with a small label above it, in a soft tile: Today, Done, Rating. */
export function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID}>
      <Text style={type.caption}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
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
          <Text style={type.card}>{pickup.title}</Text>
          <Text style={type.caption}>{pickup.sub}</Text>
        </View>
        <View style={styles.routeStop}>
          <Text style={type.card}>{dropoff.title}</Text>
          <Text style={type.caption}>{dropoff.sub}</Text>
        </View>
      </View>
    </View>
  );
}

/** A row of a facts table: label on the left, value on the right. */
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={type.label}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
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

/** A line on a card with an icon tile at the start and a chevron at the end. */
export function MenuRow({ detail, icon, label, onPress, right, testID, tone }: { icon: IconName; label: string; detail?: string; onPress?: () => void; right?: ReactNode; testID?: string; tone?: "danger" }) {
  const danger = tone === "danger";
  return (
    <Card onPress={onPress} style={styles.menuRow} testID={testID}>
      <View style={[styles.menuIcon, danger && { backgroundColor: COURIER.redSoft }]}>
        <Icon color={danger ? COURIER.red : COURIER.solid} name={icon} size={20} />
      </View>
      <View style={styles.flex}>
        <Text style={[type.card, danger && { color: COURIER.red }]}>{label}</Text>
        {detail ? <Text style={type.caption}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon color={COURIER.muted} name="chevron-right" size={18} /> : null)}
    </Card>
  );
}

export function Empty({ detail, icon, title }: { icon: IconName; title: string; detail: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon color={COURIER.solid} name={icon} size={26} />
      </View>
      <Text style={type.card}>{title}</Text>
      <Text style={[type.caption, styles.center]}>{detail}</Text>
    </View>
  );
}

export const TABS: { name: string; label: string; icon: IconName }[] = [
  { icon: "home", label: "Home", name: "home" },
  { icon: "search", label: "Jobs", name: "jobs" },
  { icon: "truck", label: "Active", name: "active" },
  { icon: "credit-card", label: "Earnings", name: "earnings" },
  { icon: "user", label: "Account", name: "account" },
];

/** The courier's bottom bar: five tabs, with a dark bubble that slides to the one you are on. */
export function CourierTabBar({ activeIndex, onGo, hidden, badges }: { activeIndex: number; onGo: (name: string) => void; hidden: boolean; badges?: Record<string, number> }) {
  const [width, setWidth] = useState(0);
  const tabWidth = width / TABS.length;
  const x = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (tabWidth > 0) x.set(reduced ? tabWidth * activeIndex : withSpring(tabWidth * activeIndex, spring.snappy));
  }, [activeIndex, reduced, tabWidth, x]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() + (tabWidth - 44) / 2 }] }));
  const onLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => setWidth(event.nativeEvent.layout.width), []);
  if (hidden) return null;
  return (
    <View style={styles.tabBar} testID="courier-tabs">
      <View onLayout={onLayout} style={styles.tabRow}>
        {tabWidth > 0 ? <Animated.View pointerEvents="none" style={[styles.bubble, bubble]} /> : null}
        {TABS.map((tab, index) => {
          const on = index === activeIndex;
          const count = badges?.[tab.name] ?? 0;
          return (
            <Pressable accessibilityLabel={tab.label} accessibilityRole="tab" accessibilityState={{ selected: on }} key={tab.name} onPress={() => { if (!on) haptic.tap(); onGo(tab.name); }} style={styles.tab} testID={`courier-tab-${tab.name}`}>
              <View style={styles.tabIcon}>
                <Icon color={on ? "#FFFFFF" : COURIER.inkSoft} name={tab.icon} size={20} />
                {count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const textOn = (color: string): TextStyle => ({ color });

const styles = StyleSheet.create({
  back: { alignItems: "center", backgroundColor: COURIER.card, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  badge: { alignItems: "center", backgroundColor: COURIER.red, borderRadius: 8, height: 16, justifyContent: "center", minWidth: 16, paddingHorizontal: 3, position: "absolute", right: -6, top: -6 },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  band: { alignItems: "center", backgroundColor: COURIER.band, flexDirection: "row", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 16 },
  bandRight: { alignItems: "center", flexDirection: "row", gap: 10 },
  bell: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  bubble: { backgroundColor: COURIER.solid, borderRadius: 22, height: 44, left: 0, position: "absolute", top: 0, width: 44 },
  button: { alignItems: "center", borderRadius: 28, borderWidth: 1.5, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54, paddingHorizontal: 20 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  card: { borderRadius: 20, padding: 14 },
  cardDark: { backgroundColor: COURIER.solid },
  cardPlain: { backgroundColor: "#FFFFFF", borderColor: COURIER.border, borderWidth: 1 },
  cardSelected: { backgroundColor: "#E3EDF0", borderColor: COURIER.solid, borderWidth: 2 },
  cardSoft: { backgroundColor: COURIER.card },
  cardWarn: { backgroundColor: COURIER.amberSoft },
  center: { textAlign: "center" },
  chip: { alignItems: "center", backgroundColor: COURIER.card, borderRadius: 18, height: 36, justifyContent: "center", minWidth: 84, paddingHorizontal: 14 },
  chipOn: { backgroundColor: COURIER.solid },
  chipScroll: { flexGrow: 0, marginBottom: 12, marginTop: 4 },
  chipText: { color: COURIER.ink, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#FFFFFF" },
  chips: { gap: 8, paddingRight: 8 },
  courierPill: { alignItems: "center", backgroundColor: COURIER.solid, borderRadius: 18, flexDirection: "row", gap: 6, height: 36, paddingHorizontal: 14 },
  courierPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  dot: { backgroundColor: COURIER.red, borderRadius: 4, height: 8, position: "absolute", right: 10, top: 9, width: 8 },
  empty: { alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 36 },
  emptyIcon: { alignItems: "center", backgroundColor: COURIER.card, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  fact: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  factValue: { color: COURIER.ink, flexShrink: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  flex: { flex: 1 },
  footer: { backgroundColor: "rgba(255,255,255,0.96)", bottom: 0, left: 0, paddingBottom: 16, paddingHorizontal: 18, paddingTop: 8, position: "absolute", right: 0 },
  frame: { backgroundColor: COURIER.frame, flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  head: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 14 },
  knob: { backgroundColor: "#FFFFFF", borderRadius: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.3)", height: 26, left: 3, position: "absolute", top: 3, width: 26 },
  knobDark: { backgroundColor: COURIER.solid },
  menuIcon: { alignItems: "center", backgroundColor: "#E3EDF0", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  menuRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  pad: { paddingHorizontal: 18, paddingTop: 18 },
  page: { flex: 1 },
  pill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  root: { backgroundColor: COURIER.band, flex: 1 },
  round: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: COURIER.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  roundDark: { backgroundColor: COURIER.solid, borderColor: COURIER.solid },
  routeFrom: { backgroundColor: "#FFFFFF", borderColor: COURIER.solid, borderRadius: 7, borderWidth: 3, height: 14, width: 14 },
  routeLine: { backgroundColor: COURIER.solid, flex: 1, marginVertical: 2, opacity: 0.5, width: 2 },
  routeRail: { alignItems: "center", paddingVertical: 4, width: 18 },
  routeRow: { flexDirection: "row", gap: 10 },
  routeStop: { minHeight: 44 },
  routeTo: { backgroundColor: COURIER.solid, borderRadius: 7, height: 14, width: 14 },
  sheet: { backgroundColor: "#FFFFFF", borderRadius: 30, flex: 1, overflow: "hidden" },
  stat: { backgroundColor: COURIER.card, borderRadius: 18, flex: 1, gap: 4, padding: 12 },
  statValue: { color: COURIER.ink, fontSize: 20, fontWeight: "800" },
  tab: { alignItems: "center", flex: 1, gap: 2, height: 62, justifyContent: "flex-start", paddingTop: 0 },
  tabBar: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: COURIER.border, borderRadius: 32, borderWidth: 1, bottom: 10, boxShadow: "0 6px 18px rgba(20,35,44,0.18)", left: 10, paddingHorizontal: 6, paddingVertical: 7, position: "absolute", right: 10 },
  tabIcon: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  tabLabel: { color: COURIER.inkSoft, fontSize: 11 },
  tabLabelOn: { color: COURIER.ink, fontWeight: "800" },
  tabRow: { flexDirection: "row" },
  toggle: { backgroundColor: "#C9D3D8", borderRadius: 16, height: 32, width: 54 },
  toggleDark: { backgroundColor: "rgba(255,255,255,0.9)" },
  toggleOn: { backgroundColor: COURIER.solid },
});
