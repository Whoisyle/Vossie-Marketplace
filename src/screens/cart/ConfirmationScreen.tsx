import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppHeader, Button, EmptyState, Icon, Screen, StatusBadge, Wordmark, useToast } from "@/components";
import { deliveryLabels, hasLiveMap } from "@/data/delivery";
import { dateAndTime, formatRand } from "@/data/format";
import { pointsForOrder } from "@/data/points";
import { getSeller } from "@/data/repository";
import type { Order } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { ease, seeded, spring } from "@/theme/motion";
import { color, corner, space, text } from "@/theme/tokens";

import { BrandMark } from "./BrandMark";
import { paymentLabels } from "./payment";

/** What the receipt says about when the order arrives. */
export function arrivalText(order: Pick<Order, "deliveryMode" | "etaMinutes" | "fulfilment">): string {
  if (order.deliveryMode === "hub-to-hub") return "1 to 2 days, collect at your campus hub";
  if (order.etaMinutes) return `About ${order.etaMinutes} min`;
  return order.fulfilment === "delivery" ? "On its way soon" : "Ready soon";
}

/** The plain-text receipt used by Share. */
export function receiptText(input: { number: string; placedAt: string; orders: Order[]; totalCents: number; paidWith: string }): string {
  const lines = input.orders.flatMap((order) => [
    `${getSeller(order.sellerId)?.name ?? "Seller"} (${order.deliveryMode ? deliveryLabels[order.deliveryMode] : "Order"})`,
    ...order.lines.map((line) => `  ${line.quantity} x ${line.title}  ${formatRand(line.unitPriceCents * line.quantity)}`),
  ]);
  return [
    `Vossie receipt ${input.number}`,
    dateAndTime(input.placedAt),
    "",
    ...lines,
    "",
    `Total ${formatRand(input.totalCents, { fixed: true })} paid with ${input.paidWith}`,
  ].join("\n");
}

