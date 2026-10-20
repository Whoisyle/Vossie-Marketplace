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
import Animated, { FadeInLeft, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

import { Icon, PageDots, type IconName } from "@/components";
import { ProductArt } from "@/components/art/ProductArt";
import { dealFor, effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { promoDefs, promoPercent } from "@/data/promos";
import { getListing } from "@/data/repository";
import { haptic } from "@/lib/haptics";
import { ease, seeded, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

/** The product a banner sells: its name, the price now, the old price and the discount, and which drawing to show. */
export type PromoProduct = { id: string; name: string; priceCents: number; wasCents?: number; percent: number };

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
  /** The product the banner is about; it is drawn large on the right of the banner. */
  product?: PromoProduct;
};

export const PROMO_TONES = {
  ink: gradient.ink,
  orange: ["#EE8F3F", "#B9531F"],
  primary: gradient.primary,
  teal: gradient.teal,
  warm: ["#DDA46A", "#A8692F"],
} as const;

/** What a banner says about a listing: the name, the price now and, with a deal, the old price and the percentage. */
export function promoProductFor(listingId: string): PromoProduct | undefined {
  const listing = getListing(listingId);
  if (!listing) return undefined;
  const percent = dealFor(listing.id);
  return { id: listing.id, name: listing.title, percent, priceCents: effectivePrice(listing), wasCents: percent > 0 ? listing.priceCents : undefined };
}

/** The campus promotion banners: each opens a store or category page with its deals first. */
export const PROMOS: Promo[] = promoDefs.map((def) => {
  const percent = promoPercent(def);
  return {
    badge: percent > 0 ? `Up to ${percent}% off` : undefined,
    colors: PROMO_TONES[def.tone],
    cta: def.cta,
    icon: def.icon as IconName,
    id: def.id,
    product: promoProductFor(def.productId),
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

const BANNER_HEIGHT = 196;

/**
 * The layered backdrop of a banner: a dotted texture, soft diagonal bands and a glow behind the product, all inside
 * the banner's own colour. Two large shapes drift slowly across it.
 */
function BannerBackdrop({ active, width }: { active: boolean; width: number }) {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced || !active) return;
    drift.set(withRepeat(withSequence(withTiming(1, { duration: 6200, easing: ease.sine }), withTiming(0, { duration: 6200, easing: ease.sine })), -1));
    return () => drift.set(0);
  }, [active, drift, reduced]);
  const one = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.get() - 0.5) * 22 }, { translateY: (drift.get() - 0.5) * -12 }] }));
  const two = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.get() - 0.5) * -18 }, { translateY: (drift.get() - 0.5) * 14 }] }));
  const dots = Array.from({ length: 34 }, (_, i) => ({ r: 1.2 + seeded(i + 5) * 1.6, x: seeded(i) * width, y: seeded(i + 40) * BANNER_HEIGHT }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height={BANNER_HEIGHT} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <RadialGradient cx={width * 0.76} cy={BANNER_HEIGHT * 0.56} gradientUnits="userSpaceOnUse" id="glow" r={width * 0.42}>
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Polygon fill="rgba(255,255,255,0.07)" points={`${width * 0.38},0 ${width * 0.56},0 ${width * 0.34},${BANNER_HEIGHT} ${width * 0.16},${BANNER_HEIGHT}`} />
        <Polygon fill="rgba(255,255,255,0.05)" points={`${width * 0.6},0 ${width * 0.7},0 ${width * 0.48},${BANNER_HEIGHT} ${width * 0.38},${BANNER_HEIGHT}`} />
        {dots.map((dot, i) => (
          <Circle cx={dot.x} cy={dot.y} fill="rgba(255,255,255,0.22)" key={i} r={dot.r} />
        ))}
        <Rect fill="url(#glow)" height={BANNER_HEIGHT} width={width} x={0} y={0} />
      </Svg>
      <Animated.View style={[styles.blobOne, one]} />
      <Animated.View style={[styles.blobTwo, two]} />
    </View>
  );
}

