import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  Avatar,
  HeartButton,
  Icon,
  Media,
  PageDots,
  StarRating,
} from "@/components";
import { dealFor, effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { getCampusName } from "@/data/repository";
import type { Listing, Seller } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { duration, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

/** How long each card stays before the carousel moves on by itself, and how long it waits after a touch. */
export const AUTO_ADVANCE_MS = 3800;
export const RESUME_AFTER_TOUCH_MS = 6000;

/**
 * Big swipeable cards for the best-rated listings. Snaps to each card; the active card sits slightly forward.
 * It moves on by itself every few seconds, stops while a finger is on it, and does not auto-move with Reduce Motion.
 */
export function FeaturedCarousel({
  favourites,
  listings,
  onOpen,
  onToggleFavourite,
  width,
  autoPlay = true,
}: {
  /** Moves on by itself; turn off where a still carousel is better. */
  autoPlay?: boolean;
  listings: Listing[];
  favourites: string[];
  width: number;
  onOpen: (listing: Listing) => void;
  onToggleFavourite: (listing: Listing) => void;
}) {
  const cardWidth = Math.min(width * 0.72, 300);
  const snap = cardWidth + space.xs;
  const [page, setPage] = useState(0);
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const pausedUntil = useRef(0);
  useEffect(() => {
    pageRef.current = page;
  });

  useEffect(() => {
    if (!autoPlay || reduced || listings.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const next = (pageRef.current + 1) % listings.length;
      scroller.current?.scrollTo({ animated: true, x: next * snap });
      setPage(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, listings.length, reduced, snap]);

  const go = (next: number) => {
    scroller.current?.scrollTo({ animated: true, x: next * snap });
    setPage(next);
  };

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / snap);
    if (next !== page) haptic.select();
    setPage(next);
  };

  return (
    <View>
      <ScrollView
        contentContainerStyle={styles.featuredRow}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={onEnd}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + RESUME_AFTER_TOUCH_MS;
        }}
        ref={scroller}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        style={styles.bleed}
        testID="featured-carousel"
      >
        {listings.map((listing, index) => (
          <FeaturedCard
            active={index === page}
            cardWidth={cardWidth}
            favourite={favourites.includes(listing.id)}
            key={listing.id}
            listing={listing}
            onOpen={() => onOpen(listing)}
            onToggleFavourite={() => onToggleFavourite(listing)}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        <PageDots count={listings.length} onSelect={go} page={page} />
      </View>
    </View>
  );
}

function FeaturedCard({
  active,
  cardWidth,
  favourite,
  listing,
  onOpen,
  onToggleFavourite,
}: {
  active: boolean;
  cardWidth: number;
  favourite: boolean;
  listing: Listing;
  onOpen: () => void;
  onToggleFavourite: () => void;
}) {
  const lift = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.85 + lift.get() * 0.15,
    transform: [{ scale: 0.95 + lift.get() * 0.05 }],
  }));
  return (
    <View style={{ width: cardWidth }}>
      <Pressable
        accessibilityLabel={`${listing.title}, ${formatRand(effectivePrice(listing))}, ${listing.rating} stars`}
        accessibilityRole="button"
        onPress={onOpen}
      >
        <Animated.View style={[styles.featured, { width: cardWidth }, style]}>
          <Media
            radius={0}
            source={listing.images[0]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(30,42,56,0)", "rgba(30,42,56,0.82)"]}
            pointerEvents="none"
            style={styles.featuredShade}
          />
          <View style={styles.featuredTag}>
            <Icon color={color.ink} name="award" size={12} />
            <Text style={styles.featuredTagText}>
              {dealFor(listing.id) > 0
                ? `-${dealFor(listing.id)}% deal`
                : "Featured"}
            </Text>
          </View>
          <View style={styles.featuredInfo}>
            <Text numberOfLines={1} style={styles.featuredTitle}>
              {listing.title}
            </Text>
            <View style={styles.featuredMeta}>
              <StarRating size={12} value={listing.rating} />
              <Text style={styles.featuredMetaText}>
                {listing.rating.toFixed(1)}
              </Text>
              {dealFor(listing.id) > 0 ? (
                <Text style={styles.featuredWas}>
                  {formatRand(listing.priceCents)}
                </Text>
              ) : null}
              <Text style={styles.featuredPrice}>
                {formatRand(effectivePrice(listing))}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
      {/* a sibling of the card, not a child, so a web page never has a button inside a button */}
      <View style={styles.featuredHeart}>
        <HeartButton
          active={favourite}
          onPress={onToggleFavourite}
          testID={`favourite-${listing.id}`}
        />
      </View>
    </View>
  );
}

/** A store card for "Top stores near you". */
export function StoreCard({
  following,
  onFollow,
  onOpen,
  seller,
}: {
  seller: Seller;
  following: boolean;
  onOpen: () => void;
  onFollow: () => void;
}) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.04 }],
  }));
  return (
    <Animated.View style={[styles.store, style]}>
      <LinearGradient colors={gradient.soft} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      {/* the card opens the store; Follow is a sibling button, not a child, so a web page never has a button inside a button */}
      <Pressable
        accessibilityLabel={`${seller.name}, ${seller.rating} stars, ${getCampusName(seller.campusId)}`}
        accessibilityRole="button"
        onPress={onOpen}
        onPressIn={() => press.set(withTiming(1, { duration: 80 }))}
        onPressOut={() => press.set(withTiming(0, { duration: duration.base }))}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.storeBody}>
        <Avatar name={seller.name} size={52} />
        <Text numberOfLines={1} style={styles.storeName}>
          {seller.name}
        </Text>
        <View style={styles.storeMeta}>
          <Icon color="#E8A317" name="star" size={12} />
          <Text style={styles.storeMetaText}>
            {seller.rating.toFixed(1)} ({seller.ratingCount})
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.storeLocation}>
          {seller.location}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={following ? `Unfollow ${seller.name}` : `Follow ${seller.name}`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => {
          haptic.tap();
          onFollow();
        }}
        style={[styles.follow, following && styles.following]}
      >
        <Text style={[styles.followText, following && styles.followingText]}>{following ? "Following" : "Follow"}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg },
  dots: { alignItems: "center", marginTop: space.xs },
  featured: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 22px rgba(30, 42, 56, 0.2)",
    height: 210,
    overflow: "hidden",
  },
  featuredHeart: { position: "absolute", right: 6, top: 6 },
  featuredInfo: {
    bottom: 0,
    gap: 4,
    left: 0,
    padding: space.sm,
    position: "absolute",
    right: 0,
  },
  featuredMeta: { alignItems: "center", flexDirection: "row", gap: 6 },
  featuredMetaText: {
    color: color.onPrimary,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  featuredPrice: { color: color.onPrimary, fontSize: 15, fontWeight: "800" },
  featuredWas: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  featuredRow: { gap: space.xs, paddingHorizontal: space.lg },
  featuredShade: {
    bottom: 0,
    height: 110,
    left: 0,
    position: "absolute",
    right: 0,
  },
  featuredTag: {
    alignItems: "center",
    backgroundColor: color.mist,
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    top: 10,
  },
  featuredTagText: { color: color.ink, fontSize: 11, fontWeight: "700" },
  featuredTitle: { color: color.onPrimary, fontSize: 17, fontWeight: "800" },
  follow: {
    alignItems: "center",
    backgroundColor: color.primary,
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 28,
    paddingHorizontal: 14,
  },
  followText: { color: color.onPrimary, fontSize: 12, fontWeight: "700" },
  following: {
    backgroundColor: "transparent",
    borderColor: color.borderStrong,
    borderWidth: 1,
  },
  followingText: { color: color.heading },
  store: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: corner.lg,
    boxShadow:
      "5px 5px 12px rgba(30, 42, 56, 0.09), -4px -4px 10px rgba(255, 255, 255, 0.9)",
    gap: 3,
    overflow: "hidden",
    padding: space.sm,
    width: 140,
  },
  storeBody: { alignItems: "center", gap: 3 },
  storeLocation: { color: color.textMuted, fontSize: 11, maxWidth: 120 },
  storeMeta: { alignItems: "center", flexDirection: "row", gap: 3 },
  storeMetaText: { color: color.textSecondary, fontSize: 12 },
  storeName: {
    color: color.heading,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 120,
  },
});
