import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar, Button, Card, Icon, ListingCard, Screen, SegmentedTabs, StarRating, useToast } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import { formatRand, relativeTime } from "@/data/format";
import { START_POINT } from "@/seller/places";
import { promotionState } from "@/seller/promotions";
import { activeListings } from "@/seller/selectors";
import { averageRating } from "@/seller/state";
import type { SellerListing } from "@/seller/types";
import type { Listing } from "@/data/types";
import { PromoCarousel, type Promo } from "@/screens/home/PromoCarousel";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, gradient, size, space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { ShareStoreSheet } from "./ShareStore";

type Tab = "menu" | "specials" | "services" | "reviews";

/** A seller listing dressed as the buyer's own listing type, so the buyer's cards can draw it. */
function asListing(item: SellerListing, storeId: string): Listing {
  const category = item.category === "services" ? "services" : item.category === "food" ? "food" : item.category === "books" ? "study" : item.category === "fashion" ? "fashion" : "tech";
  return {
    campusId: "potchefstroom",
    categoryId: category as Listing["categoryId"],
    createdDaysAgo: 3,
    description: item.description,
    id: item.id,
    images: item.photos.length > 0 ? item.photos : item.artId ? [`art:${item.artId}`] : [],
    location: "",
    openHours: "",
    options: [],
    pickupTime: "Today",
    popular: item.onHand > 0 && item.onHand <= 5,
    priceCents: item.priceCents,
    rating: 4.8,
    ratingCount: 12,
    sellerId: storeId,
    title: item.title,
  };
}

/**
 * The store exactly as a buyer sees it: the same cover, rating line, map, follow and message buttons, offer banner,
 * tabs and cards as the buyer's store page, filled in from this seller's own store. Nothing here can be tapped by a buyer
 * yet; the buttons say so.
 */
