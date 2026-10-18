import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, StatusBadge, Wordmark } from "@/components";
import { deliveryLabels } from "@/data/delivery";
import { dateAndTime, formatRand } from "@/data/format";
import { orderPoints } from "@/data/points";
import { getSeller } from "@/data/repository";
import type { Order, PaymentMethod } from "@/data/types";
import { seeded } from "@/theme/motion";
import { color, corner, space, text } from "@/theme/tokens";

import { BrandMark } from "./BrandMark";
import { paymentLabels } from "./payment";

/** What the receipt says about when the order arrives. */
export function arrivalText(
  order: Pick<Order, "deliveryMode" | "etaMinutes" | "fulfilment"> & { scheduledFor?: string },
  scheduledLabel: (iso: string) => string,
): string {
  if (order.scheduledFor) return `Scheduled for ${scheduledLabel(order.scheduledFor)}`;
  if (order.deliveryMode === "hub-to-hub") return "1 to 2 days, collect at your campus hub";
  if (order.etaMinutes) return `About ${order.etaMinutes} min`;
  return order.fulfilment === "delivery" ? "On its way soon" : "Ready soon";
}

export type ReceiptTotals = { subtotalCents: number; deliveryFeeCents: number; discountCents: number; totalCents: number };

/** The paper-style receipt: header, payment, each store's items and delivery, totals, points and barcode. */
export function ReceiptPaper({
  arrival,
  delay = 0,
  method,
  number,
  orders,
  placedAt,
  totals,
}: {
  number: string;
  placedAt: string;
  orders: Order[];
  totals: ReceiptTotals;
  method: PaymentMethod | undefined;
  /** Turns a scheduled time into words; passed in so the receipt does not depend on the checkout screen. */
  arrival: (order: Order) => string;
  delay?: number;
}) {
  const earn = orders.reduce((sum, order) => sum + orderPoints(order), 0);
  const paidWith = method ? paymentLabels[method] : "your chosen method";
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.paper} testID="receipt-paper">
      <View style={styles.paperHead}>
        <Wordmark width={96} />
        <View style={styles.right}>
          <Text style={styles.number}>{number}</Text>
          <Text style={text.caption}>{dateAndTime(placedAt)}</Text>
        </View>
      </View>

      <View style={styles.paidRow}>
        {method ? <BrandMark kind={method} /> : null}
        <View style={styles.flex}>
          <Text style={text.caption}>Paid with</Text>
          <Text style={text.cardTitle}>{paidWith}</Text>
        </View>
        <StatusBadge icon="check-circle" label="Paid" tone="success" />
      </View>

      {orders.map((order) => (
        <View key={order.id} style={styles.orderBlock} testID={`receipt-order-${order.id}`}>
          <View style={styles.orderHead}>
            <Text numberOfLines={1} style={[text.cardTitle, styles.flex]}>
              {getSeller(order.sellerId)?.name ?? "Seller"}
            </Text>
            {order.deliveryMode ? <StatusBadge icon="truck" label={deliveryLabels[order.deliveryMode]} tone="info" /> : null}
          </View>
          {order.lines.map((line) => (
            <View key={`${line.listingId}-${line.optionLabel ?? ""}`} style={styles.line}>
              <Text numberOfLines={2} style={[text.body, styles.flex]}>
                {line.quantity} × {line.title}
                {line.optionLabel ? ` (${line.optionLabel})` : ""}
              </Text>
              <Text style={styles.value}>{formatRand(line.unitPriceCents * line.quantity)}</Text>
            </View>
          ))}
          <View style={styles.arrival}>
            <Icon color={color.textSecondary} name={order.fulfilment === "delivery" ? "clock" : "map-pin"} size={14} />
            <Text style={styles.arrivalText}>
              {arrival(order)} · {order.address}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.dashed} />
      <View style={styles.totals}>
        <Row label="Subtotal" value={formatRand(totals.subtotalCents)} />
        <Row label="Delivery" value={totals.deliveryFeeCents ? formatRand(totals.deliveryFeeCents) : "Free"} />
        {totals.discountCents > 0 ? <Row label="Discounts" value={`- ${formatRand(totals.discountCents)}`} /> : null}
        <Row bold label="Total paid" value={formatRand(totals.totalCents, { fixed: true })} />
      </View>

      <View style={styles.points} testID="receipt-points">
        <Icon color={color.ink} name="award" size={16} />
        <Text style={styles.pointsText}>
          {orders.every((order) => order.status === "delivered")
            ? `You earned ${earn} Vossie ${earn === 1 ? "point" : "points"} for this order.`
            : `You'll earn ${earn} Vossie ${earn === 1 ? "point" : "points"} when your order is delivered.`}
        </Text>
      </View>

      <View style={styles.dashed} />
      <View style={styles.barcode}>
        {Array.from({ length: 46 }, (_, index) => (
          <View key={index} style={[styles.bar, { width: 1 + Math.round(seeded(index + 2) * 3) }]} />
        ))}
      </View>
      <Text style={styles.barcodeText}>{number.replace("#", "VOSSIE-")}</Text>

      <View pointerEvents="none" style={styles.teeth}>
        {Array.from({ length: 24 }, (_, index) => (
          <View key={index} style={styles.tooth} />
        ))}
      </View>
    </Animated.View>
  );
}

function Row({ bold = false, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={bold ? styles.bold : text.bodySmall}>{label}</Text>
      <Text style={bold ? styles.bold : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arrival: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 2 },
  arrivalText: { color: color.textSecondary, flex: 1, fontSize: 12 },
  bar: { backgroundColor: color.ink, height: 40 },
  barcode: { alignItems: "center", flexDirection: "row", gap: 2, height: 40, justifyContent: "center", overflow: "hidden" },
  barcodeText: { color: color.textMuted, fontSize: 11, letterSpacing: 2, textAlign: "center" },
  bold: { color: color.heading, fontSize: 16, fontWeight: "800" },
  dashed: { borderColor: color.borderStrong, borderStyle: "dashed", borderTopWidth: 1.5, marginVertical: space.xs },
  flex: { flex: 1 },
  line: { alignItems: "flex-start", flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 2 },
  number: { color: color.heading, fontSize: 15, fontWeight: "800" },
  orderBlock: { gap: 4, marginTop: space.xs },
  orderHead: { alignItems: "center", flexDirection: "row", gap: space.xs },
  paidRow: { alignItems: "center", backgroundColor: color.surfaceSoft, borderCurve: "continuous", borderRadius: corner.md, flexDirection: "row", gap: space.sm, padding: space.sm },
  paper: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    boxShadow: "0 10px 26px rgba(30, 42, 56, 0.14)",
    gap: space.xs,
    marginTop: space.md,
    overflow: "hidden",
    paddingBottom: space.lg,
    paddingHorizontal: space.md,
    paddingTop: space.md,
  },
  paperHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  points: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.md, flexDirection: "row", gap: space.xs, padding: space.sm },
  pointsText: { color: color.ink, flex: 1, fontSize: 13, fontWeight: "600" },
  right: { alignItems: "flex-end", gap: 1 },
  teeth: { bottom: -1, flexDirection: "row", justifyContent: "space-between", left: 0, position: "absolute", right: 0 },
  tooth: { backgroundColor: color.background, borderRadius: 7, height: 14, transform: [{ translateY: 7 }], width: 14 },
  totals: { gap: 2 },
  value: { color: color.text, fontSize: 13, fontWeight: "600" },
});
