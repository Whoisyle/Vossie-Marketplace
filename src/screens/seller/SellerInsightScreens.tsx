import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast } from "@/components";
import { formatRand, relativeTime } from "@/data/format";
import { LIMITS } from "@/seller/plan";
import { dateKey } from "@/seller/schedule";
import { promotionDetail } from "@/seller/promotions";
import { analytics, bestReel, engagementPercent, insights, rankReels, returningBuyers, revenueSeries } from "@/seller/selectors";
import { averageRating, sellerId } from "@/seller/state";
import { space, text } from "@/theme/tokens";

import { Donut, Funnel, HeatGrid, ScrubBars, ScrubLine } from "./charts";
import { useSeller } from "./hooks";
import { Chips, Stars } from "./parts";
import { UpgradeSheet } from "./SellerReelsScreens";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

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

type AnalyticsTab = "sales" | "products" | "customers" | "reels";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PARTS = ["Morning", "Afternoon", "Evening"];
const CATEGORY_COLOURS = ["#38606F", "#6FA3B3", "#E5A92B", "#B07A5B", "#8E9FA8", "#5E8D7B"];

/** A small number tile for the top of an Analytics tab: what it is, its value and, when there is one, how it moved. */
function Kpi({ change, label, testID, value }: { label: string; value: string; change?: number | null; testID?: string }) {
  return (
    <SellerCard style={styles.kpi} testID={testID}>
      <Text style={styles.hint}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {change !== undefined && change !== null ? <Pill label={`${change >= 0 ? "+" : ""}${change}%`} tone={change >= 0 ? "success" : "danger"} /> : null}
    </SellerCard>
  );
}