export function SellerStorefrontPreview() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const view = useSeller();
  const { state } = useDemoStore();
  const [tab, setTab] = useState<Tab>("menu");
  const [sharing, setSharing] = useState(false);
  const [now] = useState(() => new Date());
  const profile = view.seller.profile;
  const followers = state.following.includes(profile.storeId || "campusbites") ? 1 : 0;
  const storeId = profile.storeId || "campusbites";
  const live = activeListings(view.seller.listings);
  const goods = useMemo(() => live.filter((item) => item.category !== "services").map((item) => asListing(item, storeId)), [live, storeId]);
  const services = useMemo(() => live.filter((item) => item.category === "services").map((item) => asListing(item, storeId)), [live, storeId]);
  const specials = useMemo(() => goods.filter((item) => item.popular || item.priceCents >= 30_000), [goods]);
  const reviews = view.seller.reviews;
  const rating = averageRating(view.seller.reviewCounts);
  const total = view.seller.reviewCounts.reduce((a, b) => a + b, 0);
  const offers = view.seller.promotions.filter((item) => promotionState(item, now) === "active");
  const isFood = goods.length > 0 && goods.every((item) => item.categoryId === "food");
  const place = profile.place;
  const point = place ? { latitude: place.latitude, longitude: place.longitude } : START_POINT;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    ...(goods.length ? [{ count: goods.length, key: "menu" as const, label: isFood ? "Menu" : "Listings" }] : []),
    ...(specials.length ? [{ key: "specials" as const, label: "Specials" }] : []),
    ...(services.length ? [{ count: services.length, key: "services" as const, label: "Services" }] : []),
    { count: reviews.length, key: "reviews" as const, label: "Reviews" },
  ];
  const active = tabs.some((item) => item.key === tab) ? tab : tabs[0]!.key;
  const promo: Promo | null = offers[0]
    ? { badge: offers[0].title, colors: gradient.teal, cta: "See the deals", icon: "percent", id: `preview-${offers[0].id}`, subtitle: offers[0].detail, title: `${view.storeName} deals` }
    : null;

  const grid = (items: Listing[]) => {
    const rows: Listing[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return (
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <Animated.View entering={FadeInDown.delay(rowIndex * 60).duration(300)} key={pair.map((l) => l.id).join("-")} style={styles.gridRow}>
            {pair.map((listing) => (
              <View key={listing.id} style={styles.flex} testID={`preview-${listing.id}`}>
                <ListingCard favourite={false} listing={listing} onPress={() => router.push(`/seller/products/${listing.id}` as Href)} onToggleFavourite={() => toast.show("Buyers can save this to their favourites")} />
              </View>
            ))}
            {pair.length === 1 ? <View style={styles.flex} /> : null}
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <Button fullWidth icon="edit-2" label="Edit store" onPress={() => router.push("/seller/account/store" as Href)} testID="edit-store" variant="outline" />
          </View>
          <View style={styles.flex}>
            <Button fullWidth icon="share-2" label="Share store" onPress={() => setSharing(true)} testID="share-store" />
          </View>
        </View>
      }
      testID="seller-store-preview"
    >
      <View style={styles.ribbon}>
        <Button icon="arrow-left" label="" onPress={() => router.back()} size="sm" variant="soft" />
        <View style={styles.flex}>
          <Text style={text.cardTitle}>Store preview</Text>
          <Text style={text.caption}>How buyers see you</Text>
        </View>
      </View>

      <View style={styles.cover} testID="preview-banner">
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        {profile.bannerUri ? (
          <>
            <Image accessibilityLabel="Store banner" contentFit="cover" source={{ uri: profile.bannerUri }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={["rgba(20,31,41,0.1)", "rgba(20,31,41,0.85)"]} style={StyleSheet.absoluteFill} />
          </>
        ) : (
          <>
            <View style={styles.coverBubbleA} />
            <View style={styles.coverBubbleB} />
          </>
        )}
        <View style={styles.coverRow}>
          <View style={styles.avatarRing}>{profile.logoUri ? <Image contentFit="cover" source={{ uri: profile.logoUri }} style={styles.logo} /> : <Avatar name={view.storeName} size={64} />}</View>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={[styles.name, styles.nameShrink]}>
                {view.storeName}
              </Text>
              {view.canTrade ? (
                <View style={styles.verified} testID="verified-badge">
                  <Icon color={color.ink} name="check-circle" size={11} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.locationRow}>
              <Icon color={color.mist} name="map-pin" size={12} />
              <Text numberOfLines={1} style={styles.location}>
                Potchefstroom · {place ? place.name : "Set your pickup place"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.coverStats}>
          <StarRating size={14} value={rating} />
          <Text style={styles.statText}>
            {rating.toFixed(1)} · {total} reviews · {followers} {followers === 1 ? "follower" : "followers"}
          </Text>
        </View>
      </View>

      {profile.description ? <Text style={[text.bodySmall, styles.bio]}>{profile.description}</Text> : null}

      <View accessibilityLabel={`Where to find ${view.storeName}`} style={styles.findUs}>
        <VossieMap accessibilityLabel={`Map showing ${view.storeName}`} initialRegion={{ ...point, latitudeDelta: 0.004, longitudeDelta: 0.004 }} interactive={false} markers={[{ coordinate: point, id: "store", kind: "store", title: view.storeName }]} style={styles.findUsMap} testID="store-map" />
        <Text style={styles.findUsText}>Find us: {place ? `${place.name}, ${place.address.split(",")[0]}` : "Choose your pickup place in Store profile"}</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button fullWidth icon="plus" label="Follow" onPress={() => toast.show("Buyers can follow your store here")} />
        </View>
        <View style={styles.flex}>
          <Button fullWidth icon="message-circle" label="Message" onPress={() => toast.show("Buyers can message you from here")} variant="soft" />
        </View>
      </View>

      {promo ? (
        <View style={styles.promo}>
          <PromoCarousel onPress={() => setTab("specials")} promos={[promo]} width={Math.min(width, size.contentMax + space.xl * 2)} />
        </View>
      ) : null}

      <SegmentedTabs onChange={setTab} options={tabs} value={active} />

      {active === "menu" ? grid(goods) : null}
      {active === "specials" ? grid(specials) : null}
      {active === "services" ? (
        <View style={styles.serviceList}>
          {services.map((service) => (
            <Card key={service.id} variant="row">
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
                <Text style={text.bodySmall}>{review.text}</Text>
                {review.reply ? <Text style={text.caption}>Reply from {view.storeName}: {review.reply}</Text> : null}
                <Text style={text.caption}>{relativeTime(review.createdAt)}</Text>
              </Card>
            ))}
          </View>
        )
      ) : null}

      <ShareStoreSheet onClose={() => setSharing(false)} place={place?.name} storeId={storeId} storeName={view.storeName} visible={sharing} />
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
  findUs: { borderRadius: corner.lg, marginTop: space.md, overflow: "hidden" },
  findUsMap: { height: 130 },
  findUsText: { backgroundColor: color.surfaceSoft, color: color.heading, fontSize: 13, fontWeight: "600", padding: space.sm },
  flex: { flex: 1 },
  footer: { flexDirection: "row", gap: space.sm },
  grid: { gap: space.xs },
  gridRow: { flexDirection: "row", gap: space.xs },
  location: { color: color.mist, flex: 1, fontSize: 12 },
  locationRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  logo: { borderRadius: 32, height: 64, width: 64 },
  name: { color: color.onPrimary, fontSize: 22, fontWeight: "800" },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  nameShrink: { flexShrink: 1 },
  price: { color: color.accent, fontSize: 15, fontWeight: "700" },
  promo: { marginTop: space.md },
  ribbon: { alignItems: "center", flexDirection: "row", gap: space.sm },
  serviceList: { gap: space.xs },
  serviceRow: { alignItems: "center", flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
  statText: { color: color.mist, fontSize: 12 },
  verified: { alignItems: "center", backgroundColor: color.mist, borderRadius: 10, flexDirection: "row", gap: 3, paddingHorizontal: 7, paddingVertical: 2 },
  verifiedText: { color: color.ink, fontSize: 10, fontWeight: "800" },
});
