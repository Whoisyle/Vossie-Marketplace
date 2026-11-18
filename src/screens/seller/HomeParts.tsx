import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text as RNText, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { Icon } from "@/components";
import { initials, shortDate } from "@/data/format";
import { ORDER_STAGE_LABEL, orderProgress, orderTitle, type ChecklistStep } from "@/seller/homeData";
import type { WeekBar } from "@/seller/selectors";
import type { SellerOrder } from "@/seller/types";
import { color } from "@/theme/tokens";

import { PackagingScene } from "./Packaging";

/** A bar that fills to `percent` when it first appears. */
export function ProgressBar({ delay = 0, fillColor, light = false, percent }: { percent: number; light?: boolean; delay?: number; fillColor?: string }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(delay, withTiming(Math.max(0, Math.min(100, percent)), { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [delay, fill, percent]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get()}%` }));
  return (
    <View style={[styles.track, light && styles.trackLight]}>
      <Animated.View style={[styles.fill, light && styles.fillLight, fillColor ? { backgroundColor: fillColor } : null, style]} />
    </View>
  );
}

/** The top of Home: the store's logo or initials, "Hi Vumisa!", the time-of-day greeting and the bell. */
export function HomeTop({ firstName, greeting, logo, onAvatar, onBell, storeName, unread }: { firstName: string; greeting: string; storeName: string; logo?: string; unread: number; onBell: () => void; onAvatar: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.top}>
      <Pressable accessibilityLabel="Your store profile" accessibilityRole="button" onPress={onAvatar} style={styles.avatar} testID="home-avatar">
        {logo ? <Image contentFit="cover" source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <RNText style={styles.avatarText}>{initials(storeName)}</RNText>}
      </Pressable>
      <View style={styles.hello}>
        <RNText accessibilityRole="header" style={styles.hi}>
          Hi {firstName}!
        </RNText>
        <RNText style={styles.good}>{greeting}</RNText>
      </View>
      <Pressable accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"} accessibilityRole="button" onPress={onBell} style={styles.bell} testID="seller-bell">
        <Icon color={color.charcoal} name="bell" size={22} />
        {unread ? (
          <View style={styles.bellBadge}>
            <RNText style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</RNText>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function HomeSearch({ onChange, value }: { value: string; onChange: (value: string) => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(40).duration(360)} style={styles.search}>
      <Icon color={color.slate} name="search" size={20} />
      <TextInput accessibilityLabel="Search your orders and products" autoCapitalize="none" autoCorrect={false} onChangeText={onChange} placeholder="Search orders and products" placeholderTextColor={color.steelGrey} returnKeyType="search" style={styles.searchInput} testID="home-search" value={value} />
      {value ? (
        <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} onPress={() => onChange("")}>
          <Icon color={color.steelGrey} name="x-circle" size={18} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/** The welcome card: an outlined card with a message that suits the moment and the Vossie boxes moving beside it. */
export function WelcomeBanner({ cta, onPress, testID = "home-banner", text, title }: { title: string; text: string; cta: string; onPress: () => void; testID?: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(380)}>
      <Pressable accessibilityHint={cta} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]} testID={testID}>
        <View style={styles.bannerText}>
          <RNText style={styles.bannerTitle}>{title}</RNText>
          <RNText style={styles.bannerBody}>{text}</RNText>
          <View style={styles.bannerCta}>
            <RNText style={styles.bannerCtaText}>{cta}</RNText>
            <Icon color="#FFFFFF" name="arrow-right" size={14} />
          </View>
        </View>
        <View pointerEvents="none" style={styles.bannerArt}>
          <PackagingScene index={2} scale={0.33} still />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function SectionTitle({ action, onAction, title }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <RNText accessibilityRole="header" style={styles.section}>
        {title}
      </RNText>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <RNText style={styles.sectionAction}>{action}</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Orders in progress as cards with a progress bar. The first, the one that needs you soonest, is the dark one. */
export function OrderCards({ onOpen, orders }: { orders: SellerOrder[]; onOpen: (order: SellerOrder) => void }) {
  return (
    <View style={styles.grid} testID="order-cards">
      {orders.slice(0, 4).map((order, index) => {
        const dark = index === 0;
        const percent = orderProgress(order.status);
        return (
          <Animated.View entering={FadeInDown.delay(120 + index * 70).duration(380)} key={order.id} style={styles.cardWrap}>
            <Pressable accessibilityLabel={`${order.number}, ${orderTitle(order)}, ${ORDER_STAGE_LABEL[order.status] ?? order.status}, ${percent} percent`} accessibilityRole="button" onPress={() => onOpen(order)} style={({ pressed }) => [styles.card, dark ? styles.cardDark : index % 2 === 1 ? styles.cardSage : styles.cardGrey, pressed && styles.pressed]} testID={`order-card-${order.id}`}>
              {dark ? <LinearGradient colors={[color.accent, "#274E5B"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
              <View style={styles.cardTop}>
                <RNText style={[styles.cardDate, dark && styles.onDarkSoft]}>{shortDate(order.placedAt)}</RNText>
                <View style={[styles.stage, dark && styles.stageDark]}>
                  <RNText style={[styles.stageText, dark && styles.onDark]}>{ORDER_STAGE_LABEL[order.status] ?? order.status}</RNText>
                </View>
              </View>
              <View style={[styles.cardIcon, dark && styles.cardIconDark]}>
                <Icon color={dark ? "#FFFFFF" : color.accent} name={order.fulfilment === "delivery" ? "truck" : "shopping-bag"} size={20} />
              </View>
              <RNText numberOfLines={1} style={[styles.cardTitle, dark && styles.onDark]}>
                {orderTitle(order)}
              </RNText>
              <RNText numberOfLines={1} style={[styles.cardSub, dark && styles.onDarkSoft]}>
                {order.number} · {order.fulfilmentLabel}
              </RNText>
              <View style={styles.cardBottom}>
                <RNText style={[styles.progressLabel, dark && styles.onDarkSoft]}>Progress</RNText>
                <RNText style={[styles.progressPercent, dark && styles.onDark]}>{percent}%</RNText>
              </View>
              <ProgressBar delay={200 + index * 80} light={dark} percent={percent} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Seven small bars, today highlighted. */
export function MiniBars({ bars }: { bars: WeekBar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.cents));
  return (
    <View accessibilityLabel="Sales over the last seven days" style={styles.bars} testID="mini-bars">
      {bars.map((bar) => (
        <View key={bar.label + String(bar.isToday)} style={styles.barCol}>
          <View style={styles.barSlot}>
            <View style={[styles.bar, bar.isToday && styles.barToday, { height: `${Math.max(6, (bar.cents / max) * 100)}%` }]} />
          </View>
          <RNText style={[styles.barLabel, bar.isToday && styles.barLabelToday]}>{bar.label.slice(0, 1)}</RNText>
        </View>
      ))}
    </View>
  );
}

/** What is left to do for the store to look finished to buyers. */
export function ChecklistCard({ done, next, onNext, percent, total }: { percent: number; done: number; total: number; next?: ChecklistStep; onNext: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(380)} style={styles.checklist} testID="setup-checklist">
      <View style={styles.checkTop}>
        <View style={styles.checkRing}>
          <RNText style={styles.checkPercent}>{percent}%</RNText>
        </View>
        <View style={styles.checkText}>
          <RNText style={styles.cardTitleDark}>Your shop is {percent}% complete</RNText>
          <RNText style={styles.checkHint}>
            {done} of {total} steps done{next ? `. Next: ${next.label.toLowerCase()}` : ""}
          </RNText>
        </View>
      </View>
      <ProgressBar percent={percent} />
      {next ? (
        <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [styles.checkButton, pressed && styles.pressed]} testID="checklist-next">
          <RNText style={styles.checkButtonText}>{next.action}</RNText>
          <Icon color="#FFFFFF" name="arrow-right" size={16} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/** Best sellers as a row of small cards. */
export function BestSellers({ items, onOpen }: { items: { title: string; sold: number; id?: string }[]; onOpen: (id?: string) => void }) {
  return (
    <View style={styles.sellers} testID="best-sellers">
      {items.map((item, index) => (
        <Pressable accessibilityLabel={`${item.title}, ${item.sold} sold`} accessibilityRole="button" key={item.title} onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.seller, pressed && styles.pressed]}>
          <View style={styles.rank}>
            <RNText style={styles.rankText}>{index + 1}</RNText>
          </View>
          <RNText numberOfLines={2} style={styles.sellerTitle}>
            {item.title}
          </RNText>
          <RNText style={styles.sellerSold}>{item.sold} sold</RNText>
        </Pressable>
      ))}
    </View>
  );
}

/** The top of a page: a big title, a short line under it, and an optional button on the right. */
export function ScreenHead({ right, subtitle, title }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(340)} style={styles.head}>
      <View style={styles.headText}>
        <RNText accessibilityRole="header" style={styles.headTitle}>
          {title}
        </RNText>
        {subtitle ? <RNText style={styles.headSub}>{subtitle}</RNText> : null}
      </View>
      {right}
    </Animated.View>
  );
}

export type StatCardItem = { label: string; value: string | number; tone?: "dark" | "sage" | "grey"; onPress?: () => void; testID?: string };

/** A row of big-number cards, like the three numbers under a profile. The dark one is the one to look at first. */
export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <View style={styles.statRow}>
      {items.map((item, index) => {
        const tone = item.tone ?? "grey";
        const dark = tone === "dark";
        const body = (
          <>
            {dark ? <LinearGradient colors={[color.accent, "#274E5B"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
            <RNText style={[styles.statValue, dark && styles.onDark]}>{item.value}</RNText>
            <RNText style={[styles.statLabel, dark && styles.onDarkSoft]}>{item.label}</RNText>
          </>
        );
        const look = [styles.statCard, tone === "sage" ? styles.cardSage : tone === "dark" ? styles.cardDark : styles.statPlain];
        return (
          <Animated.View entering={FadeInDown.delay(60 + index * 50).duration(340)} key={item.label} style={styles.statWrap}>
            {item.onPress ? (
              <Pressable accessibilityLabel={`${item.label}, ${item.value}`} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [...look, pressed && styles.pressed]} testID={item.testID}>
                {body}
              </Pressable>
            ) : (
              <View style={look} testID={item.testID}>
                {body}
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Steps down a line: the ones reached are filled in teal with a tick, the current one is ringed. */
export function Timeline({ active, steps }: { steps: { label: string; hint?: string }[]; active: number }) {
  return (
    <View testID="timeline">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const last = index === steps.length - 1;
        return (
          <View accessibilityLabel={`${step.label}${done ? ", done" : current ? ", now" : ""}`} key={step.label} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && styles.stepDotNow]}>{done ? <Icon color="#FFFFFF" name="check" size={12} /> : null}</View>
              {last ? null : <View style={[styles.stepLine, done && styles.stepLineOn]} />}
            </View>
            <View style={styles.stepText}>
              <RNText style={[styles.stepLabel, !done && !current && styles.stepLabelOff]}>{step.label}</RNText>
              {step.hint ? <RNText style={styles.stepHint}>{step.hint}</RNText> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A round badge with the initials of a person or a store. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatarSmall, { borderRadius: size / 2, height: size, width: size }]}>
      <RNText style={[styles.avatarSmallText, { fontSize: size * 0.36 }]}>{initials(name)}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSmall: { alignItems: "center", backgroundColor: color.sage, justifyContent: "center" },
  avatarSmallText: { color: color.accent, fontWeight: "800" },
  head: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 6 },
  headSub: { color: color.steelGrey, fontSize: 14, marginTop: 2 },
  headText: { flex: 1 },
  headTitle: { color: color.charcoal, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  statCard: { borderRadius: 18, gap: 2, justifyContent: "center", minHeight: 84, overflow: "hidden", padding: 12 },
  statLabel: { color: color.slate, fontSize: 12 },
  statPlain: { backgroundColor: "#FFFFFF", borderColor: "#E1E6E8", borderWidth: 1 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  statValue: { color: color.charcoal, fontSize: 24, fontWeight: "800" },
  statWrap: { flex: 1 },
  stepDot: { alignItems: "center", backgroundColor: color.cloudGrey, borderColor: "#C8D2D8", borderRadius: 11, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  stepDotNow: { backgroundColor: "#FFFFFF", borderColor: color.accent, borderWidth: 5 },
  stepDotOn: { backgroundColor: color.accent, borderColor: color.accent },
  stepHint: { color: color.slate, fontSize: 12 },
  stepLabel: { color: color.charcoal, fontSize: 15, fontWeight: "800" },
  stepLabelOff: { color: color.steelGrey, fontWeight: "600" },
  stepLine: { backgroundColor: "#D6DDE0", flex: 1, marginVertical: 2, width: 3 },
  stepLineOn: { backgroundColor: color.accent },
  stepRail: { alignItems: "center", width: 24 },
  stepRow: { flexDirection: "row", gap: 12, minHeight: 44 },
  stepText: { flex: 1, paddingBottom: 10, paddingTop: 1 },
  avatar: { alignItems: "center", backgroundColor: color.sage, borderRadius: 24, height: 48, justifyContent: "center", overflow: "hidden", width: 48 },
  avatarText: { color: color.accent, fontSize: 17, fontWeight: "800" },
  bar: { backgroundColor: color.steelGrey, borderRadius: 4, width: "100%" },
  barCol: { alignItems: "center", flex: 1, gap: 4 },
  barLabel: { color: color.steelGrey, fontSize: 11, fontWeight: "700" },
  barLabelToday: { color: color.accent },
  barSlot: { height: 54, justifyContent: "flex-end", width: "62%" },
  barToday: { backgroundColor: color.accent },
  bars: { alignItems: "flex-end", flexDirection: "row", gap: 6, marginTop: 10 },
  banner: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: color.accent, borderRadius: 20, borderWidth: 1.5, flexDirection: "row", marginTop: 14, minHeight: 124, overflow: "hidden", paddingLeft: 16 },
  bannerArt: { height: 119, marginRight: -6, width: 118 },
  bannerBody: { color: color.slate, fontSize: 13, lineHeight: 18 },
  bannerCta: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.accent, borderRadius: 14, flexDirection: "row", gap: 6, marginTop: 6, paddingHorizontal: 12, paddingVertical: 6 },
  bannerCtaText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  bannerText: { flex: 1, gap: 3, paddingVertical: 14 },
  bannerTitle: { color: color.charcoal, fontSize: 17, fontWeight: "800" },
  bell: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, boxShadow: "0 2px 8px rgba(25,27,29,0.1)", height: 44, justifyContent: "center", width: 44 },
  bellBadge: { alignItems: "center", backgroundColor: color.accent, borderColor: "#FFFFFF", borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 3, position: "absolute", right: -2, top: -2 },
  bellBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  card: { borderRadius: 20, gap: 6, minHeight: 176, overflow: "hidden", padding: 14 },
  cardBottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: "auto" },
  cardDark: { backgroundColor: color.accent },
  cardDate: { color: color.slate, fontSize: 11, fontWeight: "700" },
  cardGrey: { backgroundColor: color.cloudGrey },
  cardIcon: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 12, height: 36, justifyContent: "center", width: 36 },
  cardIconDark: { backgroundColor: "rgba(255,255,255,0.18)" },
  cardSage: { backgroundColor: color.sage },
  cardSub: { color: color.slate, fontSize: 12 },
  cardTitle: { color: color.charcoal, fontSize: 15, fontWeight: "800" },
  cardTitleDark: { color: color.charcoal, fontSize: 15, fontWeight: "800" },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardWrap: { flexBasis: "47.5%", flexGrow: 1 },
  checkButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.accent, borderRadius: 16, flexDirection: "row", gap: 8, marginTop: 12, paddingHorizontal: 16, paddingVertical: 9 },
  checkButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  checkHint: { color: color.slate, fontSize: 13, lineHeight: 18 },
  checkPercent: { color: color.accent, fontSize: 15, fontWeight: "800" },
  checkRing: { alignItems: "center", borderColor: color.accent, borderRadius: 28, borderWidth: 4, height: 56, justifyContent: "center", width: 56 },
  checkText: { flex: 1, gap: 2 },
  checkTop: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  checklist: { backgroundColor: color.sage, borderRadius: 20, marginTop: 14, padding: 16 },
  fill: { backgroundColor: color.accent, borderRadius: 4, height: 8 },
  fillLight: { backgroundColor: "#FFFFFF" },
  good: { color: color.steelGrey, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  hello: { flex: 1 },
  hi: { color: color.charcoal, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  onDark: { color: "#FFFFFF" },
  onDarkSoft: { color: "rgba(255,255,255,0.78)" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  progressLabel: { color: color.slate, fontSize: 11 },
  progressPercent: { color: color.charcoal, fontSize: 12, fontWeight: "800" },
  rank: { alignItems: "center", backgroundColor: color.sage, borderRadius: 11, height: 22, justifyContent: "center", width: 22 },
  rankText: { color: color.accent, fontSize: 11, fontWeight: "800" },
  search: { alignItems: "center", backgroundColor: color.cloudGrey, borderRadius: 18, flexDirection: "row", gap: 10, height: 52, marginTop: 16, paddingHorizontal: 16 },
  searchInput: { color: color.charcoal, flex: 1, fontSize: 15, height: "100%", outlineStyle: "none", outlineWidth: 0 } as object,
  section: { color: color.charcoal, fontSize: 18, fontWeight: "800" },
  sectionAction: { color: color.accent, fontSize: 14, fontWeight: "700" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 22 },
  seller: { backgroundColor: "#FFFFFF", borderColor: "#E1E6E8", borderRadius: 16, borderWidth: 1, flexBasis: "47.5%", flexGrow: 1, gap: 6, padding: 12 },
  sellerSold: { color: color.accent, fontSize: 12, fontWeight: "800" },
  sellerTitle: { color: color.charcoal, fontSize: 14, fontWeight: "700" },
  sellers: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stage: { backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  stageDark: { backgroundColor: "rgba(255,255,255,0.2)" },
  stageText: { color: color.accent, fontSize: 10, fontWeight: "800" },
  top: { alignItems: "center", flexDirection: "row", gap: 12 },
  track: { backgroundColor: "rgba(55,99,113,0.18)", borderRadius: 4, height: 8, overflow: "hidden" },
  trackLight: { backgroundColor: "rgba(255,255,255,0.28)" },
});
