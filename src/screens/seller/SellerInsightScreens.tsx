import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { formatRand, initials, relativeTime } from "@/data/format";
import { LIMITS } from "@/seller/plan";
import { activeListings, analytics, bestReel, engagementPercent, rankReels } from "@/seller/selectors";
import { averageRating } from "@/seller/state";
import { space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { Chips, Stars, StatTile } from "./parts";
import { PlaceCard } from "./SellerPlaceScreen";
import { ShareStoreSheet } from "./ShareStore";
import { UpgradeSheet } from "./SellerReelsScreens";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

/** Store preview: the shop as a buyer sees it, with a way to edit it or share it. */
export function SellerStorePreviewScreen() {
  const router = useRouter();
  const view = useSeller();
  const profile = view.seller.profile;
  const [category, setCategory] = useState("all");
  const [sharing, setSharing] = useState(false);
  const live = activeListings(view.seller.listings);
  const categories = ["all", ...new Set(live.map((item) => item.category))];
  const shown = live.filter((item) => category === "all" || item.category === category);
  const rating = averageRating(view.seller.reviewCounts);
  const reviews = view.seller.reviewCounts.reduce((a, b) => a + b, 0);

  return (
    <SellerScreen
      footer={
        <View style={styles.footerRow}>
          <SellerButton icon="edit-2" label="Edit store" onPress={() => router.push("/seller/account/store" as Href)} style={styles.flex} testID="edit-store" variant="glass" />
          <SellerButton icon="share-2" label="Share store" onPress={() => setSharing(true)} style={styles.flex} testID="share-store" variant="light" />
        </View>
      }
      testID="seller-store-preview"
      tone="white"
    >
      <SellerTopBar title="Store preview" />
      <Text style={styles.sub}>How buyers see you</Text>
      <View style={styles.banner} testID="preview-banner">
        {profile.bannerUri ? <Image accessibilityLabel="Store banner" contentFit="cover" source={{ uri: profile.bannerUri }} style={StyleSheet.absoluteFill} /> : <Icon color="#FFFFFF" name="image" size={30} />}
      </View>
      <SellerCard style={styles.head}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{initials(view.storeName)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{view.storeName}</Text>
          <View style={styles.inline}>
            <Stars rating={rating} />
            <Text style={styles.hint}>
              {rating.toFixed(1)} · {reviews} reviews
            </Text>
          </View>
        </View>
        {view.canTrade ? <Pill label="Verified" tone="success" /> : <Pill label="In review" tone="warn" />}
      </SellerCard>
      {profile.description ? <Text style={styles.desc}>{profile.description}</Text> : null}
      <Chips
        items={categories.map((key) => ({ key, label: key === "all" ? "All" : key[0]!.toUpperCase() + key.slice(1) }))}
        onChange={setCategory}
        value={category}
      />
      <View style={styles.grid}>
        {shown.map((item) => (
          <View key={item.id} style={styles.product} testID={`preview-${item.id}`}>
            <View style={styles.pic}>{item.artId && hasArt(item.artId) ? <ArtTile id={item.artId} inset={0.06} /> : <Icon color="#FFFFFF" name="package" size={26} />}</View>
            <Text numberOfLines={1} style={styles.pname}>
              {item.title}
            </Text>
            <Text style={styles.price}>{formatRand(item.priceCents)}</Text>
          </View>
        ))}
      </View>
      <PlaceCard place={profile.place} />
      <ShareStoreSheet onClose={() => setSharing(false)} place={profile.location || undefined} storeId={profile.storeId || "campusbites"} storeName={view.storeName} visible={sharing} />
    </SellerScreen>
  );
}

/** Reviews: the average, how many of each star, and each review with a reply. */
export function SellerReviewsScreen() {
  const view = useSeller();
  const toast = useToast();
  const [replying, setReplying] = useState<string | null>(null);
  const counts = view.seller.reviewCounts;
  const total = counts.reduce((a, b) => a + b, 0);
  const rating = averageRating(counts);
  const target = view.seller.reviews.find((item) => item.id === replying);
  const quick = ["Thank you for your review!", "Thanks, glad it worked out.", "Sorry about that. We are working on it."];

  return (
    <SellerScreen testID="seller-reviews">
      <SellerTopBar title="Reviews" />
      <Text style={styles.sub}>{total} buyer reviews</Text>
      <SellerCard style={styles.summary} testID="review-summary">
        <View style={styles.big}>
          <Text style={styles.bigNumber}>{rating.toFixed(1)}</Text>
          <Stars rating={rating} size={13} />
          <Text style={styles.hint}>{total} reviews</Text>
        </View>
        <View style={styles.bars}>
          {counts.map((count, index) => (
            <View key={index} style={styles.barRow}>
              <Text style={styles.barLabel}>{5 - index}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${total ? Math.max(3, (count / total) * 100) : 0}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
        </View>
      </SellerCard>
      <View style={styles.stack}>
        {view.seller.reviews.map((review, index) => (
          <Animated.View entering={FadeInDown.delay(index * 60).duration(320)} key={review.id}>
            <SellerCard style={styles.review} testID={`review-${review.id}`}>
              <View style={styles.between}>
                <Text style={styles.name}>{review.author}</Text>
                <Stars rating={review.rating} size={12} />
              </View>
              <Text style={styles.body}>{review.text}</Text>
              {review.reply ? (
                <View style={styles.reply}>
                  <Text style={styles.hint}>Your reply</Text>
                  <Text style={styles.body}>{review.reply}</Text>
                </View>
              ) : null}
              <View style={styles.between}>
                <Text style={styles.hint}>{relativeTime(review.createdAt)}</Text>
                {!review.reply ? (
                  <Pressable accessibilityRole="button" onPress={() => setReplying(review.id)} style={styles.inline} testID={`reply-${review.id}`}>
                    <Icon color={SELLER.solid} name="corner-up-left" size={15} />
                    <Text style={styles.link}>Reply</Text>
                  </Pressable>
                ) : null}
              </View>
            </SellerCard>
          </Animated.View>
        ))}
      </View>
      <Sheet onClose={() => setReplying(null)} title={target ? `Reply to ${target.author}` : "Reply"} visible={Boolean(target)}>
        <Text style={text.body}>Pick a reply. The buyer sees it under their review.</Text>
        <View style={styles.sheetList}>
          {quick.map((reply) => (
            <Button
              fullWidth
              key={reply}
              label={reply}
              onPress={() => {
                if (target) view.dispatch({ id: target.id, text: reply, type: "sellerReplyReview" });
                toast.show("Reply sent");
                setReplying(null);
              }}
              testID={`quick-${reply.slice(0, 6)}`}
              variant="soft"
            />
          ))}
        </View>
      </Sheet>
    </SellerScreen>
  );
}

const RANGES: { key: "7" | "30" | "90"; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];

type AnalyticsTab = "sales" | "products" | "reels";

/** Analytics: sales, the best products and the best reels over 7, 30 or 90 days. Product and reel views come with the paid plans. */
export function SellerAnalyticsScreen() {
  const view = useSeller();
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const [tab, setTab] = useState<AnalyticsTab>("sales");
  const [locked, setLocked] = useState(false);
  const [now] = useState(() => Date.now());
  const data = analytics(view.seller, Number(range) as 7 | 30 | 90, now);
  const peak = Math.max(1, ...data.bars.map((bar) => bar.cents));
  const highest = data.bars.reduce((best, bar, i, all) => (bar.cents > all[best]!.cents ? i : best), 0);
  const allowed = LIMITS[view.plan].analytics;
  const reels = rankReels(view.seller.reels).filter((item) => item.status === "published");
  const best = bestReel(view.seller.reels);
  const topRevenue = Math.max(1, ...data.top.map((item) => item.cents));

  const choose = (next: AnalyticsTab) => {
    if (!allowed.includes(next)) return setLocked(true);
    setTab(next);
  };

  return (
    <SellerScreen testID="seller-analytics">
      <SellerTopBar title="Analytics" />
      <Text style={styles.sub}>Sales trends and performance</Text>
      <Chips items={[{ key: "sales", label: "Sales" }, { key: "products", label: allowed.includes("products") ? "Products" : "Products · Plus" }, { key: "reels", label: allowed.includes("reels") ? "Reels" : "Reels · Pro" }]} onChange={choose} prefix="tab" value={tab} />
      {tab !== "reels" ? <Chips items={RANGES} onChange={setRange} value={range} /> : null}

      {tab === "sales" ? (
        <>
          <SellerCard style={styles.revenue} testID="analytics-revenue">
            <View style={styles.between}>
              <Text style={styles.hint}>Revenue</Text>
              {data.changePercent !== null ? <Pill label={`${data.changePercent >= 0 ? "+" : ""}${data.changePercent}%`} tone={data.changePercent >= 0 ? "success" : "danger"} /> : null}
            </View>
            <Text style={styles.money}>{formatRand(data.revenueCents)}</Text>
            <View style={styles.chart}>
              {data.bars.map((bar, i) => (
                <View key={i} style={styles.col}>
                  <View style={[styles.bar, { height: Math.max(8, (bar.cents / peak) * 90) }, i === highest && bar.cents > 0 && styles.barTop]} />
                  <Text style={styles.hint}>{bar.label}</Text>
                </View>
              ))}
            </View>
          </SellerCard>
          <View style={styles.tiles}>
            <StatTile label="Orders" testID="analytics-orders" value={data.orders} />
            <StatTile label="Conversion" value="4.2%" />
          </View>
          <SellerHeading>Top products</SellerHeading>
          <View style={styles.stack}>
            {data.top.length === 0 ? (
              <SellerCard>
                <Text style={styles.hint}>No sales in this time yet.</Text>
              </SellerCard>
            ) : (
              data.top.slice(0, 3).map((item) => (
                <SellerCard key={item.title} style={styles.between} testID={`top-${item.title}`}>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{item.title}</Text>
                    <Text style={styles.hint}>{item.sold} sold</Text>
                  </View>
                  <Text style={styles.name}>{formatRand(item.cents)}</Text>
                </SellerCard>
              ))
            )}
          </View>
          <Text style={styles.note}>Conversion is a demo figure until views on your products are measured.</Text>
        </>
      ) : null}

      {tab === "products" ? (
        <View style={styles.stack} testID="analytics-products">
          {data.top.length === 0 ? (
            <SellerCard>
              <Text style={styles.hint}>No sales in this time yet.</Text>
            </SellerCard>
          ) : (
            data.top.map((item, index) => (
              <SellerCard key={item.title} style={styles.rankCard} testID={`rank-${item.title}`}>
                <View style={styles.between}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{item.title}</Text>
                    <Text style={styles.hint}>{item.sold} sold</Text>
                  </View>
                  {index === 0 ? <Pill label="Best performing" tone="info" /> : null}
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(6, (item.cents / topRevenue) * 100)}%` }]} />
                </View>
                <Text style={styles.name}>{formatRand(item.cents)}</Text>
              </SellerCard>
            ))
          )}
        </View>
      ) : null}

      {tab === "reels" ? (
        <View style={styles.stack} testID="analytics-reels">
          {reels.length === 0 ? (
            <SellerCard>
              <Text style={styles.hint}>No live reels yet. Add one in Products.</Text>
            </SellerCard>
          ) : (
            reels.map((reel, index) => (
              <SellerCard key={reel.id} style={styles.rankCard} testID={`reel-rank-${reel.id}`}>
                <View style={styles.between}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={styles.name}>
                      {reel.caption}
                    </Text>
                    <Text style={styles.hint}>
                      {reel.views.toLocaleString("en-ZA")} views · {engagementPercent(reel)}% engaged · {reel.orders} orders
                    </Text>
                  </View>
                  {best?.id === reel.id ? <Pill label="Best performing" tone="info" /> : null}
                </View>
                <Text style={styles.name}>{formatRand(reel.salesCents)} in sales</Text>
              </SellerCard>
            ))
          )}
        </View>
      ) : null}
      <UpgradeSheet kind="analytics" onClose={() => setLocked(false)} visible={locked} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 20, height: 100, justifyContent: "center", marginTop: 12 },
  bar: { backgroundColor: "#B5CAD2", borderRadius: 8, width: "100%" },
  barCount: { color: SELLER.inkSoft, fontSize: 12, width: 24 },
  barLabel: { color: SELLER.inkSoft, fontSize: 12, width: 12 },
  barRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  barTop: { backgroundColor: SELLER.solid },
  bars: { flex: 1, gap: 4 },
  between: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  big: { alignItems: "center", gap: 4, justifyContent: "center", width: 96 },
  bigNumber: { color: SELLER.ink, fontSize: 40, fontWeight: "800" },
  body: { color: SELLER.ink, fontSize: 14, lineHeight: 20 },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 8, height: 120, marginTop: 8 },
  col: { alignItems: "center", flex: 1, gap: 4, justifyContent: "flex-end" },
  desc: { color: "#FFFFFF", fontSize: 14, marginTop: 10 },
  fill: { backgroundColor: SELLER.solid, borderRadius: 4, height: 6 },
  flex: { flex: 1, gap: 2 },
  footerRow: { flexDirection: "row", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  head: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: -26 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  inline: { alignItems: "center", flexDirection: "row", gap: 6 },
  link: { color: SELLER.solid, fontSize: 14, fontWeight: "800" },
  logo: { alignItems: "center", backgroundColor: "#D5DDE1", borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  logoText: { color: "#5F6E76", fontSize: 18, fontWeight: "700" },
  money: { color: SELLER.ink, fontSize: 34, fontWeight: "800" },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  note: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 14, textAlign: "center" },
  pic: { alignItems: "center", aspectRatio: 1.25, backgroundColor: "#7FA3B2", borderRadius: 16, justifyContent: "center", overflow: "hidden" },
  pname: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  price: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  product: { flexBasis: "47%", flexGrow: 1, gap: 4 },
  reply: { backgroundColor: "#E3ECEF", borderRadius: 12, gap: 2, padding: 10 },
  review: { gap: 8 },
  revenue: { gap: 6, marginTop: 12 },
  sheetList: { gap: space.xs, marginTop: space.sm },
  stack: { gap: 10 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  summary: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 14 },
  rank: { color: SELLER.solid, fontSize: 18, fontWeight: "800", width: 22 },
  rankCard: { gap: 8 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  track: { backgroundColor: "#DDE6E9", borderRadius: 4, flex: 1, height: 6 },
});
