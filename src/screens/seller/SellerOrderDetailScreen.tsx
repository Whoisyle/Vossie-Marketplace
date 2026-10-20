import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/components";
import { formatRand, initials } from "@/data/format";
import { haptic } from "@/lib/haptics";
import type { SellerOrder } from "@/seller/types";

import { SellerField } from "./fields";
import { useSeller } from "./hooks";
import { Confetti, SlideToConfirm, useShake } from "./motion";
import { DeclineSheet, OrderThumb, STATUS_PILL, whenLabel } from "./OrderParts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar } from "./ui";

/** One order: where it is up to, what was bought, who bought it, where to hand it over, and what it adds up to. */
export function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const view = useSeller();
  const order = view.seller.orders.find((item) => item.id === id);
  const [declining, setDeclining] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const shake = useShake();

  if (!order) {
    return (
      <SellerScreen testID="seller-order-missing">
        <SellerTopBar title="Order" />
        <SellerCard style={styles.missing}>
          <Text style={styles.itemTitle}>That order is not here any more.</Text>
          <SellerButton label="Back to orders" onPress={() => router.replace("/seller/orders" as Href)} variant="solid" />
        </SellerCard>
      </SellerScreen>
    );
  }

  const look = STATUS_PILL[order.status];
  const open = order.status === "new";

  return (
    <SellerScreen
      footer={
        order.status === "new" ? (
          <View style={styles.footer}>
            <SlideToConfirm label="Slide to accept" onConfirm={() => view.dispatch({ accept: true, id: order.id, type: "sellerRespondOrder" })} testID="slide-accept" />
            <Animated.View style={shake.style}>
              <SellerButton
                disabled={!view.canTrade}
                label="Decline"
                onPress={() => {
                  shake.play();
                  setTimeout(() => setDeclining(true), 320);
                }}
                size="lg"
                testID="decline-order"
                variant="glass"
              />
            </Animated.View>
          </View>
        ) : order.status === "accepted" || order.status === "preparing" ? (
          <SellerButton
            label={order.status === "accepted" ? "Start preparing" : "Mark ready"}
            onPress={() => view.dispatch({ id: order.id, to: order.status === "accepted" ? "preparing" : "ready", type: "sellerAdvanceOrder" })}
            size="lg"
            testID="advance-order"
            variant="glass"
          />
        ) : undefined
      }
      testID="seller-order-detail"
    >
      <SellerTopBar title={`Order ${order.number}`} />

      <Animated.View entering={FadeInDown.duration(340)}>
        <SellerCard style={styles.status} testID="order-status">
          <Pill label={look.label} tone={look.tone} />
          <Text style={styles.placed}>Placed {whenLabel(order.placedAt).toLowerCase()}</Text>
        </SellerCard>
      </Animated.View>

      <SellerHeading style={styles.heading}>Items</SellerHeading>
      <Animated.View entering={FadeInDown.delay(60).duration(340)}>
        <SellerCard style={styles.items}>
          {order.lines.map((line) => (
            <View key={`${line.title}-${line.optionLabel ?? ""}`} style={styles.item}>
              <OrderThumb listings={view.seller.listings} order={{ lines: [line] }} size={52} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{line.title}</Text>
                <Text style={styles.hint}>
                  {line.optionLabel ? `${line.optionLabel} ` : ""}x{line.quantity}
                </Text>
              </View>
              <Text style={styles.itemTitle}>{formatRand(line.unitPriceCents * line.quantity, { fixed: true })}</Text>
            </View>
          ))}
        </SellerCard>
      </Animated.View>

      <SellerHeading style={styles.heading}>Buyer</SellerHeading>
      <Animated.View entering={FadeInDown.delay(120).duration(340)}>
        <SellerCard style={styles.buyer} testID="order-buyer">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(order.buyerName)}</Text>
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{order.buyerName}</Text>
            <View style={styles.verified}>
              <Icon color="#2F8A57" name={order.buyerVerified ? "check-circle" : "user"} size={14} />
              <Text style={styles.hint}>{order.buyerVerified ? "Verified student" : "Student"}</Text>
            </View>
          </View>
        </SellerCard>
      </Animated.View>

      <SellerHeading style={styles.heading}>{order.fulfilment === "delivery" ? "Delivery" : "Collection"}</SellerHeading>
      <Animated.View entering={FadeInDown.delay(180).duration(340)}>
        <SellerCard style={styles.where} testID="order-where">
          <Text style={styles.itemTitle}>{order.fulfilmentLabel}</Text>
          <Text style={styles.hint}>
            {order.fulfilment === "delivery" ? "Deliver to" : "Pickup point"}: {order.place}
            {order.by ? ` by ${order.by}` : ""}
          </Text>
        </SellerCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(340)}>
        <SellerCard style={styles.totals} testID="order-totals">
          <TotalRow label="Subtotal" value={formatRand(order.subtotalCents, { fixed: true })} />
          <TotalRow label="Payment" value={order.paymentLabel} />
          <TotalRow bold label="Total" value={formatRand(order.totalCents, { fixed: true })} />
        </SellerCard>
      </Animated.View>

      {order.status === "ready" ? <HandOver onDone={() => setCelebrate(true)} order={order} /> : null}
      {order.status === "done" ? (
        <Animated.View entering={ZoomIn.duration(300)}>
          <SellerCard style={styles.done} testID="order-done">
            <Icon color="#2F8A57" name="check-circle" size={24} />
            <Text style={styles.itemTitle}>Handed over. {formatRand(order.subtotalCents, { fixed: true })} was added to your earnings.</Text>
          </SellerCard>
        </Animated.View>
      ) : null}
      {order.status === "declined" ? (
        <SellerCard style={styles.done}>
          <Icon color="#B4544A" name="x-circle" size={22} />
          <Text style={styles.itemTitle}>Declined{order.declineReason ? `: ${order.declineReason}` : ""}</Text>
        </SellerCard>
      ) : null}
      {open && !view.canTrade ? <Text style={styles.locked}>You can accept orders once you are approved.</Text> : null}

      <DeclineSheet
        onClose={() => setDeclining(false)}
        onDecline={(reason) => {
          view.dispatch({ accept: false, id: order.id, reason, type: "sellerRespondOrder" });
          router.back();
        }}
        order={declining ? order : null}
      />
      <Confetti coins play={celebrate} />
    </SellerScreen>
  );
}

