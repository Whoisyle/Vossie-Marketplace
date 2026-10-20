import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { isLowStock } from "@/seller/selectors";
import type { SellerListing, SellerListingStatus } from "@/seller/types";

import { useSeller } from "./hooks";
import { Pill, type PillTone, SELLER, SellerButton, SellerCard, SellerHeader, SellerScreen } from "./ui";
import { RestockSheet } from "./RestockSheet";

type Filter = "all" | "active" | "low" | "paused" | "draft";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "low", label: "Low stock" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
];

const STATUS: Record<SellerListingStatus, { label: string; tone: PillTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  paused: { label: "Paused", tone: "warn" },
  published: { label: "Live", tone: "success" },
  "under-review": { label: "In review", tone: "info" },
};

export function matchesFilter(listing: SellerListing, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return listing.status === "published";
  if (filter === "low") return isLowStock(listing);
  if (filter === "paused") return listing.status === "paused";
  return listing.status === "draft" || listing.status === "under-review";
}

/** Seller Listings: everything the seller is selling, with stock and a quick way to pause, restock or edit. */
export function SellerListingsScreen() {
  const router = useRouter();
  const view = useSeller();
  const [filter, setFilter] = useState<Filter>("all");
  const [restock, setRestock] = useState<string | null>(null);
  const shown = view.seller.listings.filter((item) => matchesFilter(item, filter));

  return (
    <SellerScreen testID="seller-listings">
      <SellerHeader />
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Listings
        </Text>
        <SellerButton icon="plus" label="Add listing" onPress={() => router.push("/seller/listings/new" as Href)} size="sm" testID="add-listing" variant="light" />
      </View>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FILTERS.map((chip) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: filter === chip.key }} key={chip.key} onPress={() => setFilter(chip.key)} style={[styles.chip, filter === chip.key && styles.chipOn]} testID={`filter-${chip.key}`}>
            <Text style={[styles.chipText, filter === chip.key && styles.chipTextOn]}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {shown.length === 0 ? (
        <SellerCard style={styles.empty} testID="listings-empty">
          <Icon color={SELLER.solid} name="package" size={28} />
          <Text style={styles.cardTitle}>No listings here</Text>
          <Text style={styles.hint}>Add something to sell and it shows up for students on your campus.</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {shown.map((listing, index) => {
            const look = STATUS[listing.status];
            const low = isLowStock(listing);
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(340)} key={listing.id} layout={LinearTransition.springify().damping(20)}>
                <SellerCard onPress={() => router.push(`/seller/listings/${listing.id}` as Href)} style={styles.card} testID={`listing-${listing.id}`}>
                  <View style={styles.thumb}>{listing.artId && hasArt(listing.artId) ? <ArtTile id={listing.artId} inset={0.06} /> : <Icon color="#FFFFFF" name="package" size={24} />}</View>
                  <View style={styles.cardText}>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {listing.title}
                    </Text>
                    <Text style={styles.hint}>
                      {formatRand(listing.priceCents, { fixed: true })} · {listing.unlimited ? "No limit" : `${listing.onHand} in stock`}
                    </Text>
                    <View style={styles.pills}>
                      <Pill label={look.label} tone={look.tone} />
                      {low ? <Pill label={listing.onHand === 0 ? "Sold out" : "Low stock"} tone="danger" /> : null}
                    </View>
                  </View>
                  <View style={styles.actions}>
                    {!listing.unlimited ? <SellerButton label="Restock" onPress={() => setRestock(listing.id)} size="sm" testID={`restock-${listing.id}`} variant="outline" /> : null}
                    {listing.status === "published" || listing.status === "paused" ? (
                      <SellerButton label={listing.status === "paused" ? "Resume" : "Pause"} onPress={() => view.dispatch({ id: listing.id, paused: listing.status !== "paused", type: "sellerPauseListing" })} size="sm" testID={`pause-${listing.id}`} variant="solid" />
                    ) : null}
                  </View>
                </SellerCard>
              </Animated.View>
            );
          })}
        </View>
      )}
      <RestockSheet listingId={restock} onClose={() => setRestock(null)} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  card: { alignItems: "center", flexDirection: "row", gap: 12 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 20, minHeight: 38, paddingHorizontal: 16, paddingVertical: 9 },
  chipOn: { backgroundColor: "#FFFFFF" },
  chipScroll: { marginHorizontal: -20 },
  chipText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: SELLER.solid },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  empty: { alignItems: "center", gap: 6, marginTop: 14, paddingVertical: 28 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  list: { gap: 12, marginTop: 14 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  thumb: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 14, height: 64, justifyContent: "center", overflow: "hidden", width: 64 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 18 },
});
