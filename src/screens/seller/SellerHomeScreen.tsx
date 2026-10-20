import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { formatRand } from "@/data/format";
import { PLAN_NAMES } from "@/seller/plan";
import { bestReel, goalProgress, liveReelCount, type Attention } from "@/seller/selectors";

import { CloseEarlySheet } from "./CloseEarly";
import { useSeller, greeting } from "./hooks";
import { CountUpRand, useCountUp } from "./motion";
import { Pill, type PillTone, SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerIconButton, SellerScreen, Text } from "./ui";
import { RestockSheet } from "./RestockSheet";

const KIND: Record<Attention["kind"], { label: string; tone: PillTone; action: string }> = {
  message: { action: "Reply", label: "Message", tone: "success" },
  order: { action: "Accept", label: "New order", tone: "info" },
  stock: { action: "Restock", label: "Low stock", tone: "danger" },
};

/** Seller Home: the week's earnings, the three counts, and a short list of what needs doing now. */
export function SellerHomeScreen() {
  const router = useRouter();
  const view = useSeller();
  const [restock, setRestock] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [stamp] = useState(() => Date.now());
  const goal = goalProgress(view.seller, stamp);
  const { week } = view;
  const best = bestReel(view.seller.reels);

  const go = (path: string) => router.push(path as Href);
  const act = (item: Attention) => {
    if (item.kind === "order") view.dispatch({ accept: true, id: item.orderId, type: "sellerRespondOrder" });
    else if (item.kind === "stock") setRestock(item.listingId);
    else go(`/seller/home/messages/${item.conversationId}`);
  };

  return (
    <SellerScreen testID="seller-home">
      <SellerHeader right={<SellerIconButton badge={view.unreadAlerts} icon="bell" label={view.unreadAlerts ? "Notifications, unread" : "Notifications"} onPress={() => go("/seller/home/notifications")} testID="seller-bell" />} />

      <Animated.View entering={FadeInDown.duration(380)} style={styles.hello}>
        <Text style={styles.store}>{view.storeName}</Text>
        <Pressable accessibilityLabel={`${view.status.label}. Change operating times`} accessibilityRole="button" onPress={() => go("/seller/account/hours")} style={styles.status} testID="store-status">
          <View style={[styles.statusDot, { backgroundColor: view.status.open ? "#5BD08B" : "#F2B25C" }]} />
          <Text style={styles.statusText}>{view.status.label}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.greeting}>
          {greeting()}, {view.firstName}
        </Text>
        {view.status.open || view.status.reason === "early" ? (
          <Pressable accessibilityRole="button" onPress={() => setClosing(true)} style={styles.early} testID="close-early">
            <Icon color="#FFFFFF" name="moon" size={13} />
            <Text style={styles.earlyText}>{view.status.reason === "early" ? "Open again" : "Close early today"}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {goal ? (
        <Animated.View entering={FadeInDown.delay(40).duration(380)}>
          <SellerCard onPress={() => go("/seller/account/goals")} style={styles.goal} testID="goal-home">
            <View style={styles.goalRow}>
              <Text style={styles.goalTitle}>{goal.reached ? "Weekly goal reached" : "Weekly goal"}</Text>
              <Text style={styles.goalNumbers}>
                {formatRand(goal.earnedCents)} of {formatRand(goal.targetCents)}
              </Text>
            </View>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${Math.max(3, goal.percent)}%` }, goal.reached && styles.goalDone]} />
            </View>
            <Text style={styles.goalHint}>{goal.reached ? "Nice work. You hit it before the week ended." : `${formatRand(goal.remainingCents)} to go`}</Text>
          </SellerCard>
        </Animated.View>
      ) : null}

      {!view.canTrade ? (
        <Animated.View entering={FadeInDown.delay(60).duration(380)}>
          <SellerCard onPress={() => go("/seller/account/documents")} style={styles.banner} testID="verification-banner">
            <Icon color={SELLER.solid} name="shield" size={22} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Verification in review</Text>
              <Text style={styles.bannerHint}>You can set up listings now. Orders open once Vossie Operations approves you.</Text>
            </View>
            <Pill label="Pending" tone="warn" />
          </SellerCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(100).duration(420)}>
        <SellerCard style={styles.earnings} testID="earnings-card">
          <Text style={styles.small}>Earnings this week</Text>
          <CountUpRand cents={week.thisWeekCents} style={styles.money} />
          <View style={styles.earningsRow}>
            <Text style={[styles.small, styles.change]}>{week.changePercent === null ? "Your first week" : week.changePercent >= 0 ? `${week.changePercent}% more than last week` : `${Math.abs(week.changePercent)}% less than last week`}</Text>
            <SellerButton label="Withdraw" onPress={() => go("/seller/payouts")} size="sm" testID="home-withdraw" variant="solid" />
          </View>
        </SellerCard>
      </Animated.View>

      <View style={styles.tiles}>
        <Tile delay={160} label="New orders" onPress={() => go("/seller/orders")} testID="tile-orders" value={view.counts.new} />
        <Tile delay={200} label="To ship" onPress={() => go("/seller/orders")} testID="tile-ship" value={view.counts.accepted + view.counts.preparing + view.counts.ready} />
        <Tile delay={240} label="Low stock" onPress={() => go("/seller/products/inventory")} testID="tile-low" value={view.lowStock} />
        <Tile delay={280} label="Rating" onPress={() => go("/seller/account/reviews")} testID="tile-rating" value={view.rating.toFixed(1)} />
      </View>

      <SellerHeading>Needs your attention</SellerHeading>
      {view.attention.length === 0 ? (
        <SellerCard testID="attention-empty">
          <Text style={styles.cardTitle}>You are all caught up</Text>
          <Text style={styles.cardHint}>New orders, low stock and unread messages show up here.</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {view.attention.slice(0, 6).map((item, index) => (
            <Animated.View entering={FadeInDown.delay(320 + index * 60).duration(380)} exiting={FadeOutRight.duration(260)} key={item.id} layout={LinearTransition.springify().damping(20)}>
              <AttentionCard canAct={item.kind !== "order" || view.canTrade} item={item} onAct={() => act(item)} onOpen={() => (item.kind === "order" ? go(`/seller/orders/${item.orderId}`) : item.kind === "stock" ? go(`/seller/products/${item.listingId}`) : go(`/seller/home/messages/${item.conversationId}`))} />
            </Animated.View>
          ))}
        </View>
      )}

      <SellerHeading>Grow your shop</SellerHeading>
      <View style={styles.growth} testID="growth-hub">
        <GrowthTile delay={380} hint={best ? `Best: ${best.caption}` : "Show a product in a short video"} icon="film" label="Reels" onPress={() => go("/seller/products")} testID="growth-reels" value={`${liveReelCount(view.seller.reels)} live`} />
        <GrowthTile delay={420} hint={week.changePercent === null ? "Sales and best sellers" : `${week.changePercent >= 0 ? "+" : ""}${week.changePercent}% on last week`} icon="bar-chart-2" label="Analytics" onPress={() => go("/seller/account/analytics")} testID="growth-analytics" value={formatRand(week.thisWeekCents)} />
        <GrowthTile delay={460} hint={view.plan === "free" ? "Upgrade for reels and a lower fee" : "Manage your plan"} icon="award" label="Plan" onPress={() => go("/seller/account/plans")} testID="growth-plan" value={PLAN_NAMES[view.plan]} />
      </View>

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
          <Icon color={SELLER.solid} name={icon} size={20} />
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

function Tile({ delay, label, onPress, testID, value }: { value: number | string; label: string; onPress: () => void; delay: number; testID: string }) {
  const counted = useCountUp(typeof value === "number" ? value : 0, 600);
  const shown = typeof value === "number" ? counted : value;
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(380)} style={styles.tileWrap}>
      <SellerCard onPress={onPress} style={styles.tile} testID={testID}>
        <Text style={styles.tileValue}>{shown}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
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
        {done && item.kind === "order" ? <Icon color="#FFFFFF" name="check" size={18} /> : <Text style={styles.actionText}>{look.action}</Text>}
      </Pressable>
    </SellerCard>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: "#14232C", borderRadius: 10, justifyContent: "center", minHeight: 40, minWidth: 82, paddingHorizontal: 16 },
  actionDone: { backgroundColor: "#2F8A57" },
  actionOff: { opacity: 0.4 },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  attention: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 84 },
  attentionText: { flex: 1, gap: 3 },
  attentionTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  banner: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  bannerHint: { color: SELLER.inkSoft, fontSize: 13, lineHeight: 18 },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  cardHint: { color: SELLER.inkSoft, fontSize: 13 },
  cardTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  change: { flex: 1 },
  earnings: { borderRadius: 28, gap: 4, paddingBottom: 14 },
  earningsRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  greeting: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  hello: { marginBottom: 16, marginTop: 18 },
  list: { gap: 10 },
  money: { color: SELLER.ink, fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  small: { color: SELLER.inkSoft, fontSize: 13 },
  store: { color: "rgba(255,255,255,0.9)", fontSize: 16 },
  tile: { alignItems: "center", gap: 2, justifyContent: "center", minHeight: 96, padding: 10 },
  tileLabel: { color: SELLER.inkSoft, fontSize: 12, textAlign: "center" },
  tileValue: { color: SELLER.ink, fontSize: 30, fontWeight: "800" },
  tileWrap: { flexBasis: "47%", flexGrow: 1 },
  status: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, marginBottom: 4 },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  statusText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  early: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, flexDirection: "row", gap: 6, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6 },
  earlyText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  goal: { gap: 8, marginTop: 12 },
  goalDone: { backgroundColor: "#2F8A57" },
  goalFill: { backgroundColor: SELLER.solid, borderRadius: 5, height: 10 },
  goalHint: { color: SELLER.inkSoft, fontSize: 12 },
  goalNumbers: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
  goalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  goalTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  goalTrack: { backgroundColor: "#DCE6EA", borderRadius: 5, height: 10, overflow: "hidden" },
  growth: { gap: 10 },
  growthIcon: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  growthLabel: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  growthRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  growthText: { flex: 1, gap: 1 },
  growthValue: { color: SELLER.solid, fontSize: 15, fontWeight: "800" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
});
