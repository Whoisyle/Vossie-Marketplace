import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition, SlideInUp } from "react-native-reanimated";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { ordersInGroup, type OrderGroup } from "@/seller/selectors";
import type { SellerOrder } from "@/seller/types";

import { useSeller } from "./hooks";
import { useShake } from "./motion";
import { DeclineSheet, orderTitle, OrderThumb, STATUS_PILL, whenLabel } from "./OrderParts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeader, SellerScreen } from "./ui";

const CHIPS: { key: OrderGroup; label: string }[] = [
  { key: "new", label: "New" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

/** Seller Orders: filter by where an order is up to, accept or decline new ones, and move the rest along. */
export function SellerOrdersScreen() {
  const router = useRouter();
  const view = useSeller();
  const [group, setGroup] = useState<OrderGroup>("new");
  const [declining, setDeclining] = useState<SellerOrder | null>(null);
  // orders already on the page when it opened are not "arrivals"; anything that shows up later slides in
  const [first] = useState(() => new Set(view.seller.orders.map((item) => item.id)));
  const orders = ordersInGroup(view.seller.orders, group);

  return (
    <SellerScreen testID="seller-orders">
      <SellerHeader />
      <Text accessibilityRole="header" style={styles.title}>
        Orders
      </Text>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {CHIPS.map((chip) => {
          const count = view.counts[chip.key];
          const on = group === chip.key;
          return (
            <Pressable accessibilityLabel={`${chip.label}, ${count}`} accessibilityRole="tab" accessibilityState={{ selected: on }} key={chip.key} onPress={() => setGroup(chip.key)} style={[styles.chip, on && styles.chipOn]} testID={`chip-${chip.key}`}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {chip.label}
                {count > 0 && (chip.key === "new" || chip.key === "preparing" || chip.key === "ready") ? ` ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!view.canTrade ? (
        <SellerCard onPress={() => router.push("/seller/account/documents" as Href)} style={styles.note} testID="orders-locked">
          <Icon color={SELLER.solid} name="lock" size={18} />
          <Text style={styles.noteText}>You can take orders once Vossie Operations approves you.</Text>
        </SellerCard>
      ) : null}

      {orders.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(320)}>
          <SellerCard style={styles.empty} testID="orders-empty">
            <Icon color={SELLER.solid} name="inbox" size={28} />
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptyHint}>{group === "new" ? "New orders from students on your campus show up here." : "Orders you move along appear in this list."}</Text>
          </SellerCard>
        </Animated.View>
      ) : (
        <View style={styles.list}>
          {orders.map((item, index) => (
            <Animated.View
              entering={first.has(item.id) ? FadeInDown.delay(Math.min(index, 6) * 60).duration(360) : SlideInUp.springify().damping(16)}
              exiting={FadeOutRight.duration(260)}
              key={item.id}
              layout={LinearTransition.springify().damping(20)}
            >
              <OrderCard canAct={view.canTrade} fresh={!first.has(item.id)} onDecline={() => setDeclining(item)} order={item} />
            </Animated.View>
          ))}
        </View>
      )}

      <DeclineSheet
        onClose={() => setDeclining(null)}
        onDecline={(reason) => declining && view.dispatch({ accept: false, id: declining.id, reason, type: "sellerRespondOrder" })}
        order={declining}
      />
    </SellerScreen>
  );
}

function OrderCard({ canAct, fresh, onDecline, order }: { order: SellerOrder; canAct: boolean; fresh: boolean; onDecline: () => void }) {
  const router = useRouter();
  const { dispatch, seller } = useSeller();
  const shake = useShake();
  const [accepted, setAccepted] = useState(false);
  const look = STATUS_PILL[order.status];
  const open = () => router.push(`/seller/orders/${order.id}` as Href);

  return (
    <Animated.View style={shake.style}>
      <SellerCard onPress={open} style={[styles.card, fresh && styles.cardFresh]} testID={`order-${order.id}`}>
        <View style={styles.cardTop}>
          <Pill label={look.label} tone={look.tone} />
          <Text style={styles.number}>{order.number}</Text>
        </View>
        <View style={styles.cardBody}>
          <OrderThumb listings={seller.listings} order={order} />
          <View style={styles.cardText}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {orderTitle(order)}
            </Text>
            <Text numberOfLines={1} style={styles.cardHint}>
              {order.buyerName} · {order.fulfilmentLabel}
            </Text>
            <Text style={styles.cardHint}>{whenLabel(order.placedAt)}</Text>
          </View>
          <Text style={styles.price}>{formatRand(order.totalCents, { fixed: true })}</Text>
        </View>

        {order.status === "new" ? (
          <View style={styles.buttons}>
            <View style={styles.button}>
              <SellerButton
                disabled={!canAct || accepted}
                icon={accepted ? "check" : undefined}
                label={accepted ? "Accepted" : "Accept"}
                onPress={() => {
                  setAccepted(true);
                  setTimeout(() => dispatch({ accept: true, id: order.id, type: "sellerRespondOrder" }), 420);
                }}
                testID={`accept-${order.id}`}
                variant="solid"
              />
            </View>
            <View style={styles.button}>
              <SellerButton
                disabled={!canAct || accepted}
                label="Decline"
                onPress={() => {
                  shake.play();
                  setTimeout(onDecline, 320);
                }}
                testID={`decline-${order.id}`}
                variant="outline"
              />
            </View>
          </View>
        ) : null}
        {(order.status === "accepted" || order.status === "preparing") && order.fulfilment === "delivery" ? (
          <SellerButton label="Prepare order" onPress={() => router.push(`/seller/orders/prepare/${order.id}` as Href)} testID={`prepare-${order.id}`} variant="solid" />
        ) : null}
        {(order.status === "accepted" || order.status === "preparing") && order.fulfilment !== "delivery" ? (
          <SellerButton
            label={order.status === "accepted" ? "Start preparing" : "Mark ready"}
            onPress={() => dispatch({ id: order.id, to: order.status === "accepted" ? "preparing" : "ready", type: "sellerAdvanceOrder" })}
            testID={`advance-${order.id}`}
            variant="solid"
          />
        ) : null}
        {order.status === "ready" ? <SellerButton label={order.fulfilment === "delivery" ? "Hand to courier" : "Hand over"} onPress={order.fulfilment === "delivery" ? () => router.push(`/seller/orders/handover/${order.id}` as Href) : open} testID={`handover-${order.id}`} variant="solid" /> : null}
      </SellerCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1 },
  buttons: { flexDirection: "row", gap: 12, marginTop: 12 },
  card: { gap: 10 },
  cardBody: { alignItems: "center", flexDirection: "row", gap: 12 },
  cardFresh: { borderColor: "#FFE14A", borderWidth: 2 },
  cardHint: { color: SELLER.inkSoft, fontSize: 13 },
  cardText: { flex: 1, gap: 1 },
  cardTitle: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 20, minHeight: 38, paddingHorizontal: 16, paddingVertical: 9 },
  chipOn: { backgroundColor: "#FFFFFF" },
  chipScroll: { marginHorizontal: -20 },
  chipText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: SELLER.solid },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 28 },
  emptyHint: { color: SELLER.inkSoft, fontSize: 13, textAlign: "center" },
  emptyTitle: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  list: { gap: 12, marginTop: 14 },
  note: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  noteText: { color: SELLER.ink, flex: 1, fontSize: 13, fontWeight: "600" },
  number: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
  price: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12, marginTop: 18 },
});
