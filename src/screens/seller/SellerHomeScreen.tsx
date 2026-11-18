import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text as RNText, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { formatRand } from "@/data/format";
import { bestSellers, ongoingOrders, searchSeller, setupChecklist, todayVsYesterday } from "@/seller/homeData";
import { PLAN_NAMES } from "@/seller/plan";
import { bestReel, goalProgress, liveReelCount, type Attention } from "@/seller/selectors";
import { color } from "@/theme/tokens";

import { CloseEarlySheet } from "./CloseEarly";
import { BestSellers, ChecklistCard, HomeSearch, HomeTop, MiniBars, OrderCards, ProgressBar, SectionTitle, WelcomeBanner } from "./HomeParts";
import { useSeller, greeting } from "./hooks";
import { CountUpRand } from "./motion";
import { Pill, type PillTone, SELLER, SellerButton, SellerCard, SellerScreen, Text } from "./ui";
import { RestockSheet } from "./RestockSheet";

const KIND: Record<Attention["kind"], { label: string; tone: PillTone; action: string }> = {
  message: { action: "Reply", label: "Message", tone: "success" },
  order: { action: "Accept", label: "New order", tone: "info" },
  stock: { action: "Restock", label: "Low stock", tone: "danger" },
};

/**
 * Seller Home. A greeting and a search, a welcome card that says what matters now, the orders in progress as cards with
 * progress bars (the one that needs you first is dark), today's sales against yesterday's, then what needs doing, best
 * sellers and ways to grow. While you type in the search, matching orders and products replace the page.
 */
