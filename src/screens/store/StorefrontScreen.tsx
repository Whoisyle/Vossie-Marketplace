import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  ListingCard,
  Screen,
  SegmentedTabs,
  StarRating,
} from "@/components";
import { shortDate, formatRand } from "@/data/format";
import { getCampusName, getListings, getSeller } from "@/data/repository";
import type { Listing } from "@/data/types";
import { useDetail } from "@/lib/paths";
import { PromoCarousel, type Promo } from "@/screens/home/PromoCarousel";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, gradient, size, space, text } from "@/theme/tokens";

type Tab = "menu" | "specials" | "services" | "reviews";

/** A store's page: who they are, their promos, specials, menu or listings, services and reviews. */
export function StorefrontScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const open = useDetail();
  const { width } = useWindowDimensions();
  const { dispatch, state } = useDemoStore();
  const seller = getSeller(id);
  const [tab, setTab] = useState<Tab>("menu");

  const all = useMemo(() => (seller ? getListings({ sellerId: seller.id }) : []), [seller]);
  const goods = all.filter((listing) => listing.categoryId !== "services");
  const services = all.filter((listing) => listing.categoryId === "services");
  const specials = useMemo(() => all.filter((listing) => listing.popular || listing.rating >= 4.8), [all]);
  const reviews = useMemo(() => state.reviews.filter((review) => review.sellerId === id), [id, state.reviews]);
  const isFood = goods.length > 0 && goods.every((listing) => listing.categoryId === "food");

  if (!seller) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back" icon="alert-circle" onAction={() => router.back()} title="Store not found" />
      </Screen>
    );
  }

  const following = state.following.includes(seller.id);
  const tabs: { key: Tab; label: string; count?: number }[] = [
    ...(goods.length ? [{ count: goods.length, key: "menu" as const, label: isFood ? "Menu" : "Listings" }] : []),
    ...(specials.length ? [{ key: "specials" as const, label: "Specials" }] : []),
    ...(services.length ? [{ count: services.length, key: "services" as const, label: "Services" }] : []),
    { count: reviews.length, key: "reviews" as const, label: "Reviews" },
  ];
  const active = tabs.some((item) => item.key === tab) ? tab : tabs[0]!.key;
  const promo: Promo = {
    colors: gradient.teal,
    cta: "Shop now",
    icon: "gift",
    id: `store-${seller.id}`,
    placeholder: true,
    subtitle: "Store promotions will appear here",
    title: `${seller.name} specials`,
  };

  const message = () => {
    dispatch({ conversationId: `seller-${seller.id}`, name: seller.name, type: "openConversation" });
    router.push(`/account/inbox/seller-${seller.id}` as Href);
  };

  const grid = (items: Listing[]) => {
    const rows: Listing[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return (
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <Animated.View entering={FadeInDown.delay(rowIndex * 60).duration(300)} key={pair.map((l) => l.id).join("-")} style={styles.gridRow}>
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
    <Screen testID="storefront">
      <AppHeader back />
      <View style={styles.cover}>
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.coverBubbleA} />
        <View style={styles.coverBubbleB} />
        <View style={styles.coverRow}>
          <View style={styles.avatarRing}>
            <Avatar name={seller.name} size={64} />
          </View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.name}>
              {seller.name}
            </Text>
            <View style={styles.locationRow}>
              <Icon color={color.mist} name="map-pin" size={12} />
              <Text numberOfLines={1} style={styles.location}>
                {getCampusName(seller.campusId)} · {seller.location}
              </Text>
            </View>
          </View>
        </View>
        <Pressable accessibilityLabel={`${seller.rating} stars, ${seller.ratingCount} reviews. Show reviews`} accessibilityRole="button" onPress={() => setTab("reviews")} style={styles.coverStats}>
          <StarRating size={14} value={seller.rating} />
          <Text style={styles.statText}>
            {seller.rating.toFixed(1)} · {seller.ratingCount} reviews · {seller.followers.toLocaleString("en-ZA")} followers
          </Text>
        </Pressable>
      </View>

      <Text style={[text.bodySmall, styles.bio]}>{seller.bio}</Text>

      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            fullWidth
            icon={following ? "check" : "plus"}
            label={following ? "Following" : "Follow"}
            onPress={() => dispatch({ sellerId: seller.id, type: "toggleFollow" })}
            variant={following ? "outline" : "primary"}
          />
        </View>
        <View style={styles.flex}>
          <Button fullWidth icon="message-circle" label="Message" onPress={message} variant="soft" />
        </View>
      </View>

      <View style={styles.promo}>
        <PromoCarousel promos={[promo]} width={Math.min(width, size.contentMax + space.xl * 2)} />
      </View>

      <SegmentedTabs onChange={setTab} options={tabs} value={active} />

      {active === "menu" ? grid(goods) : null}
      {active === "specials" ? grid(specials) : null}
      {active === "services" ? (
        <View style={styles.serviceList}>
          {services.map((service) => (
            <Card key={service.id} onPress={() => router.push(open("listing", service.id))} variant="row">
              <View style={styles.serviceRow}>
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{service.title}</Text>
                  <Text numberOfLines={2} style={text.caption}>
                    {service.description}
                  </Text>
                </View>
                <Text style={styles.price}>{formatRand(service.priceCents)}</Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
      {active === "reviews" ? (
        reviews.length === 0 ? (
          <Text style={[text.bodySmall, styles.empty]}>No reviews for this store yet.</Text>
        ) : (
          <View style={styles.serviceList}>
            {reviews.map((review) => (
              <Card key={review.id}>
                <View style={styles.serviceRow}>
                  <Text style={text.cardTitle}>{review.author}</Text>
                  <StarRating size={12} value={review.rating} />
                </View>
                {review.body ? <Text style={text.bodySmall}>{review.body}</Text> : null}
                <Text style={text.caption}>{shortDate(review.createdAt)}</Text>
              </Card>
            ))}
          </View>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  avatarRing: { borderColor: color.mist, borderRadius: 36, borderWidth: 2, padding: 2 },
  bio: { marginTop: space.sm },
  cover: { borderCurve: "continuous", borderRadius: corner.xl, gap: space.sm, marginTop: space.xs, overflow: "hidden", padding: space.md },
  coverBubbleA: { backgroundColor: "rgba(183,196,204,0.12)", borderRadius: 80, height: 160, position: "absolute", right: -40, top: -50, width: 160 },
  coverBubbleB: { backgroundColor: "rgba(183,196,204,0.08)", borderRadius: 40, bottom: -20, height: 80, position: "absolute", right: 80, width: 80 },
  coverRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  coverStats: { alignItems: "center", flexDirection: "row", gap: space.xs },
  empty: { marginTop: space.md, textAlign: "center" },
  flex: { flex: 1 },
  grid: { gap: space.xs },
  gridRow: { flexDirection: "row", gap: space.xs },
  location: { color: color.mist, flex: 1, fontSize: 12 },
  locationRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  name: { color: color.onPrimary, fontSize: 22, fontWeight: "800" },
  price: { color: color.accent, fontSize: 15, fontWeight: "700" },
  promo: { marginTop: space.md },
  serviceList: { gap: space.xs },
  serviceRow: { alignItems: "center", flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
  statText: { color: color.mist, fontSize: 12 },
});
