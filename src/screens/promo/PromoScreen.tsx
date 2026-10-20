import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppHeader, Button, EmptyState, Icon, ListingCard, Screen, SectionHeader, type IconName } from "@/components";
import { dealFor } from "@/data/deals";
import { hideBlocked } from "@/data/phase4";
import { getPromo, promoListings, promoPercent, promoTargetName } from "@/data/promos";
import { getCategory } from "@/data/repository";
import type { Listing } from "@/data/types";
import { useDetail } from "@/lib/paths";
import { PROMO_TONES } from "@/screens/home/PromoCarousel";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";


/**
 * A promotion's page: the banner, then the discounted listings first (biggest discount at the top), then
 * the rest of the store's or category's listings. Opened from any promo banner.
 */
export function PromoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const open = useDetail();
  const { dispatch, state } = useDemoStore();
  const promo = getPromo(id);
  const { deals, others } = useMemo(() => {
    const found = promo ? promoListings(promo) : { deals: [], others: [] };
    return { deals: hideBlocked(found.deals, state.blocked), others: hideBlocked(found.others, state.blocked) };
  }, [promo, state.blocked]);

  if (!promo) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back to Home" icon="percent" onAction={() => router.replace("/home")} title="Promotion not found" />
      </Screen>
    );
  }

  const percent = promoPercent(promo);
  const name = promoTargetName(promo);
  const category = promo.target.kind === "category" ? getCategory(promo.target.id) : undefined;
  const label = promo.target.kind === "store" ? `More from ${name}` : `More in ${category?.name ?? "this category"}`;

  const grid = (items: Listing[]) => {
    const rows: Listing[][] = [];
    for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));
    return (
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <Animated.View entering={FadeInDown.delay(Math.min(rowIndex, 4) * 55).duration(300)} key={pair.map((item) => item.id).join("-")} style={styles.row}>
            {pair.map((listing) => (
              <ListingCard
                favourite={state.favourites.includes(listing.id)}
                key={listing.id}
                listing={listing}
                onPress={() => router.push(open("listing", listing.id))}
                onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
              />
            ))}
            {pair.length === 1 ? <View style={styles.flex} /> : null}
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <Screen testID="promo-screen">
      <AppHeader back />
      <View style={styles.hero}>
        <LinearGradient colors={PROMO_TONES[promo.tone]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bubble} />
        <View style={styles.heroText}>
          {percent > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Up to {percent}% off</Text>
            </View>
          ) : null}
          <Text accessibilityRole="header" style={styles.title}>
            {promo.title}
          </Text>
          <Text style={styles.subtitle}>{promo.subtitle}</Text>
          {promo.target.kind === "store" ? (
            <Button
              icon="shopping-bag"
              label="Visit the store"
              onPress={() => router.push(open("store", (promo.target as { id: string }).id))}
              size="sm"
              variant="light"
            />
          ) : null}
        </View>
        <View style={styles.iconBadge}>
          <Icon color={color.onPrimary} name={promo.icon as IconName} size={34} />
        </View>
      </View>

      {deals.length > 0 ? (
        <Fragment>
          <View style={styles.section}>
            <SectionHeader title={`On promotion (${deals.length})`} />
            {grid(deals)}
          </View>
        </Fragment>
      ) : (
        <Text style={[text.bodySmall, styles.none]}>No discounts on right now, but everything from {name} is below.</Text>
      )}

      {others.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={label} />
          {grid(others)}
        </View>
      ) : null}
    </Screen>
  );
}

/** Highest discount among a list of listings; exported for tests. */
export function bestDeal(listings: Listing[]): number {
  return Math.max(0, ...listings.map((listing) => dealFor(listing.id)));
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", backgroundColor: color.mist, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  bubble: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 110, height: 220, position: "absolute", right: -60, top: -70, width: 220 },
  flex: { flex: 1 },
  grid: { gap: space.xs, paddingTop: space.xs },
  hero: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)",
    flexDirection: "row",
    marginTop: space.sm,
    minHeight: 190,
    overflow: "hidden",
    padding: space.lg,
  },
  heroText: { flex: 1, gap: 6, paddingRight: space.sm },
  iconBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  none: { marginTop: space.md },
  row: { flexDirection: "row", gap: space.xs },
  section: { marginTop: space.md },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  title: { color: color.onPrimary, fontSize: 26, fontWeight: "800", lineHeight: 31 },
});
