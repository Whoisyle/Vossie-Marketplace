import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from "react-native-reanimated";

import { Icon } from "@/components";
import type { Attention } from "@/seller/selectors";

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
  const { week } = view;

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
        <Text accessibilityRole="header" style={styles.greeting}>
          {greeting()}, {view.firstName}
        </Text>
      </Animated.View>

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

      <RestockSheet listingId={restock} onClose={() => setRestock(null)} />
    </SellerScreen>
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
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
});
