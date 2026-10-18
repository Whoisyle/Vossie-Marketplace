import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { AppHeader, Button, Card, EmptyState, Icon, Screen } from "@/components";
import { formatRand, longDate } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { spring } from "@/theme/motion";
import { color, space, text } from "@/theme/tokens";

import { paymentLabels } from "./payment";

/** Order confirmation shown after Pay Now, built from the demo receipt. */
export function ConfirmationScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const receipt = state.lastReceipt;
  const firstName = state.profile?.fullName.split(" ")[0] ?? "";
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const tickStyle = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ scale: pop.get() }] }));
  const hasReceipt = Boolean(receipt);
  useEffect(() => {
    if (!hasReceipt) return;
    haptic.success();
    pop.set(reduced ? 1 : withSpring(1, spring.bouncy));
  }, [hasReceipt, pop, reduced]);
  const rise = (delay: number) => FadeInDown.delay(delay).duration(380);
  const firstDelivery = state.orders.find((order) => receipt?.orderIds.includes(order.id) && order.fulfilment === "delivery");
  const method = state.orders.find((order) => receipt?.orderIds.includes(order.id))?.paymentMethod;

  if (!receipt) {
    return (
      <Screen>
        <AppHeader />
        <EmptyState
          actionLabel="Back to Home"
          icon="shopping-bag"
          message="Place an order to see its confirmation here."
          onAction={() => router.replace("/home")}
          title="No recent order"
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={<Button fullWidth label="Back to Home" onPress={() => router.replace("/home")} size="lg" testID="back-home" />}
    >
      <AppHeader />
      <View style={styles.hero}>
        <Animated.View style={[styles.tick, tickStyle]}>
          <Icon color={color.onPrimary} name="check" size={40} />
        </Animated.View>
        <Text accessibilityRole="header" style={styles.thanks}>
          Thank you{firstName ? `, ${firstName}` : ""}
        </Text>
      </View>

      <Animated.View entering={rise(260)}>
      <Card style={styles.card}>
        <Text style={text.cardTitle}>Order details</Text>
        <Row label="Order number" value={receipt.number} />
        <Row label="Order date" value={longDate(receipt.placedAt)} />
        {method ? <Row label="Paid with" value={paymentLabels[method]} /> : null}
        <Row label="Total items" value={`${receipt.itemCount} ${receipt.itemCount === 1 ? "Product" : "Products"}`} />
        <View style={styles.divider} />
        <Text style={text.cardTitle}>Details</Text>
        <Row label="Price" value={formatRand(receipt.subtotalCents)} />
        <Row label="Delivery" value={receipt.deliveryFeeCents ? formatRand(receipt.deliveryFeeCents) : "Free"} />
        {receipt.discountCents > 0 ? <Row label="Discounts" value={`- ${formatRand(receipt.discountCents)}`} /> : null}
        <Row bold label="Total price" value={formatRand(receipt.totalCents, { fixed: true })} />
      </Card>
      </Animated.View>

      <Animated.View entering={rise(480)}>
      <Text style={styles.note}>
        Note: if you need some help please contact customer services on the Help page.
      </Text>
      <Button
        label="Track my order"
        onPress={() => router.replace((firstDelivery ? `/activity/track/${firstDelivery.id}` : "/activity/orders") as Href)}
        style={styles.track}
        variant="outline"
      />
      </Animated.View>
    </Screen>
  );
}

function Row({ bold = false, label, value }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={bold ? styles.bold : text.bodySmall}>{label}</Text>
      <Text style={bold ? styles.bold : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { color: color.heading, fontSize: 15, fontWeight: "700" },
  card: { gap: space.xs, marginTop: space.md },
  divider: { backgroundColor: color.divider, height: 1, marginVertical: space.xs },
  hero: { alignItems: "center", gap: space.sm, marginTop: space.lg },
  note: { ...text.caption, marginTop: space.md },
  row: { flexDirection: "row", justifyContent: "space-between" },
  thanks: { ...text.pageTitle, textAlign: "center" },
  tick: {
    alignItems: "center",
    backgroundColor: color.success,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  track: { marginTop: space.md },
  value: { color: color.text, fontSize: 13, fontWeight: "600" },
});
