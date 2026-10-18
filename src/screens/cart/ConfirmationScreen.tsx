import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Icon, Screen } from "@/components";
import { formatRand, longDate } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** Order confirmation shown after Pay Now, built from the demo receipt. */
export function ConfirmationScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const receipt = state.lastReceipt;
  const firstName = state.profile?.fullName.split(" ")[0] ?? "";

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
        <View style={styles.tick}>
          <Icon color={color.onPrimary} name="check" size={40} />
        </View>
        <Text accessibilityRole="header" style={styles.thanks}>
          Thank you{firstName ? `, ${firstName}` : ""}
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={text.cardTitle}>Order details</Text>
        <Row label="Order number" value={receipt.number} />
        <Row label="Order date" value={longDate(receipt.placedAt)} />
        <Row label="Total items" value={`${receipt.itemCount} ${receipt.itemCount === 1 ? "Product" : "Products"}`} />
        <View style={styles.divider} />
        <Text style={text.cardTitle}>Details</Text>
        <Row label="Price" value={formatRand(receipt.subtotalCents)} />
        <Row label="Delivery" value={receipt.deliveryFeeCents ? formatRand(receipt.deliveryFeeCents) : "Free"} />
        {receipt.discountCents > 0 ? <Row label="Discounts" value={`- ${formatRand(receipt.discountCents)}`} /> : null}
        <Row bold label="Total price" value={formatRand(receipt.totalCents, { fixed: true })} />
      </Card>

      <Text style={styles.note}>
        Note: if you need some help please contact customer services on the Help page.
      </Text>
      <Button
        label="Track my order"
        onPress={() => router.replace("/activity/orders" as Href)}
        style={styles.track}
        variant="outline"
      />
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
