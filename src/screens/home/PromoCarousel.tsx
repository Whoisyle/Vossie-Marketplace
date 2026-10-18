import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

export type Promo = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: IconName;
  colors: readonly [string, string];
  /** Placeholder content: replaced by seller templates and staff banners later. */
  placeholder?: boolean;
};

/** Placeholder banners (owner decision, 2026-10-18): the real promo system comes later. */
export const PLACEHOLDER_PROMOS: Promo[] = [
  { colors: gradient.primary, cta: "Use VOSSIE10", icon: "percent", id: "promo-welcome", placeholder: true, subtitle: "10% off your first campus order", title: "Welcome to Vossie" },
  { colors: gradient.ink, cta: "Browse food", icon: "coffee", id: "promo-lunch", placeholder: true, subtitle: "Lunch between lectures, ready in minutes", title: "Fresh at the food court" },
  { colors: gradient.teal, cta: "See study gear", icon: "book-open", id: "promo-study", placeholder: true, subtitle: "Second-hand books and tutors near you", title: "Exam season essentials" },
];

/**
 * Swipeable promo banners with page dots. Pages snap, the active dot stretches, and the carousel advances by
 * itself every few seconds until the student touches it. Reduce Motion stops the auto-advance.
 */
export function PromoCarousel({
  onPress,
  promos = PLACEHOLDER_PROMOS,
  width,
}: {
  promos?: Promo[];
  width: number;
  onPress?: (promo: Promo) => void;
}) {
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const touched = useRef(false);
  const cardWidth = width - space.xl;
  const snap = cardWidth + space.xs;

  const go = useCallback(
    (next: number) => {
      scroller.current?.scrollTo({ animated: true, x: next * snap });
      setPage(next);
    },
    [snap],
  );

  useEffect(() => {
    if (reduced || promos.length < 2) return;
    const timer = setInterval(() => {
      if (touched.current) return;
      setPage((current) => {
        const next = (current + 1) % promos.length;
        scroller.current?.scrollTo({ animated: true, x: next * snap });
        return next;
      });
    }, 5_000);
    return () => clearInterval(timer);
  }, [promos.length, reduced, snap]);

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / snap);
    if (next !== page) haptic.select();
    setPage(next);
  };

  return (
    <View>
      <ScrollView
        contentContainerStyle={styles.row}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={onEnd}
        onScrollBeginDrag={() => {
          touched.current = true;
        }}
        ref={scroller}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        style={{ marginHorizontal: -space.lg }}
        testID="promo-carousel"
      >
        {promos.map((promo, index) => (
          <Banner active={index === page} cardWidth={cardWidth} key={promo.id} onPress={() => onPress?.(promo)} promo={promo} />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {promos.map((promo, index) => (
          <Dot active={index === page} key={promo.id} onPress={() => go(index)} />
        ))}
      </View>
    </View>
  );
}

function Banner({ active, cardWidth, onPress, promo }: { active: boolean; cardWidth: number; onPress: () => void; promo: Promo }) {
  const lift = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + lift.get() * 0.04 }], opacity: 0.8 + lift.get() * 0.2 }));
  return (
    <Pressable accessibilityLabel={`${promo.title}. ${promo.subtitle}`} accessibilityRole="button" onPress={onPress}>
      <Animated.View style={[styles.card, { width: cardWidth }, style]}>
        <LinearGradient colors={promo.colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bubbleBig} />
        <View style={styles.bubbleSmall} />
        <View style={styles.texts}>
          <Text numberOfLines={2} style={styles.title}>
            {promo.title}
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {promo.subtitle}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{promo.cta}</Text>
            <Icon color={color.ink} name="arrow-right" size={14} />
          </View>
        </View>
        <View style={styles.iconBadge}>
          <Icon color={color.onPrimary} name={promo.icon} size={28} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const grow = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    grow.set(withSpring(active ? 1 : 0, spring.snappy));
  }, [active, grow]);
  const style = useAnimatedStyle(() => ({ width: 8 + grow.get() * 16, opacity: 0.4 + grow.get() * 0.6 }));
  return (
    <Pressable accessibilityLabel="Show banner" accessibilityRole="button" hitSlop={8} onPress={onPress}>
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubbleBig: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 70, height: 140, position: "absolute", right: -30, top: -40, width: 140 },
  bubbleSmall: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 30, bottom: -10, height: 60, position: "absolute", right: 70, width: 60 },
  card: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)",
    flexDirection: "row",
    minHeight: 132,
    overflow: "hidden",
    padding: space.md,
  },
  cta: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.onPrimary, borderRadius: 16, flexDirection: "row", gap: 6, marginTop: space.xs, paddingHorizontal: 12, paddingVertical: 7 },
  ctaText: { color: color.ink, fontSize: 12, fontWeight: "700" },
  dot: { backgroundColor: color.ink, borderRadius: 4, height: 8 },
  dots: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: space.xs },
  iconBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  row: { gap: space.xs, paddingHorizontal: space.lg },
  subtitle: { color: "rgba(255,255,255,0.86)", fontSize: 13, lineHeight: 18 },
  texts: { flex: 1, gap: 4, paddingRight: space.sm },
  title: { color: color.onPrimary, fontSize: 19, fontWeight: "700", lineHeight: 24 },
});
