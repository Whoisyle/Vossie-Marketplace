import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppHeader, Button, EmptyState, Icon, Screen, useToast } from "@/components";
import { deliveryLabels, hasLiveMap } from "@/data/delivery";
import { dateAndTime, formatRand } from "@/data/format";
import { getSeller } from "@/data/repository";
import type { Order } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { ease, spring } from "@/theme/motion";
import { color, space, text } from "@/theme/tokens";

import { slotLabel } from "./CheckoutScreen";
import { paymentLabels } from "./payment";
import { arrivalText as arrival, ReceiptPaper } from "./ReceiptPaper";

/** What the receipt says about when the order arrives. */
export function arrivalText(order: Pick<Order, "deliveryMode" | "etaMinutes" | "fulfilment"> & { scheduledFor?: string }): string {
  return arrival(order, (iso) => slotLabel(iso));
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
            <View style={styles.flex}>
              <Button fullWidth icon="users" label="Split bill" onPress={() => router.push(`/activity/split/${orders[0]?.id ?? ""}` as Href)} size="sm" testID="split-from-receipt" variant="soft" />
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

      <ReceiptPaper
        arrival={(order) => arrivalText(order)}
        delay={250}
        method={method}
        number={receipt.number}
        orders={orders}
        placedAt={receipt.placedAt}
        totals={receipt}
      />

      <Text style={styles.note}>You can open this receipt again any time from Activity or your order.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { color: color.heading, fontSize: 34, fontWeight: "800" },
  flex: { flex: 1 },
  footer: { gap: space.xs },
  footerRow: { flexDirection: "row", gap: space.xs },
  hero: { alignItems: "center", gap: 2, marginTop: space.sm },
  note: { ...text.caption, marginTop: space.md, textAlign: "center" },
  thanks: { ...text.pageTitle, textAlign: "center" },
  tick: { alignItems: "center", borderRadius: 40, height: 80, justifyContent: "center", overflow: "hidden", width: 80 },
  tickRing: { backgroundColor: "#3E8E6A", borderRadius: 40, height: 80, position: "absolute", width: 80 },
  tickWrap: { alignItems: "center", height: 96, justifyContent: "center", width: 96 },
});
