import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components";
import { ProductArt } from "@/components/art/ProductArt";
import { formatRand } from "@/data/format";
import { promoPhotoFlip, promoPhotoFocus, promoPhotos } from "@/data/mock/promoPhotos";
import { color, corner, space } from "@/theme/tokens";

import { PROMOS, type Promo } from "./PromoCarousel";

export const HERO_HEIGHT = 172;
/** How long each promo stays before the next one fades in. */
export const HERO_HOLD_MS = 5_500;
const FADE_MS = 650;

/**
 * The banner on the teal Home header: one promo at a time that fades away while the next fades in. Tapping it
 * opens the promo. Reduce Motion keeps the swap but drops the fade, and the dots jump to a promo.
 */
export function HomeHero({ onPress, promos = PROMOS }: { onPress: (promo: Promo) => void; promos?: Promo[] }) {
  const reduced = useReducedMotion();
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (promos.length < 2) return;
    const timer = setInterval(() => setPage((current) => (current + 1) % promos.length), HERO_HOLD_MS);
    return () => clearInterval(timer);
  }, [promos.length, page]);

  const promo = promos[page] ?? promos[0];
  if (!promo) return null;
  const product = promo.product;
  const photo = product ? promoPhotos[product.id] : undefined;

  return (
    <View>
      <View style={styles.stage} testID="home-hero">
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(FADE_MS)}
          exiting={reduced ? undefined : FadeOut.duration(FADE_MS)}
          key={promo.id}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            accessibilityLabel={`${promo.title}. ${product ? `${product.name}, ${formatRand(product.priceCents)}. ` : ""}${promo.subtitle}`}
            accessibilityRole="button"
            onPress={() => onPress(promo)}
            style={styles.slide}
          >
            <View style={styles.texts}>
              <Text numberOfLines={3} style={styles.title}>
                {promo.title}
              </Text>
              <Text numberOfLines={2} style={styles.subtitle}>
                {promo.subtitle}
              </Text>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{promo.cta}</Text>
              </View>
            </View>
            <View style={styles.art}>
              {photo ? (
                <View style={[styles.photoFrame, product && promoPhotoFlip[product.id] ? styles.flipped : null]}>
                  <Image
                    accessibilityLabel={product?.name}
                    contentFit="cover"
                    contentPosition={product ? promoPhotoFocus[product.id] : undefined}
                    source={photo}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              ) : product ? (
                <ProductArt id={product.id} size={150} />
              ) : (
                <View style={styles.iconBadge}>
                  <Icon color={color.onPrimary} name={promo.icon} size={40} />
                </View>
              )}
              {product && product.percent > 0 ? (
                <View style={styles.discount}>
                  <Text style={styles.discountValue}>-{product.percent}%</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </View>
      {promos.length > 1 ? (
        <View accessibilityRole="tablist" style={styles.dots}>
          {promos.map((item, index) => (
            <Pressable
              accessibilityLabel={`Show banner ${index + 1} of ${promos.length}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === page }}
              hitSlop={8}
              key={item.id}
              onPress={() => setPage(index)}
              style={[styles.dot, index === page && styles.dotOn]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: "center", height: HERO_HEIGHT - 8, justifyContent: "center", width: "42%" },
  cta: { alignSelf: "flex-start", backgroundColor: color.onPrimary, borderRadius: corner.pill, marginTop: space.xxs, paddingHorizontal: 18, paddingVertical: 9 },
  ctaText: { color: color.accent, fontSize: 14, fontWeight: "700" },
  discount: {
    alignItems: "center",
    backgroundColor: "#FFE14A",
    borderRadius: 26,
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
    height: 52,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    top: 2,
    width: 52,
  },
  discountValue: { color: "#1F2F39", fontSize: 15, fontWeight: "900" },
  dot: { backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 4, height: 8, width: 8 },
  dotOn: { backgroundColor: color.onPrimary, width: 22 },
  dots: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: space.xs },
  flipped: { transform: [{ scaleX: -1 }] },
  iconBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 48, height: 96, justifyContent: "center", width: 96 },
  photoFrame: { borderRadius: 22, height: "100%", overflow: "hidden", width: "100%" },
  slide: { alignItems: "center", flexDirection: "row", gap: space.sm, height: HERO_HEIGHT - 8 },
  stage: { height: HERO_HEIGHT - 8 },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: 12.5, lineHeight: 17 },
  texts: { flex: 1, gap: 6 },
  title: { color: color.onPrimary, fontSize: 24, fontWeight: "900", letterSpacing: -0.4, lineHeight: 28 },
});
