import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition, SlideInUp } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { LIMITS } from "@/seller/plan";
import { earlierOrders, ordersInGroup, type OrderGroup } from "@/seller/selectors";
import type { SellerOrder } from "@/seller/types";

import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { useShake } from "./motion";
import { DeclineSheet, orderTitle, OrderThumb, STATUS_PILL, whenLabel } from "./OrderParts";
import { UpgradeSheet } from "./SellerReelsScreens";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeader, SellerScreen, SellerWell, Text } from "./ui";

const CHIPS: { key: OrderGroup; label: string }[] = [
  { key: "new", label: "New" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Packing" },
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
  const tools = LIMITS[view.plan].tools;
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [locked, setLocked] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  // searching looks through every order, not only the chip that is chosen
  const orders = needle
    ? view.seller.orders
        .filter((item) => `${item.number} ${item.buyerName} ${item.lines.map((line) => line.title).join(" ")} ${item.place}`.toLowerCase().includes(needle))
        .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    : ordersInGroup(view.seller.orders, group);
  const waiting = view.counts.new;

  return (
    <SellerScreen tone="white" testID="seller-orders">
      <SellerHeader />
      <Text accessibilityRole="header" style={styles.title}>
        Orders
      </Text>
      <Chips
        items={CHIPS.map((chip) => ({ count: chip.key === "done" || chip.key === "cancelled" ? 0 : view.counts[chip.key], key: chip.key, label: chip.label }))}
        onChange={setGroup}
        value={group}
      />

      {tools.orderSearch ? (
        <SellerWell style={styles.search}>
          <Icon color={SELLER.inkSoft} name="search" size={18} />
          <TextInput accessibilityLabel="Search orders" autoCorrect={false} onChangeText={setQuery} placeholder="Search by order, buyer or item" placeholderTextColor="#8A99A1" style={styles.searchInput} testID="order-search" value={query} />
          {query ? (
            <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={8} onPress={() => setQuery("")}>
              <Icon color={SELLER.inkSoft} name="x" size={18} />
            </Pressable>
          ) : null}
        </SellerWell>
      ) : (
        <SellerCard onPress={() => setLocked(true)} style={styles.lockedSearch} testID="order-search-locked">
          <Icon color={SELLER.inkSoft} name="search" size={18} />
          <Text style={styles.noteText}>Search your orders</Text>
          <Pill label="Plus" tone="info" />
        </SellerCard>
      )}

      {group === "new" && !needle && waiting > 1 ? (
        <View style={styles.bulk}>
          <SellerButton
            icon={tools.bulkAccept ? "check-circle" : "lock"}
            label={`Accept all ${waiting}`}
            onPress={() => (tools.bulkAccept ? setConfirmAll(true) : setLocked(true))}
            size="sm"
            testID="accept-all"
            variant={tools.bulkAccept ? "solid" : "light"}
          />
          {!tools.bulkAccept ? <Pill label="Plus" tone="info" /> : null}
        </View>
      ) : null}

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
              <OrderCard canAct={view.canTrade} fresh={!first.has(item.id)} onDecline={() => setDeclining(item)} order={item} repeat={tools.returningBuyers ? earlierOrders(view.seller.orders, item) : 0} />
            </Animated.View>
          ))}
        </View>
      )}

      <UpgradeSheet kind="orderTools" onClose={() => setLocked(false)} visible={locked} />
      <Sheet onClose={() => setConfirmAll(false)} title={`Accept all ${waiting} orders?`} visible={confirmAll}>
        <Text style={styles.confirmText}>Every waiting order is accepted and the buyers are told. You still pack and hand them over one by one.</Text>
        <Button
          fullWidth
          label={`Accept ${waiting} orders`}
          onPress={() => {
            view.dispatch({ type: "sellerBulkAccept" });
            setConfirmAll(false);
            toast.show(`${waiting} orders accepted`);
          }}
          testID="confirm-accept-all"
        />
      </Sheet>
      <DeclineSheet
        onClose={() => setDeclining(null)}
        onDecline={(reason) => declining && view.dispatch({ accept: false, id: declining.id, reason, type: "sellerRespondOrder" })}
        order={declining}
      />
    </SellerScreen>
  );
}

function OrderCard({ canAct, fresh, onDecline, order, repeat }: { order: SellerOrder; canAct: boolean; fresh: boolean; onDecline: () => void; repeat: number }) {
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
          <View style={styles.pills}>
            <Pill label={look.label} tone={look.tone} />
            {order.queued ? <Pill label="Queued" tone="warn" /> : null}
            {repeat > 0 ? <Pill label={`Returning · order ${repeat + 1}`} tone="success" /> : null}
          </View>
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
  bulk: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 8 },
  button: { flex: 1 },
  confirmText: { color: SELLER.inkSoft, fontSize: 14, lineHeight: 20 },
  lockedSearch: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 8, paddingVertical: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 6 },
  search: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 8, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { color: SELLER.ink, flex: 1, fontSize: 15, paddingVertical: 8 },
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
