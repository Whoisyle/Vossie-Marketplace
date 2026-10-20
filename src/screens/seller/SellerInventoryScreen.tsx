import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { Icon } from "@/components";
import { isLowStock } from "@/seller/selectors";

import { useSeller } from "./hooks";
import { PageTitle, StatTile } from "./parts";
import { SELLER, SellerCard, SellerScreen, SellerTopBar } from "./ui";

/** Inventory: how many of everything is left, with a plus and a minus to correct the count right here. */
export function SellerInventoryScreen() {
  const view = useSeller();
  const live = view.seller.listings.filter((item) => item.status === "published" || item.status === "paused");
  const counted = live.filter((item) => !item.unlimited);
  const out = counted.filter((item) => item.onHand === 0).length;
  const low = counted.filter((item) => isLowStock(item) && item.onHand > 0).length;
  const inStock = counted.length - out - low;
  const almost = counted.filter((item) => item.status === "published" && item.onHand > 0 && isLowStock(item))[0] ?? counted.find((item) => item.onHand === 0);

  return (
    <SellerScreen testID="seller-inventory">
      <SellerTopBar title="Inventory" />
      <PageTitle subtitle="Track stock levels" title="Inventory" />
      <View style={styles.tiles}>
        <StatTile label="In stock" testID="inv-in" value={inStock} />
        <StatTile label="Low" testID="inv-low" tone="danger" value={low} />
        <StatTile label="Out" testID="inv-out" tone="danger" value={out} />
      </View>

      {almost ? (
        <SellerCard style={styles.alert} testID="inv-alert">
          <Icon color="#B0680F" name="alert-triangle" size={20} />
          <Text style={styles.alertText}>
            {almost.title} is {almost.onHand === 0 ? "out of stock" : "almost out"}
          </Text>
        </SellerCard>
      ) : null}

      <Text style={styles.heading}>Update stock</Text>
      <View style={styles.list}>
        {counted.map((item, index) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(300)} key={item.id}>
            <SellerCard style={styles.row} testID={`stock-${item.id}`}>
              <View style={styles.thumb}>{item.artId && hasArt(item.artId) ? <ArtTile id={item.artId} inset={0.06} /> : <Icon color="#FFFFFF" name="package" size={20} />}</View>
              <View style={styles.text}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.title}
                </Text>
                <Text style={styles.sku}>{item.sku}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable accessibilityLabel={`Remove one ${item.title}`} accessibilityRole="button" disabled={item.onHand === 0} onPress={() => view.dispatch({ delta: -1, id: item.id, type: "sellerAdjustStock" })} style={[styles.step, item.onHand === 0 && styles.stepOff]} testID={`stock-minus-${item.id}`}>
                  <Icon color={SELLER.solid} name="minus" size={18} />
                </Pressable>
                <Text style={[styles.count, item.onHand <= 5 && styles.countLow]} testID={`stock-count-${item.id}`}>
                  {item.onHand}
                </Text>
                <Pressable accessibilityLabel={`Add one ${item.title}`} accessibilityRole="button" onPress={() => view.dispatch({ delta: 1, id: item.id, type: "sellerAdjustStock" })} style={styles.step} testID={`stock-plus-${item.id}`}>
                  <Icon color={SELLER.solid} name="plus" size={18} />
                </Pressable>
              </View>
            </SellerCard>
          </Animated.View>
        ))}
      </View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  alert: { alignItems: "center", backgroundColor: "#FCE9D0", flexDirection: "row", gap: 10, marginTop: 12 },
  alertText: { color: "#7A4A0C", flex: 1, fontSize: 14, fontWeight: "700" },
  count: { color: SELLER.ink, fontSize: 18, fontWeight: "800", minWidth: 28, textAlign: "center" },
  countLow: { color: "#B4544A" },
  heading: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 10, marginTop: 20 },
  list: { gap: 10 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: 12, padding: 12 },
  sku: { color: SELLER.inkSoft, fontSize: 12 },
  step: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  stepOff: { opacity: 0.4 },
  stepper: { alignItems: "center", flexDirection: "row", gap: 6 },
  text: { flex: 1, gap: 1 },
  thumb: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 12, height: 48, justifyContent: "center", overflow: "hidden", width: 48 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
