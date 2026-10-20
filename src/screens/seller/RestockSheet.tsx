import { StyleSheet, Text, View } from "react-native";

import { Button, Sheet, useToast } from "@/components";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** Quick restock: how many are left, and buttons to add ten, twenty or fifty. Shown from Home and the listings. */
export function RestockSheet({ listingId, onClose }: { listingId: string | null; onClose: () => void }) {
  const { dispatch, state } = useDemoStore();
  const toast = useToast();
  const listing = state.seller.listings.find((item) => item.id === listingId);
  return (
    <Sheet onClose={onClose} title={listing ? `Restock ${listing.title}` : "Restock"} visible={Boolean(listing)}>
      {listing ? (
        <>
          <Text style={text.body}>{listing.unlimited ? "This listing has no stock limit." : `${listing.onHand} left in stock.`}</Text>
          <View style={styles.row}>
            {[10, 20, 50].map((quantity) => (
              <Button
                key={quantity}
                label={`+${quantity}`}
                onPress={() => {
                  dispatch({ id: listing.id, quantity, type: "sellerRestock" });
                  toast.show(`${listing.title}: ${quantity} added`);
                  onClose();
                }}
                size="md"
                testID={`restock-${quantity}`}
                variant="soft"
              />
            ))}
          </View>
          <Text style={styles.note}>Buyers see the new amount straight away.</Text>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { color: color.textMuted, fontSize: 13 },
  row: { flexDirection: "row", gap: space.sm },
});
