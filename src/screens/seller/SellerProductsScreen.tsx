import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { LIMITS } from "@/seller/plan";
import { isLowStock, productCount } from "@/seller/selectors";
import type { SellerListing, SellerListingStatus } from "@/seller/types";
import { color } from "@/theme/tokens";

import { ProgressBar, ScreenHead, StatCards } from "./HomeParts";
import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { ReelsPanel, UpgradeSheet } from "./SellerReelsScreens";
import { Pill, type PillTone, SELLER, SellerButton, SellerCard, SellerScreen, Text } from "./ui";
import { RestockSheet } from "./RestockSheet";

type Filter = "all" | "active" | "low" | "paused" | "draft" | "archived";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "low", label: "Low stock" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
  { key: "archived", label: "Archived" },
];

const STATUS: Record<SellerListingStatus, { label: string; tone: PillTone }> = {
  archived: { label: "Archived", tone: "neutral" },
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
  if (filter === "archived") return listing.status === "archived";
  return listing.status === "draft" || listing.status === "under-review";
}

/** Seller Listings: everything the seller is selling, with stock and a quick way to pause, restock or edit. */
export function SellerProductsScreen() {
  const router = useRouter();
  const view = useSeller();
  const [filter, setFilter] = useState<Filter>("all");
  const [restock, setRestock] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"products" | "reels">("products");
  const [upgrade, setUpgrade] = useState(false);
  const needle = query.trim().toLowerCase();
  const shown = view.seller.listings.filter((item) => matchesFilter(item, filter) && (!needle || item.title.toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle)));
  const lowCount = view.seller.listings.filter(isLowStock).length;

  return (
    <SellerScreen tone="white" testID="seller-listings">
      <ScreenHead
        right={<SellerButton icon="plus" label="Add product" onPress={() => (productCount(view.seller.listings) >= LIMITS[view.plan].products ? setUpgrade(true) : router.push("/seller/products/new" as Href))} size="sm" testID="add-listing" variant="solid" />}
        subtitle={`${view.seller.listings.length} listed · ${lowCount} low stock`}
        title="Products"
      />
      <StatCards
        items={[
          { label: "Live", onPress: () => setFilter("active"), testID: "stat-live", tone: "dark", value: view.seller.listings.filter((item) => item.status === "published").length },
          { label: "Low stock", onPress: () => setFilter("low"), testID: "stat-low", tone: "sage", value: lowCount },
          { label: "Drafts", onPress: () => setFilter("draft"), testID: "stat-drafts", tone: "grey", value: view.seller.listings.filter((item) => item.status === "draft" || item.status === "under-review").length },
        ]}
      />
      <Chips items={[{ count: view.seller.listings.length, key: "products", label: "Products" }, { count: view.seller.reels.length, key: "reels", label: "Reels" }]} onChange={setTab} prefix="view" value={tab} />
      {tab === "reels" ? (
        <ReelsPanel />
      ) : (
        <>
      <View style={styles.search}>
        <Icon color={SELLER.inkSoft} name="search" size={18} />
        <TextInput accessibilityLabel="Search products" onChangeText={setQuery} placeholder="Search products" placeholderTextColor="#8A99A1" style={styles.searchInput} testID="product-search" value={query} />
      </View>
      <Chips items={FILTERS} onChange={setFilter} prefix="filter" value={filter} />

      <SellerButton icon="bar-chart-2" label="Inventory" onPress={() => router.push("/seller/products/inventory" as Href)} size="sm" style={styles.inventory} testID="open-inventory" variant="glass" />

      {shown.length === 0 ? (
        <SellerCard style={styles.empty} testID="listings-empty">
          <Icon color={SELLER.solid} name="package" size={28} />
          <Text style={styles.cardTitle}>No products here</Text>
          <Text style={styles.hint}>Add something to sell and it shows up for students on your campus.</Text>
        </SellerCard>
      ) : (
        <View style={styles.grid} testID="product-grid">
          {shown.map((listing, index) => {
            const look = STATUS[listing.status];
            const low = isLowStock(listing);
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(340)} key={listing.id} layout={LinearTransition.springify().damping(20)} style={styles.cell}>
                <SellerCard style={styles.tile}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/seller/products/${listing.id}` as Href)} style={styles.tileTop} testID={`listing-${listing.id}`}>
                    <View style={styles.thumb}>
                      {listing.photos[0] ? <Image contentFit="cover" source={{ uri: listing.photos[0] }} style={StyleSheet.absoluteFill} /> : listing.artId && hasArt(listing.artId) ? <ArtTile id={listing.artId} inset={0.06} /> : <Icon color="#FFFFFF" name="package" size={26} />}
                      <View style={styles.floatPill}>
                        <Pill label={look.label} tone={look.tone} />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {listing.title}
                    </Text>
                    <Text style={styles.price}>{formatRand(listing.priceCents, { fixed: true })}</Text>
                    {listing.unlimited ? (
                      <Text style={styles.hint}>No stock limit</Text>
                    ) : (
                      <View style={styles.stock} testID={`stock-${listing.id}`}>
                        <View style={styles.stockRow}>
                          <Text style={styles.hint}>{listing.onHand === 0 ? "Sold out" : `${listing.onHand} in stock`}</Text>
                          {low ? <Text style={styles.lowText}>Low</Text> : null}
                        </View>
                        <ProgressBar fillColor={low ? "#E58A2B" : undefined} percent={Math.min(100, listing.onHand * 8)} />
                      </View>
                    )}
                  </Pressable>
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
        </>
      )}
      <UpgradeSheet kind="products" onClose={() => setUpgrade(false)} visible={upgrade} />
      <RestockSheet listingId={restock} onClose={() => setRestock(null)} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  cell: { flexBasis: "47.5%", flexGrow: 1 },
  floatPill: { left: 8, position: "absolute", top: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  lowText: { color: "#C26A12", fontSize: 12, fontWeight: "800" },
  price: { color: SELLER.solid, fontSize: 15, fontWeight: "800" },
  stock: { gap: 5, marginTop: 2 },
  stockRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  tile: { padding: 10 },
  tileTop: { gap: 4 },
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
  thumb: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 14, height: 110, justifyContent: "center", overflow: "hidden", width: "100%" },
  inventory: { alignSelf: "flex-start", marginTop: 8 },
  search: { alignItems: "center", backgroundColor: color.cloudGrey, borderRadius: 16, marginTop: 8, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { color: SELLER.ink, flex: 1, fontSize: 15, paddingVertical: 8 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 18 },
});