/** The last step: the buyer reads out their six digits and the seller types them in. */
function HandOver({ onDone, order }: { order: SellerOrder; onDone: () => void }) {
  const { dispatch } = useSeller();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const check = () => {
    if (code.trim() !== order.handoffCode) {
      setError("That code does not match. Ask the buyer to read it out again.");
      haptic.error();
      return;
    }
    setError(undefined);
    dispatch({ id: order.id, type: "sellerCompleteOrder" });
    onDone();
  };
  return (
    <SellerCard style={styles.handover} testID="handover">
      <Text style={styles.itemTitle}>Hand over the order</Text>
      <Text style={styles.hint}>Ask {order.buyerName} for the six digit code in their order.</Text>
      <SellerField error={error} keyboardType="number-pad" label="Collection code" onChangeText={setCode} placeholder="000000" testID="handover-code" value={code} />
      <Text style={styles.demo}>Demo code: {order.handoffCode}</Text>
      <SellerButton disabled={code.trim().length !== 6} label="Confirm hand over" onPress={check} testID="handover-confirm" variant="solid" />
    </SellerCard>
  );
}

function TotalRow({ bold, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.total}>
      <Text style={bold ? styles.totalBold : styles.hint}>{label}</Text>
      <Text style={bold ? styles.totalBold : styles.totalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#5E8696", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  buyer: { alignItems: "center", flexDirection: "row", gap: 12 },
  demo: { color: SELLER.inkSoft, fontSize: 12 },
  done: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 14 },
  footer: { gap: 10 },
  handover: { gap: 10, marginTop: 14 },
  heading: { marginTop: 18 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  item: { alignItems: "center", flexDirection: "row", gap: 12 },
  itemText: { flex: 1, gap: 1 },
  itemTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  items: { gap: 10 },
  locked: { color: "#FFFFFF", fontSize: 13, marginTop: 12, textAlign: "center" },
  missing: { alignItems: "flex-start", gap: 12, marginTop: 20 },
  placed: { color: SELLER.ink, fontSize: 14 },
  status: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 14 },
  total: { flexDirection: "row", justifyContent: "space-between" },
  totalBold: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  totalValue: { color: SELLER.ink, fontSize: 14 },
  totals: { gap: 6, marginTop: 14 },
  verified: { alignItems: "center", flexDirection: "row", gap: 4 },
  where: { gap: 2 },
});
