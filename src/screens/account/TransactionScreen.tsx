import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Icon, Screen, StatusBadge } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { balancesAfter, kindLabels, transactionKind } from "@/data/wallet";
import { arrivalText, ReceiptPaper } from "@/screens/cart/ReceiptPaper";
import { slotLabel } from "@/screens/cart/CheckoutScreen";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** One wallet transaction: the amount, status, reference and balance, and the receipt when it paid for an order. */
export function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useDemoStore();
  const tx = state.wallet.transactions.find((item) => item.id === id);

  if (!tx) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back to Wallet" icon="credit-card" onAction={() => router.replace("/account/wallet" as Href)} title="Transaction not found" />
      </Screen>
    );
  }

  const kind = transactionKind(tx);
  const money = tx.amountCents >= 0;
  const balance = balancesAfter(state.wallet.balanceCents, state.wallet.transactions)[tx.id] ?? 0;
  const order = tx.orderId ? state.orders.find((item) => item.id === tx.orderId) : undefined;
  const orders = order ? (order.groupId ? state.orders.filter((item) => item.groupId === order.groupId) : [order]) : [];
  const pending = tx.status === "pending";

  return (
    <Screen testID="transaction-screen">
      <AppHeader back subtitle={kindLabels[kind]} title="Transaction" />
      <View style={styles.hero}>
        <View style={[styles.icon, money ? styles.iconIn : styles.iconOut]}>
          <Icon color={money ? color.success : color.danger} name={money ? "arrow-down-left" : "arrow-up-right"} size={26} />
        </View>
        <Text style={[styles.amount, { color: money ? color.success : color.heading }]}>{formatRand(tx.amountCents, { fixed: true, signed: true })}</Text>
        <Text numberOfLines={2} style={styles.label}>
          {tx.label}
        </Text>
        <StatusBadge label={pending ? "Pending" : "Completed"} tone={pending ? "warning" : "success"} />
      </View>

      <Card style={styles.details} testID="transaction-details">
        <Detail label="Type" value={kindLabels[kind]} />
        <Detail label="Date and time" value={dateAndTime(tx.createdAt)} />
        <Detail label="Reference" value={tx.id.toUpperCase()} />
        <Detail label="Balance after" value={formatRand(balance, { fixed: true })} />
        {tx.detail ? <Detail label="Details" value={tx.detail} /> : null}
      </Card>

      {orders.length > 0 ? (
        <>
          <Text style={styles.heading}>Receipt</Text>
          <ReceiptPaper
            arrival={(item) => arrivalText(item, (iso) => slotLabel(iso))}
            method={orders[0]!.paymentMethod}
            number={orders[0]!.number}
            orders={orders}
            placedAt={orders[0]!.placedAt}
            totals={{
              deliveryFeeCents: orders.reduce((sum, item) => sum + item.deliveryFeeCents, 0),
              discountCents: orders.reduce((sum, item) => sum + item.discountCents, 0),
              subtotalCents: orders.reduce((sum, item) => sum + item.subtotalCents, 0),
              totalCents: orders.reduce((sum, item) => sum + item.totalCents, 0),
            }}
          />
          <Button fullWidth icon="file-text" label="Open full receipt" onPress={() => router.push(`/activity/receipt/${orders[0]!.id}` as Href)} style={styles.cta} testID="open-receipt" variant="outline" />
        </>
      ) : (
        <Text style={[text.bodySmall, styles.noReceipt]}>
          {kind === "top-up" ? "This top-up has no receipt. Your wallet statement above shows it." : "This transaction wasn't for an order, so there is no order receipt."}
        </Text>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={text.bodySmall}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 36, fontWeight: "800" },
  cta: { marginTop: space.sm },
  detail: { alignItems: "flex-start", flexDirection: "row", gap: space.md, justifyContent: "space-between", paddingVertical: 5 },
  detailValue: { color: color.heading, flexShrink: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  details: { gap: 2, marginTop: space.md },
  heading: { ...text.sectionTitle, marginTop: space.lg },
  hero: { alignItems: "center", gap: space.xs, marginTop: space.md },
  icon: { alignItems: "center", borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
  iconIn: { backgroundColor: color.successSoft },
  iconOut: { backgroundColor: color.dangerSoft },
  label: { color: color.textSecondary, fontSize: 15, textAlign: "center" },
  noReceipt: { marginTop: space.md, textAlign: "center" },
});