/** Order confirmation: a paper-style receipt with the items, delivery, payment, totals and points to come. */
export function ConfirmationScreen() {
  const router = useRouter();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { state } = useDemoStore();
  const receipt = state.lastReceipt;
  const firstName = state.profile?.fullName.split(" ")[0] ?? "";
  const orders = state.orders.filter((order) => receipt?.orderIds.includes(order.id));
  const method = orders[0]?.paymentMethod;
  const door = orders.find((order) => order.deliveryMode && hasLiveMap(order.deliveryMode));

  const pop = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(0);
  const tickStyle = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ scale: pop.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - ring.get()), transform: [{ scale: 1 + ring.get() * 1.6 }] }));
  const hasReceipt = Boolean(receipt);
  useEffect(() => {
    if (!hasReceipt) return;
    haptic.success();
    pop.set(reduced ? 1 : withSequence(withTiming(0, { duration: 0 }), withSpring(1, spring.bouncy)));
    ring.set(reduced ? 0 : withDelay(150, withTiming(1, { duration: 1000, easing: ease.out })));
  }, [hasReceipt, pop, reduced, ring]);

  if (!receipt) {
    return (
      <Screen>
        <AppHeader />
        <EmptyState
          actionLabel="Back to Home"
          icon="shopping-bag"
          message="Place an order to see its receipt here."
          onAction={() => router.replace("/home")}
          title="No recent order"
        />
      </Screen>
    );
  }

  const rise = (delay: number) => FadeInDown.delay(delay).duration(400);
  const earn = pointsForOrder(receipt.totalCents);
  const paidWith = method ? paymentLabels[method] : "your chosen method";

  const share = async () => {
    try {
      await Share.share({ message: receiptText({ number: receipt.number, orders, paidWith, placedAt: receipt.placedAt, totalCents: receipt.totalCents }) });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            fullWidth
            icon={door ? "map" : "package"}
            label={door ? "Track my order" : "View my orders"}
            onPress={() => router.replace((door ? `/activity/track/${door.id}` : "/activity/orders") as Href)}
            size="lg"
            testID="track-order-cta"
          />
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <Button fullWidth icon="share-2" label="Share receipt" onPress={share} size="sm" variant="outline" />
            </View>
            <View style={styles.flex}>
              <Button fullWidth label="Back to Home" onPress={() => router.replace("/home")} size="sm" testID="back-home" variant="soft" />
            </View>
          </View>
        </View>
      }
    >
      <AppHeader />
      <View style={styles.hero}>
        <View style={styles.tickWrap}>
          {!reduced ? <Animated.View style={[styles.tickRing, ringStyle]} /> : null}
          <Animated.View style={[styles.tick, tickStyle]}>
            <LinearGradient colors={["#3E8E6A", "#2F7A58"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
            <Icon color={color.onPrimary} name="check" size={38} />
          </Animated.View>
        </View>
        <Text accessibilityRole="header" style={styles.thanks}>
          Thank you{firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.amount}>{formatRand(receipt.totalCents, { fixed: true })}</Text>
        <Text style={text.bodySmall}>Payment received</Text>
      </View>

      <Animated.View entering={rise(250)} style={styles.paper} testID="receipt-paper">
        <View style={styles.paperHead}>
          <Wordmark width={96} />
          <View style={styles.right}>
            <Text style={styles.number}>{receipt.number}</Text>
            <Text style={text.caption}>{dateAndTime(receipt.placedAt)}</Text>
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
                {arrivalText(order)} · {order.address}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.dashed} />
        <View style={styles.totals}>
          <Row label="Subtotal" value={formatRand(receipt.subtotalCents)} />
          <Row label="Delivery" value={receipt.deliveryFeeCents ? formatRand(receipt.deliveryFeeCents) : "Free"} />
          {receipt.discountCents > 0 ? <Row label="Discounts" value={`- ${formatRand(receipt.discountCents)}`} /> : null}
          <Row bold label="Total paid" value={formatRand(receipt.totalCents, { fixed: true })} />
        </View>

        <View style={styles.points} testID="receipt-points">
          <Icon color={color.ink} name="award" size={16} />
          <Text style={styles.pointsText}>
            You&apos;ll earn {earn} Vossie {earn === 1 ? "point" : "points"} when your order is delivered.
          </Text>
        </View>

        <View style={styles.dashed} />
        <View style={styles.barcode}>
          {Array.from({ length: 46 }, (_, index) => (
            <View key={index} style={[styles.bar, { width: 1 + Math.round(seeded(index + 2) * 3) }]} />
          ))}
        </View>
        <Text style={styles.barcodeText}>{receipt.number.replace("#", "VOSSIE-")}</Text>

        <View pointerEvents="none" style={styles.teeth}>
          {Array.from({ length: 24 }, (_, index) => (
            <View key={index} style={styles.tooth} />
          ))}
        </View>
      </Animated.View>

      <Text style={styles.note}>Need help with this order? Open Help from your Account.</Text>
    </Screen>
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
  amount: { color: color.heading, fontSize: 34, fontWeight: "800" },
  arrival: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 2 },
  arrivalText: { color: color.textSecondary, flex: 1, fontSize: 12 },
  bar: { backgroundColor: color.ink, height: 40 },
  barcode: { alignItems: "center", flexDirection: "row", gap: 2, height: 40, justifyContent: "center", overflow: "hidden" },
  barcodeText: { color: color.textMuted, fontSize: 11, letterSpacing: 2, textAlign: "center" },
  bold: { color: color.heading, fontSize: 16, fontWeight: "800" },
  dashed: { borderColor: color.borderStrong, borderStyle: "dashed", borderTopWidth: 1.5, marginVertical: space.xs },
  flex: { flex: 1 },
  footer: { gap: space.xs },
  footerRow: { flexDirection: "row", gap: space.xs },
  hero: { alignItems: "center", gap: 2, marginTop: space.sm },
  line: { alignItems: "flex-start", flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 2 },
  note: { ...text.caption, marginTop: space.md, textAlign: "center" },
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
  thanks: { ...text.pageTitle, textAlign: "center" },
  tick: { alignItems: "center", borderRadius: 40, height: 80, justifyContent: "center", overflow: "hidden", width: 80 },
  tickRing: { backgroundColor: "#3E8E6A", borderRadius: 40, height: 80, position: "absolute", width: 80 },
  tickWrap: { alignItems: "center", height: 96, justifyContent: "center", width: 96 },
  tooth: { backgroundColor: color.background, borderRadius: 7, height: 14, transform: [{ translateY: 7 }], width: 14 },
  totals: { gap: 2 },
  value: { color: color.text, fontSize: 13, fontWeight: "600" },
});