/** Analytics: sales, products, customers and reels over 7, 30 or 90 days. Every chart answers to a touch. Some tabs come with the paid plans. */
export function SellerAnalyticsScreen() {
  const view = useSeller();
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const [tab, setTab] = useState<AnalyticsTab>("sales");
  const [locked, setLocked] = useState<"analytics" | "returningBuyers" | false>(false);
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const days = Number(range) as 7 | 30 | 90;
  const data = analytics(view.seller, days, now);
  const more = insights(view.seller, days, now);
  const series = revenueSeries(view.seller.ledger, days, now);
  const allowed = LIMITS[view.plan].analytics;
  const reels = rankReels(view.seller.reels).filter((item) => item.status === "published");
  const best = bestReel(view.seller.reels);
  const topRevenue = Math.max(1, ...data.top.map((item) => item.cents));
  const weekdayBars = WEEKDAYS.map((label, r) => {
    const count = more.heat[r]!.reduce((a, b) => a + b, 0);
    return { detail: count === 1 ? "1 sale" : `${count} sales`, label, title: `${label}`, value: count };
  });
  const returning = returningBuyers(view.seller.orders);
  const totals = reels.reduce((sum, item) => ({ likes: sum.likes + item.likes + item.saves, orders: sum.orders + item.orders, taps: sum.taps + item.taps, views: sum.views + item.views }), { likes: 0, orders: 0, taps: 0, views: 0 });

  const choose = (next: AnalyticsTab) => {
    if (!allowed.includes(next)) return setLocked("analytics");
    setTab(next);
  };

  return (
    <SellerScreen testID="seller-analytics">
      <SellerTopBar title="Analytics" />
      <Text style={styles.sub}>Touch or drag any chart to explore it</Text>
      <Chips
        items={[
          { key: "sales", label: "Sales" },
          { key: "products", label: allowed.includes("products") ? "Products" : "Products · Plus" },
          { key: "customers", label: allowed.includes("customers") ? "Customers" : "Customers · Plus" },
          { key: "reels", label: allowed.includes("reels") ? "Reels" : "Reels · Pro" },
        ]}
        onChange={choose}
        prefix="tab"
        value={tab}
      />
      {tab !== "reels" ? <Chips items={RANGES} onChange={setRange} value={range} /> : null}

      {tab === "sales" ? (
        <>
          <View style={styles.tiles}>
            <Kpi change={data.changePercent} label="Revenue" testID="analytics-revenue" value={formatRand(data.revenueCents)} />
            <Kpi label="Orders" testID="analytics-orders" value={String(data.orders)} />
            <Kpi label="Average order" value={formatRand(more.averageOrderCents)} />
            <Kpi label="Kept after fees" value={formatRand(more.revenueCents - more.feesCents)} />
          </View>
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>Revenue over time</Text>
            <Text style={styles.hint}>The dashed line is the same stretch before.</Text>
            <ScrubLine
              compare={series.previous.map((point) => ({ title: formatRand(point.cents), value: point.cents }))}
              points={series.points.map((point) => ({ label: point.label, title: `${point.label} · ${formatRand(point.cents)}`, value: point.cents }))}
            />
          </SellerCard>
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>Best days of the week</Text>
            <ScrubBars bars={weekdayBars} />
          </SellerCard>
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>How buyers get it</Text>
            <Donut slices={[{ color: "#38606F", key: "collection", label: "Collection", value: more.collection }, { color: "#E5A92B", key: "delivery", label: "Delivery", value: more.delivery }]} />
          </SellerCard>
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>Busy times</Text>
            <HeatGrid cells={more.heat} cols={PARTS} rows={WEEKDAYS} />
          </SellerCard>
          <SellerHeading>Money</SellerHeading>
          <View style={styles.stack}>
            <MoneyRow label="Vossie fees" value={formatRand(-more.feesCents)} />
            <MoneyRow label="Refunds" value={formatRand(-more.refundCents)} />
            <MoneyRow bold label="Net" value={formatRand(more.netCents)} />
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
          <Text style={styles.note}>Views on your products are not measured yet, so there is no conversion rate here.</Text>
        </>
      ) : null}

      {tab === "products" ? (
        <View style={styles.stack} testID="analytics-products">
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>Sales by category</Text>
            <Donut slices={more.categories.map((item, i) => ({ color: CATEGORY_COLOURS[i % CATEGORY_COLOURS.length]!, key: item.key, label: item.label, value: Math.round(item.cents / 100) }))} unit=" R" />
          </SellerCard>
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

      {tab === "customers" ? (
        <View style={styles.stack} testID="analytics-customers">
          <View style={styles.tiles}>
            <Kpi label="Buyers" value={String(more.newBuyers + more.returningBuyers)} />
            <Kpi label="Came back" value={`${more.repeatPercent}%`} />
            <Kpi label="Average order" value={formatRand(more.averageOrderCents)} />
            <Kpi label="Cancelled" value={`${more.cancelledPercent}%`} />
          </View>
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>New and returning</Text>
            <Donut slices={[{ color: "#38606F", key: "new", label: "New buyers", value: more.newBuyers }, { color: "#E5A92B", key: "returning", label: "Returning", value: more.returningBuyers }]} />
          </SellerCard>
          <SellerHeading>Returning buyers</SellerHeading>
          {LIMITS[view.plan].tools.returningBuyers ? (
            returning.length === 0 ? (
              <SellerCard>
                <Text style={styles.hint}>No one has ordered twice yet.</Text>
              </SellerCard>
            ) : (
              returning.map((buyer) => (
                <SellerCard key={buyer.name} style={styles.rankCard} testID={`returning-${buyer.name}`}>
                  <View style={styles.between}>
                    <View style={styles.flex}>
                      <Text style={styles.name}>{buyer.name}</Text>
                      <Text style={styles.hint}>
                        {buyer.orders} orders · {formatRand(buyer.cents)} · last {relativeTime(buyer.lastAt)}
                      </Text>
                    </View>
                    <Pill label="Returning" tone="success" />
                  </View>
                  <SellerButton
                    icon="gift"
                    label="Offer 10% off"
                    onPress={() => {
                      const first = buyer.name.split(" ")[0] ?? "friend";
                      const item = { active: true, appliesTo: "store" as const, code: `THANKS${first.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)}`, detail: "", firstOrderOnly: false, id: sellerId("pr"), kind: "percent" as const, perStudent: 1, redemptions: 0, startsAt: dateKey(new Date()), title: `Thank you, ${first}`, value: 10 };
                      view.dispatch({ promotion: { ...item, detail: promotionDetail(item) }, type: "sellerCreatePromotion" });
                      toast.show(`A 10% thank-you code is ready for ${first}`);
                    }}
                    size="sm"
                    testID={`offer-${buyer.name}`}
                    variant="light"
                  />
                </SellerCard>
              ))
            )
          ) : (
            <SellerCard onPress={() => setLocked("returningBuyers")} style={styles.between} testID="returning-locked">
              <View style={styles.flex}>
                <Text style={styles.name}>See who comes back</Text>
                <Text style={styles.hint}>Flag returning buyers and thank them with an offer.</Text>
              </View>
              <Pill label="Pro" tone="info" />
            </SellerCard>
          )}
          <SellerHeading>Best buyers</SellerHeading>
          {more.topBuyers.length === 0 ? (
            <SellerCard>
              <Text style={styles.hint}>No buyers in this time yet.</Text>
            </SellerCard>
          ) : (
            more.topBuyers.map((buyer) => (
              <SellerCard key={buyer.name} style={styles.between}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{buyer.name}</Text>
                  <Text style={styles.hint}>{buyer.orders === 1 ? "1 order" : `${buyer.orders} orders`}</Text>
                </View>
                <Text style={styles.name}>{formatRand(buyer.cents)}</Text>
              </SellerCard>
            ))
          )}
        </View>
      ) : null}

      {tab === "reels" ? (
        <View style={styles.stack} testID="analytics-reels">
          <SellerCard style={styles.panel}>
            <Text style={styles.panelTitle}>From a view to an order</Text>
            <Funnel steps={[{ key: "views", label: "Views", value: totals.views }, { key: "likes", label: "Liked or saved", value: totals.likes }, { key: "taps", label: "Tapped to the product", value: totals.taps }, { key: "orders", label: "Orders", value: totals.orders }]} />
          </SellerCard>
          {reels.length > 0 ? (
            <SellerCard style={styles.panel}>
              <Text style={styles.panelTitle}>Views by reel</Text>
              <ScrubBars bars={reels.map((reel, i) => ({ detail: `${engagementPercent(reel)}% engaged · ${reel.orders} orders`, label: `${i + 1}`, title: `${reel.caption}`, value: reel.views }))} />
            </SellerCard>
          ) : null}
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
      <UpgradeSheet kind={locked === "returningBuyers" ? "returningBuyers" : "analytics"} onClose={() => setLocked(false)} visible={locked !== false} />
    </SellerScreen>
  );
}

function MoneyRow({ bold, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <SellerCard style={styles.between}>
      <Text style={[styles.hint, bold && styles.name]}>{label}</Text>
      <Text style={styles.name}>{value}</Text>
    </SellerCard>
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
  kpi: { flexBasis: "47%", flexGrow: 1, gap: 4 },
  kpiValue: { color: SELLER.ink, fontSize: 22, fontWeight: "800" },
  panel: { gap: 8, marginTop: 12 },
  panelTitle: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  track: { backgroundColor: "#DDE6E9", borderRadius: 4, flex: 1, height: 6 },
});
