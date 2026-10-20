import { Image } from "expo-image";
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
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { Bands, Icon, PageDots, Rings, type IconName } from "@/components";
import { effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { promoDefs, promoPercent } from "@/data/promos";
import { getListing } from "@/data/repository";
import { haptic } from "@/lib/haptics";
import { ease, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

export type Promo = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: IconName;
  colors: readonly [string, string];
  /** e.g. "Up to 25% off", shown on the banner when the target has deals. */
  badge?: string;
  /** Marks a stand-in banner that does not lead anywhere yet. */
  placeholder?: boolean;
  /** Photo of the product the banner is about, and the line printed on its tag. */
  photo?: number;
  productLabel?: string;
};

const TONES = { ink: gradient.ink, primary: gradient.primary, teal: gradient.teal } as const;

/** The campus promotion banners: each opens a store or category page with its deals first. */
export const PROMOS: Promo[] = promoDefs.map((def) => {
  const percent = promoPercent(def);
  const product = getListing(def.productId);
  return {
    photo: product?.images[0],
    productLabel: product ? `${product.title} · ${formatRand(effectivePrice(product))}` : undefined,
    badge: percent > 0 ? `Up to ${percent}% off` : undefined,
    colors: TONES[def.tone],
    cta: def.cta,
    icon: def.icon as IconName,
    id: def.id,
    subtitle: def.subtitle,
    title: def.title,
  };
});

/**
 * Swipeable promo banners with page dots. Pages snap, the active dot stretches, and the carousel advances by
 * itself every few seconds until the student touches it. Reduce Motion stops the auto-advance.
 */
export function PromoCarousel({
  onPress,
  promos = PROMOS,
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
        <PageDots count={promos.length} label="Show banner" onSelect={go} page={page} />
      </View>
    </View>
  );
}

const PHOTO = 128;

/** Accent colours for the bands on each tone: a lighter step of the banner plus one warm peach stripe. */
const BAND_COLOURS = ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.07)", "rgba(233,196,150,0.20)"] as const;

function Banner({ active, cardWidth, onPress, promo }: { active: boolean; cardWidth: number; onPress: () => void; promo: Promo }) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(active ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  // the product photo floats a little while its banner is in front
  useEffect(() => {
    if (reduced || !active) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 2600, easing: ease.sine }), withTiming(0, { duration: 2600, easing: ease.sine })), -1));
    return () => float.set(0);
  }, [active, float, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + lift.get() * 0.04 }], opacity: 0.8 + lift.get() * 0.2 }));
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (float.get() - 0.5) * 8 }, { rotate: `${(float.get() - 0.5) * 3}deg` }] }));
  return (
    <Pressable accessibilityLabel={`${promo.title}. ${promo.subtitle}`} accessibilityRole="button" onPress={onPress}>
      <Animated.View style={[styles.card, { width: cardWidth }, style]}>
        <LinearGradient colors={promo.colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <Bands colours={BAND_COLOURS} height={188} width={cardWidth} />
        <View style={styles.bubbleBig} />
        <View style={styles.bubbleSmall} />
        <View style={styles.texts}>
          {promo.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{promo.badge}</Text>
            </View>
          ) : null}
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
        {promo.photo ? (
          <Animated.View style={[styles.photoWrap, photoStyle]}>
            <View style={styles.rings}>
              <Rings size={PHOTO + 40} />
            </View>
            <Image accessibilityLabel={promo.productLabel} contentFit="cover" source={promo.photo} style={styles.photo} transition={150} />
            {promo.productLabel ? (
              <View style={styles.tag}>
                <Text numberOfLines={1} style={styles.tagText}>
                  {promo.productLabel}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.iconBadge}>
            <Icon color={color.onPrimary} name={promo.icon} size={34} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", backgroundColor: color.mist, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  bubbleBig: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 100, height: 200, position: "absolute", right: -50, top: -60, width: 200 },
  bubbleSmall: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 30, bottom: -10, height: 60, position: "absolute", right: 70, width: 60 },
  card: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)",
    flexDirection: "row",
    minHeight: 188,
    overflow: "hidden",
    padding: space.lg,
  },
  cta: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.onPrimary, borderRadius: 18, flexDirection: "row", gap: 6, marginTop: space.xs, paddingHorizontal: 14, paddingVertical: 9 },
  ctaText: { color: color.ink, fontSize: 13, fontWeight: "700" },
  dots: { alignItems: "center", marginTop: space.xs },
  iconBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  photo: { borderColor: "#FFFFFF", borderRadius: PHOTO / 2, borderWidth: 4, height: PHOTO, width: PHOTO },
  photoWrap: { alignItems: "center", height: PHOTO + 40, justifyContent: "center", marginRight: -22, width: PHOTO + 40 },
  rings: { left: 0, position: "absolute", top: 0 },
  row: { gap: space.xs, paddingHorizontal: space.lg },
  tag: { alignSelf: "center", backgroundColor: color.mist, borderRadius: 12, bottom: 4, maxWidth: PHOTO + 30, paddingHorizontal: 10, paddingVertical: 4, position: "absolute" },
  tagText: { color: color.ink, fontSize: 11, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 20 },
  texts: { flex: 1, gap: 4, justifyContent: "center", paddingRight: space.xs },
  title: { color: color.onPrimary, fontSize: 24, fontWeight: "800", lineHeight: 29 },
});