export function SellerHomeScreen() {
  const router = useRouter();
  const view = useSeller();
  const [restock, setRestock] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [stamp] = useState(() => Date.now());
  const goal = goalProgress(view.seller, stamp);
  const { week } = view;
  const best = bestReel(view.seller.reels);
  const today = todayVsYesterday(view.bars);
  const checklist = useMemo(() => setupChecklist(view.seller), [view.seller]);
  const ongoing = useMemo(() => ongoingOrders(view.seller.orders), [view.seller.orders]);
  const sellers = useMemo(() => bestSellers(view.seller.orders, view.seller.listings).map((item) => ({ id: item.listing?.id, sold: item.sold, title: item.title })), [view.seller.orders, view.seller.listings]);
  const found = useMemo(() => searchSeller(view.seller, query), [view.seller, query]);

  const go = (path: string) => router.push(path as Href);
  const act = (item: Attention) => {
    if (item.kind === "order") view.dispatch({ accept: true, id: item.orderId, type: "sellerRespondOrder" });
    else if (item.kind === "stock") setRestock(item.listingId);
    else go(`/seller/home/messages/${item.conversationId}`);
  };

  // the welcome card says the most useful thing for right now
  const banner = !view.canTrade
    ? { cta: "View status", href: "/seller/account/documents", testID: "verification-banner", text: "Vossie Operations is checking your documents. You can set up your products while you wait.", title: "Verification in review" }
    : view.counts.new > 0
      ? { cta: "Open orders", href: "/seller/orders", testID: "home-banner", text: "Students are waiting. Accept them quickly to keep your rating high.", title: view.counts.new === 1 ? "1 new order" : `${view.counts.new} new orders` }
      : checklist.next
        ? { cta: checklist.next.action, href: checklist.next.href, testID: "home-banner", text: `${checklist.next.label}. It helps students trust your shop.`, title: "Finish your shop" }
        : { cta: "Post a reel", href: "/seller/products/reel/new", testID: "home-banner", text: "A short video of a product gets more students looking.", title: "Welcome back!" };

  return (
    <SellerScreen testID="seller-home" tone="white">
      <HomeTop firstName={view.firstName} greeting={greeting()} logo={view.seller.profile.logoUri} onAvatar={() => go("/seller/account")} onBell={() => go("/seller/home/notifications")} storeName={view.storeName} unread={view.unreadAlerts} />
      <HomeSearch onChange={setQuery} value={query} />

      {query.trim().length > 0 ? (
        <View style={styles.results} testID="search-results">
          {found.orders.length === 0 && found.listings.length === 0 ? (
            <SellerCard testID="search-empty">
              <Text style={styles.cardTitle}>Nothing found for “{query.trim()}”</Text>
              <Text style={styles.cardHint}>Try an order number, a buyer&apos;s name or a product name.</Text>
            </SellerCard>
          ) : null}
          {found.orders.map((order) => (
            <SellerCard key={order.id} onPress={() => go(`/seller/orders/${order.id}`)} style={styles.result} testID={`found-order-${order.id}`}>
              <Icon color={color.accent} name="clipboard" size={20} />
              <View style={styles.resultText}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {order.number} · {order.buyerName}
                </Text>
                <Text numberOfLines={1} style={styles.cardHint}>
                  {order.lines.map((line) => line.title).join(", ")}
                </Text>
              </View>
            </SellerCard>
          ))}
          {found.listings.map((listing) => (
            <SellerCard key={listing.id} onPress={() => go(`/seller/products/${listing.id}`)} style={styles.result} testID={`found-product-${listing.id}`}>
              <Icon color={color.accent} name="package" size={20} />
              <View style={styles.resultText}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {listing.title}
                </Text>
                <Text numberOfLines={1} style={styles.cardHint}>
                  {listing.sku} · {formatRand(listing.priceCents)}
                </Text>
              </View>
            </SellerCard>
          ))}
        </View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(60).duration(360)} style={styles.statusRow}>
            <Pressable accessibilityLabel={`${view.status.label}. Change operating times`} accessibilityRole="button" onPress={() => go("/seller/account/hours")} style={styles.status} testID="store-status">
              <View style={[styles.statusDot, { backgroundColor: view.status.open ? "#2E9E6B" : "#E58A2B" }]} />
              <RNText style={styles.statusText}>{view.status.label}</RNText>
            </Pressable>
            {view.status.open || view.status.reason === "early" ? (
              <Pressable accessibilityRole="button" onPress={() => setClosing(true)} style={styles.early} testID="close-early">
                <Icon color={color.slate} name="moon" size={13} />
                <RNText style={styles.earlyText}>{view.status.reason === "early" ? "Open again" : "Close early today"}</RNText>
              </Pressable>
            ) : null}
          </Animated.View>

          <WelcomeBanner cta={banner.cta} onPress={() => go(banner.href)} testID={banner.testID} text={banner.text} title={banner.title} />

          {view.canTrade && checklist.percent < 100 && banner.title !== "Finish your shop" ? <ChecklistCard done={checklist.done} next={checklist.next} onNext={() => checklist.next && go(checklist.next.href)} percent={checklist.percent} total={checklist.steps.length} /> : null}

          <SectionTitle action="View all" onAction={() => go("/seller/orders")} title="Ongoing orders" />
          {ongoing.length === 0 ? (
            <SellerCard testID="orders-empty">
              <Text style={styles.cardTitle}>No orders in progress</Text>
              <Text style={styles.cardHint}>New orders show up here with a progress bar from accepted to ready.</Text>
            </SellerCard>
          ) : (
            <OrderCards onOpen={(order) => go(`/seller/orders/${order.id}`)} orders={ongoing} />
          )}

          <SectionTitle action="Analytics" onAction={() => go("/seller/account/analytics")} title="Today at a glance" />
          <Animated.View entering={FadeInDown.delay(140).duration(400)}>
            <SellerCard style={styles.today} testID="earnings-card">
              <View style={styles.todayTop}>
                <View style={styles.todayText}>
                  <Text style={styles.small}>Sales today</Text>
                  <CountUpRand cents={today.todayCents} style={styles.money} />
                  <Text style={[styles.change, today.changePercent !== null && today.changePercent < 0 && styles.changeDown]}>
                    {today.changePercent === null ? (today.todayCents > 0 ? "Your first sales day" : "No sales yet today") : `${today.changePercent >= 0 ? "▲" : "▼"} ${Math.abs(today.changePercent)}% vs yesterday`}
                  </Text>
                </View>
                <SellerButton label="Withdraw" onPress={() => go("/seller/payouts")} size="sm" testID="home-withdraw" variant="solid" />
              </View>
              <MiniBars bars={view.bars} />
              <View style={styles.divider} />
              <View style={styles.weekRow}>
                <Text style={styles.small}>This week</Text>
                <Text style={styles.weekValue}>
                  {formatRand(week.thisWeekCents)}
                  <Text style={styles.small}>{week.changePercent === null ? "  first week" : `  ${week.changePercent >= 0 ? "+" : ""}${week.changePercent}% on last week`}</Text>
                </Text>
              </View>
              {goal ? (
                <Pressable accessibilityRole="button" onPress={() => go("/seller/account/goals")} style={styles.goal} testID="goal-home">
                  <View style={styles.weekRow}>
                    <Text style={styles.goalTitle}>{goal.reached ? "Weekly goal reached" : "Weekly goal"}</Text>
                    <Text style={styles.small}>
                      {formatRand(goal.earnedCents)} of {formatRand(goal.targetCents)}
                    </Text>
                  </View>
                  <ProgressBar percent={Math.max(3, goal.percent)} />
                </Pressable>
              ) : null}
            </SellerCard>
          </Animated.View>

          <SectionTitle title="Needs your attention" />
          {view.attention.length === 0 ? (
            <SellerCard testID="attention-empty">
              <Text style={styles.cardTitle}>You are all caught up</Text>
              <Text style={styles.cardHint}>New orders, low stock and unread messages show up here.</Text>
            </SellerCard>
          ) : (
            <View style={styles.list}>
              {view.attention.slice(0, 6).map((item, index) => (
                <Animated.View entering={FadeInDown.delay(180 + index * 60).duration(380)} exiting={FadeOutRight.duration(260)} key={item.id} layout={LinearTransition.springify().damping(20)}>
                  <AttentionCard canAct={item.kind !== "order" || view.canTrade} item={item} onAct={() => act(item)} onOpen={() => (item.kind === "order" ? go(`/seller/orders/${item.orderId}`) : item.kind === "stock" ? go(`/seller/products/${item.listingId}`) : go(`/seller/home/messages/${item.conversationId}`))} />
                </Animated.View>
              ))}
            </View>
          )}

          {sellers.length > 0 ? (
            <>
              <SectionTitle action={view.lowStock > 0 ? `${view.lowStock} low on stock` : "Inventory"} onAction={() => go("/seller/products/inventory")} title="Best sellers" />
              <BestSellers items={sellers} onOpen={(id) => go(id ? `/seller/products/${id}` : "/seller/products")} />
            </>
          ) : null}

          <SectionTitle title="Grow your shop" />
          <View style={styles.growth} testID="growth-hub">
            <GrowthTile delay={240} hint={best ? `Best: ${best.caption}` : "Show a product in a short video"} icon="film" label="Reels" onPress={() => go("/seller/products")} testID="growth-reels" value={`${liveReelCount(view.seller.reels)} live`} />
            <GrowthTile delay={280} hint={week.changePercent === null ? "Sales and best sellers" : `${week.changePercent >= 0 ? "+" : ""}${week.changePercent}% on last week`} icon="bar-chart-2" label="Analytics" onPress={() => go("/seller/account/analytics")} testID="growth-analytics" value={formatRand(week.thisWeekCents)} />
            <GrowthTile delay={320} hint={view.plan === "free" ? "Upgrade for reels and a lower fee" : "Manage your plan"} icon="award" label="Plan" onPress={() => go("/seller/account/plans")} testID="growth-plan" value={PLAN_NAMES[view.plan]} />
          </View>
        </>
      )}

      <RestockSheet listingId={restock} onClose={() => setRestock(null)} />
      <CloseEarlySheet onClose={() => setClosing(false)} visible={closing} />
    </SellerScreen>
  );
}