function Banner({ active, cardWidth, onPress, promo }: { active: boolean; cardWidth: number; onPress: () => void; promo: Promo }) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(active ? 1 : 0);
  const float = useSharedValue(0);
  const pop = useSharedValue(0);
  const shine = useSharedValue(0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  // while a banner is in front: the product floats, the badge pulses and a light sweeps across once
  useEffect(() => {
    if (reduced || !active) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 2600, easing: ease.sine }), withTiming(0, { duration: 2600, easing: ease.sine })), -1));
    pop.set(withDelay(400, withRepeat(withSequence(withSpring(1, spring.bouncy), withTiming(0, { duration: 900 })), -1)));
    shine.set(0);
    shine.set(withDelay(500, withTiming(1, { duration: 1300, easing: ease.out })));
    return () => {
      float.set(0);
      pop.set(0);
    };
  }, [active, float, pop, reduced, shine]);
  const style = useAnimatedStyle(() => ({ opacity: 0.8 + lift.get() * 0.2, transform: [{ scale: 0.96 + lift.get() * 0.04 }] }));
  const artStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (float.get() - 0.5) * 10 }, { rotate: `${-8 + (float.get() - 0.5) * 4}deg` }, { scale: 1 + lift.get() * 0.04 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: "-10deg" }, { scale: 1 + pop.get() * 0.12 }] }));
  const shineStyle = useAnimatedStyle(() => ({ opacity: shine.get() > 0 && shine.get() < 1 ? 1 : 0, transform: [{ translateX: -140 + shine.get() * (cardWidth + 280) }, { rotate: "16deg" }] }));
  const product = promo.product;
  const art = Math.min(230, cardWidth * 0.66);
  return (
    <Pressable accessibilityLabel={`${promo.title}. ${product ? `${product.name}, ${formatRand(product.priceCents)}${product.percent ? `, ${product.percent} percent off` : ""}. ` : ""}${promo.subtitle}`} accessibilityRole="button" onPress={onPress}>
      <Animated.View style={[styles.card, { width: cardWidth }, style]}>
        <LinearGradient colors={promo.colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <BannerBackdrop active={active} width={cardWidth} />
        {product ? (
          <Animated.View pointerEvents="none" style={[styles.art, { height: art, right: -art * 0.1, top: BANNER_HEIGHT - art * 0.92, width: art }, artStyle]}>
            <ProductArt id={product.id} size={art} />
          </Animated.View>
        ) : (
          <View style={styles.iconBadge}>
            <Icon color={color.onPrimary} name={promo.icon} size={34} />
          </View>
        )}
        <View style={styles.texts}>
          <Animated.Text entering={reduced ? undefined : FadeInLeft.duration(380)} key={`t${active}`} numberOfLines={2} style={styles.title}>
            {promo.title}
          </Animated.Text>
          {product ? (
            <Animated.View entering={reduced ? undefined : FadeInLeft.delay(80).duration(380)} key={`p${active}`} style={styles.product}>
              <Text numberOfLines={1} style={styles.productName}>
                {product.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatRand(product.priceCents)}</Text>
                {product.wasCents ? <Text style={styles.was}>{formatRand(product.wasCents)}</Text> : null}
              </View>
            </Animated.View>
          ) : (
            <Text numberOfLines={2} style={styles.subtitle}>
              {promo.subtitle}
            </Text>
          )}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{promo.cta}</Text>
            <Icon color={color.ink} name="arrow-right" size={14} />
          </View>
        </View>
        {product && product.percent > 0 ? (
          <Animated.View style={[styles.discount, badgeStyle]}>
            <Text style={styles.discountValue}>-{product.percent}%</Text>
            <Text style={styles.discountLabel}>OFF</Text>
          </Animated.View>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
          <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: { position: "absolute" },
  blobOne: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 120, height: 220, position: "absolute", right: -70, top: -90, width: 220 },
  blobTwo: { backgroundColor: "rgba(0,0,0,0.10)", borderRadius: 70, bottom: -50, height: 140, left: -40, position: "absolute", width: 140 },
  card: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)",
    height: BANNER_HEIGHT,
    overflow: "hidden",
    padding: space.lg,
  },
  cta: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.onPrimary, borderRadius: 18, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  ctaText: { color: color.ink, fontSize: 13, fontWeight: "700" },
  discount: { alignItems: "center", backgroundColor: "#FFE14A", borderRadius: 34, boxShadow: "0 4px 10px rgba(0,0,0,0.25)", height: 62, justifyContent: "center", position: "absolute", right: space.lg, top: space.md, width: 62 },
  discountLabel: { color: "#1F2F39", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: -2 },
  discountValue: { color: "#1F2F39", fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  dots: { alignItems: "center", marginTop: space.xs },
  iconBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 36, height: 72, justifyContent: "center", position: "absolute", right: space.lg, top: 60, width: 72 },
  price: { color: color.onPrimary, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  priceRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  product: { gap: 0 },
  productName: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "700" },
  row: { gap: space.xs, paddingHorizontal: space.lg },
  shine: { bottom: -20, left: 0, position: "absolute", top: -20, width: 100 },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 20 },
  texts: { flex: 1, gap: 4, justifyContent: "space-between", maxWidth: "62%" },
  title: { color: color.onPrimary, fontSize: 21, fontWeight: "800", lineHeight: 25 },
  was: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600", textDecorationLine: "line-through" },
});
