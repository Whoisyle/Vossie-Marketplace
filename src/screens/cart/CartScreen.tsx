import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Media, QuantityStepper, Screen } from "@/components";
import { formatRand } from "@/data/format";
import { getListing, getSeller } from "@/data/repository";
import { unitPrice, useCartTotals, useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** Cart tab: line items grouped by the buyer's basket with a checkout action. */
export function CartScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const totals = useCartTotals();

  if (state.cart.length === 0) {
    return (
      <Screen testID="cart-screen">
        <AppHeader title="Your cart" />
        <EmptyState
          actionLabel="Start Shopping"
          icon="shopping-cart"
          message="Items you add will show up here."
          onAction={() => router.navigate("/home")}
          title="Your cart is empty"
        />
        <Button
          fullWidth
          icon="users"
          label={state.group && state.group.status !== "placed" ? "Open your group order" : "Start a group order"}
          onPress={() => router.push("/cart/group" as Href)}
          testID="group-order"
          variant="soft"
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          fullWidth
          iconRight="arrow-right"
          label={`Checkout · ${formatRand(totals.subtotalCents)}`}
          onPress={() => router.push("/cart/checkout" as Href)}
          size="lg"
          testID="go-to-checkout"
        />
      }
      testID="cart-screen"
    >
      <AppHeader subtitle={`${totals.itemCount} ${totals.itemCount === 1 ? "item" : "items"}`} title="Your cart" />
      <View style={styles.list}>
        {state.cart.map((line) => {
          const listing = getListing(line.listingId);
          if (!listing) return null;
          const option = listing.options.find((item) => item.id === line.optionId);
          return (
            <Card key={line.id} style={styles.line} variant="soft">
              <View style={styles.thumb}>
                <Media radius={12} source={listing.images[0]} style={StyleSheet.absoluteFill} />
              </View>
              <View style={styles.info}>
                <Text numberOfLines={1} style={text.cardTitle}>
                  {listing.title}
                </Text>
                <Text numberOfLines={1} style={text.caption}>
                  {[option?.label, getSeller(listing.sellerId)?.name].filter(Boolean).join(" · ")}
                </Text>
                <View style={styles.bottomRow}>
                  <Text style={styles.price}>{formatRand(unitPrice(line) * line.quantity)}</Text>
                  <QuantityStepper
                    min={0}
                    onChange={(quantity) => dispatch({ lineId: line.id, quantity, type: "setCartQuantity" })}
                    value={line.quantity}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      <Text style={styles.note}>Delivery fees and discounts are shown at checkout.</Text>
      <Button
        fullWidth
        icon="users"
        label={state.group && state.group.status !== "placed" ? "Open your group order" : "Order with friends"}
        onPress={() => router.push("/cart/group" as Href)}
        style={styles.groupButton}
        testID="group-order"
        variant="soft"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  groupButton: { marginTop: space.md },
  info: { flex: 1, gap: 2 },
  line: { alignItems: "center", flexDirection: "row", gap: space.sm },
  list: { gap: space.sm, marginTop: space.sm },
  note: { ...text.caption, marginTop: space.md, textAlign: "center" },
  price: { color: color.text, fontSize: 15, fontWeight: "700" },
  thumb: { borderRadius: 12, height: 72, overflow: "hidden", width: 72 },
});