function GrowthTile({ delay, hint, icon, label, onPress, testID, value }: { icon: IconName; label: string; value: string; hint: string; onPress: () => void; delay: number; testID: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)}>
      <SellerCard onPress={onPress} style={styles.growthRow} testID={testID}>
        <View style={styles.growthIcon}>
          <Icon color={color.accent} name={icon} size={20} />
        </View>
        <View style={styles.growthText}>
          <Text style={styles.growthLabel}>{label}</Text>
          <Text numberOfLines={1} style={styles.cardHint}>
            {hint}
          </Text>
        </View>
        <Text style={styles.growthValue}>{value}</Text>
      </SellerCard>
    </Animated.View>
  );
}

function AttentionCard({ canAct, item, onAct, onOpen }: { item: Attention; canAct: boolean; onAct: () => void; onOpen: () => void }) {
  const look = KIND[item.kind];
  const [done, setDone] = useState(false);
  return (
    <SellerCard onPress={onOpen} style={styles.attention} testID={`attention-${item.id}`}>
      <View style={styles.attentionText}>
        <Pill label={look.label} tone={look.tone} />
        <Text numberOfLines={1} style={styles.attentionTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.cardHint}>
          {item.detail}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`${look.action}, ${item.title}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAct }}
        disabled={!canAct || done}
        onPress={() => {
          setDone(true);
          setTimeout(onAct, item.kind === "order" ? 380 : 0);
          if (item.kind !== "order") setTimeout(() => setDone(false), 400);
        }}
        style={[styles.action, !canAct && styles.actionOff, done && styles.actionDone]}
        testID={`attention-act-${item.id}`}
      >
        {done && item.kind === "order" ? <Icon color="#FFFFFF" name="check" size={18} /> : <RNText style={styles.actionText}>{look.action}</RNText>}
      </Pressable>
    </SellerCard>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: color.charcoal, borderRadius: 12, justifyContent: "center", minHeight: 40, minWidth: 82, paddingHorizontal: 16 },
  actionDone: { backgroundColor: "#2F8A57" },
  actionOff: { opacity: 0.4 },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  attention: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 84 },
  attentionText: { flex: 1, gap: 3 },
  attentionTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  cardHint: { color: SELLER.inkSoft, fontSize: 13 },
  cardTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  change: { color: "#2E7D5B", fontSize: 13, fontWeight: "700" },
  changeDown: { color: "#B4544A" },
  divider: { backgroundColor: "#E1E6E8", height: 1, marginVertical: 12 },
  early: { alignItems: "center", backgroundColor: color.cloudGrey, borderRadius: 14, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  earlyText: { color: color.slate, fontSize: 12, fontWeight: "700" },
  goal: { gap: 8, marginTop: 12 },
  goalTitle: { color: SELLER.ink, fontSize: 14, fontWeight: "800" },
  growth: { gap: 10 },
  growthIcon: { alignItems: "center", backgroundColor: color.sage, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  growthLabel: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  growthRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  growthText: { flex: 1, gap: 1 },
  growthValue: { color: color.accent, fontSize: 15, fontWeight: "800" },
  list: { gap: 10 },
  money: { color: SELLER.ink, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  result: { alignItems: "center", flexDirection: "row", gap: 12 },
  resultText: { flex: 1, gap: 1 },
  results: { gap: 10, marginTop: 16 },
  small: { color: SELLER.inkSoft, fontSize: 13 },
  status: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, boxShadow: "0 1px 4px rgba(25,27,29,0.08)", flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  statusText: { color: color.charcoal, fontSize: 13, fontWeight: "700" },
  today: { gap: 2 },
  todayText: { flex: 1, gap: 2 },
  todayTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  weekRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  weekValue: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
});
