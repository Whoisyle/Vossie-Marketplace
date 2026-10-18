import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Share, StyleSheet, View } from "react-native";

import { AppHeader, Button, EmptyState, Screen, useToast } from "@/components";
import { arrivalText, ReceiptPaper } from "@/screens/cart/ReceiptPaper";
import { slotLabel } from "@/screens/cart/CheckoutScreen";
import { paymentLabels } from "@/screens/cart/payment";
import { receiptText } from "@/screens/cart/ConfirmationScreen";
import { useDemoStore } from "@/state/DemoStore";
import { space } from "@/theme/tokens";

/** Opens the receipt of a past order again (all the orders that were paid together). */
export function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { state } = useDemoStore();
  const order = state.orders.find((item) => item.id === id);

  if (!order || order.status === "cancelled") {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="My Orders"
          icon="file-text"
          message={order ? "A cancelled order has no receipt." : "We couldn't find that order."}
          onAction={() => router.replace("/activity/orders" as Href)}
          title="No receipt"
        />
      </Screen>
    );
  }

  // orders paid in one checkout share a group, so their receipt is one slip
  const orders = order.groupId ? state.orders.filter((item) => item.groupId === order.groupId) : [order];
  const totals = {
    deliveryFeeCents: orders.reduce((sum, item) => sum + item.deliveryFeeCents, 0),
    discountCents: orders.reduce((sum, item) => sum + item.discountCents, 0),
    subtotalCents: orders.reduce((sum, item) => sum + item.subtotalCents, 0),
    totalCents: orders.reduce((sum, item) => sum + item.totalCents, 0),
  };
  const number = orders[0]!.number;

  const share = async () => {
    try {
      await Share.share({
        message: receiptText({ number, orders, paidWith: paymentLabels[order.paymentMethod], placedAt: order.placedAt, totalCents: totals.totalCents }),
      });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button fullWidth icon="share-2" label="Share receipt" onPress={share} testID="share-receipt" />
          <Button fullWidth label="View the order" onPress={() => router.push(`/activity/order/${order.id}` as Href)} variant="outline" />
        </View>
      }
      testID="receipt-screen"
    >
      <AppHeader back subtitle={number} title="Receipt" />
      <ReceiptPaper arrival={(item) => arrivalText(item, (iso) => slotLabel(iso))} method={order.paymentMethod} number={number} orders={orders} placedAt={order.placedAt} totals={totals} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.xs },
});
