import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressTrack,
  Screen,
  StatusBadge,
  useToast,
} from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { deliveryLabels, hasLiveMap } from "@/data/delivery";
import { getSeller } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { paymentLabels } from "../cart/payment";
import { CourierRatingSheet } from "./CourierRatingSheet";
import { ORDER_STEPS, progressStep, statusInfo } from "./orderStatus";


/** One order: status, progress, items, totals and a way to message the seller. */
export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [rateOpen, setRateOpen] = useState(false);
  const order = state.orders.find((item) => item.id === id);

  if (!order) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="My Orders"
          icon="alert-circle"
          onAction={() => router.replace("/activity/orders" as Href)}
          title="Order not found"
        />
      </Screen>
    );
  }

  const seller = getSeller(order.sellerId);
  const canRate = order.status === "delivered" && order.fulfilment === "delivery" && !order.courierRating;
  const info = statusInfo(order.status);
  const messageSeller = () => {
    if (!seller) return;
    dispatch({ conversationId: `seller-${seller.id}`, name: seller.name, orderId: order?.id, type: "openConversation" });
    router.push(`/account/inbox/seller-${seller.id}` as Href);
  };

  return (
    <Screen>
      <AppHeader back subtitle={`Placed ${dateAndTime(order.placedAt)}`} title={`Order ${order.number}`} />
      <Card style={styles.card} variant="soft">
        <View style={styles.row}>
          <Text style={text.cardTitle}>{seller?.name ?? "Seller"}</Text>
          <StatusBadge label={info.label} tone={info.tone} />
        </View>
        {order.status !== "cancelled" ? (
          <ProgressTrack current={progressStep(order)} label="Order progress" steps={ORDER_STEPS + 1} />
        ) : null}
        {order.etaMinutes && order.status !== "delivered" && order.status !== "cancelled" ? (
          <Text style={text.bodySmall}>Estimated {order.etaMinutes} min</Text>
        ) : null}
        {order.courier ? (
          <View style={styles.inline}>
            <Icon name="truck" size={16} />
            <Text style={text.bodySmall}>
              {order.courier.name} · {order.courier.vehicle} · {order.courier.rating.toFixed(1)}★
            </Text>
          </View>
        ) : null}
      </Card>

      <Text style={styles.heading}>Items</Text>
      <Card>
        {order.lines.map((line) => (
          <View key={`${line.listingId}-${line.optionLabel ?? ""}`} style={styles.row}>
            <Text numberOfLines={2} style={[text.body, styles.flex]}>
              {line.quantity} × {line.title}
              {line.optionLabel ? ` (${line.optionLabel})` : ""}
            </Text>
            <Text style={styles.amount}>{formatRand(line.unitPriceCents * line.quantity)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Line label="Subtotal" value={formatRand(order.subtotalCents)} />
        <Line label="Delivery" value={order.deliveryFeeCents ? formatRand(order.deliveryFeeCents) : "Free"} />
        {order.discountCents > 0 ? <Line label="Discounts" value={`- ${formatRand(order.discountCents)}`} /> : null}
        <Line bold label="Total" value={formatRand(order.totalCents, { fixed: true })} />
      </Card>

      <Text style={styles.heading}>{order.fulfilment === "delivery" ? "Delivery address" : "Collection point"}</Text>
      <Card>
        <Text style={text.body}>{order.address}</Text>
        <Text style={text.caption}>
          {order.deliveryMode ? `${deliveryLabels[order.deliveryMode]} · ` : ""}Paid with {paymentLabels[order.paymentMethod]}
        </Text>
      </Card>

      <View style={styles.cta}>
        {order.status !== "cancelled" ? (
          <Button
            fullWidth
            icon="users"
            label="Split the bill"
            onPress={() => router.push(`/activity/split/${order.id}` as Href)}
            style={styles.trackGap}
            testID="split-bill"
            variant="soft"
          />
        ) : null}
        {order.status !== "cancelled" ? (
          <Button
            fullWidth
            icon="file-text"
            label="View receipt"
            onPress={() => router.push(`/activity/receipt/${order.id}` as Href)}
            style={styles.trackGap}
            testID="view-receipt"
            variant="soft"
          />
        ) : null}
        {order.status === "delivered" ? (
          <Button
            fullWidth
            icon="repeat"
            label="Reorder"
            onPress={() => {
              dispatch({ orderId: order.id, type: "reorder" });
              toast.show("Added to your cart");
              router.push("/cart" as Href);
            }}
            style={styles.trackGap}
            testID="reorder"
          />
        ) : null}
        {canRate ? (
          <Button fullWidth icon="star" label="Rate courier and tip" onPress={() => setRateOpen(true)} style={styles.trackGap} testID="rate-courier" variant="soft" />
        ) : null}
        {hasLiveMap(order.deliveryMode ?? (order.fulfilment === "delivery" ? "campus-courier" : "collection")) && order.status !== "delivered" && order.status !== "cancelled" ? (
          <Button
            fullWidth
            icon="map"
            label="Track on map"
            onPress={() => router.push(`/activity/track/${order.id}` as Href)}
            style={styles.trackGap}
            testID="track-order"
          />
        ) : null}
        <Button fullWidth icon="message-circle" label="Message seller" onPress={messageSeller} variant="outline" />
      </View>
      <CourierRatingSheet onClose={() => setRateOpen(false)} order={order} visible={rateOpen} />
    </Screen>
  );
}

function Line({ bold = false, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={bold ? styles.boldLabel : text.bodySmall}>{label}</Text>
      <Text style={bold ? styles.boldLabel : styles.amount}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { color: color.text, fontSize: 13, fontWeight: "600" },
  boldLabel: { color: color.heading, fontSize: 16, fontWeight: "700" },
  card: { gap: space.sm, marginTop: space.sm },
  cta: { marginTop: space.lg },
  divider: { backgroundColor: color.divider, height: 1, marginVertical: space.xs },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  inline: { alignItems: "center", flexDirection: "row", gap: space.xs },
  trackGap: { marginBottom: space.xs },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 3 },
});
