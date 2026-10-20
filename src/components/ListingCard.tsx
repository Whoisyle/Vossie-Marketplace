import { Pressable, StyleSheet, Text, View } from "react-native";

import { dealFor, effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import type { Listing } from "@/data/types";
import { color, corner, space } from "@/theme/tokens";

import { HeartButton } from "./HeartButton";
import { Icon } from "./Icon";
import { Media } from "./Media";

type ListingCardProps = {
  listing: Listing;
  favourite: boolean;
  onPress: () => void;
  onToggleFavourite: () => void;
  height?: number;
};

/** Square photo card with a heart and a location/price strip, as in Home. */
export function ListingCard({
  favourite,
  height = 168,
  listing,
  onPress,
  onToggleFavourite,
}: ListingCardProps) {
  const percent = dealFor(listing.id);
  const price = effectivePrice(listing);
  return (
    <View style={[styles.card, { height }]}>
      <Pressable
        accessibilityHint="Opens the listing"
        accessibilityLabel={`${listing.title}, ${formatRand(price)}${percent ? `, ${percent} percent off` : ""}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          styles.press,
          pressed && styles.pressed,
        ]}
        testID={`listing-card-${listing.id}`}
      >
        <Media
          radius={corner.md}
          source={listing.images[0]}
          style={StyleSheet.absoluteFill}
        />
        {percent > 0 ? (
          <View style={styles.deal}>
            <Text style={styles.dealText}>-{percent}%</Text>
          </View>
        ) : null}
        <View style={styles.strip}>
          <Text numberOfLines={1} style={styles.title}>
            {listing.title}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={10} color={color.onPrimary} />
            <Text numberOfLines={1} style={styles.meta}>
              {listing.location}
            </Text>
            {percent > 0 ? (
              <Text style={styles.was}>{formatRand(listing.priceCents)}</Text>
            ) : null}
            <Text style={styles.price}>{formatRand(price)}</Text>
          </View>
        </View>
      </Pressable>
      {/* a sibling of the card, not a child, so a web page never has a button inside a button */}
      <View style={styles.heart}>
        <HeartButton
          active={favourite}
          onPress={onToggleFavourite}
          testID={`favourite-${listing.id}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: corner.md, overflow: "hidden" },
  card: {
    borderRadius: corner.md,
    flex: 1,
    overflow: "hidden",
  },
  deal: {
    backgroundColor: color.mist,
    borderRadius: 10,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: "absolute",
    top: 8,
  },
  dealText: { color: color.ink, fontSize: 11, fontWeight: "800" },
  heart: { position: "absolute", right: 4, top: 4 },
  was: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    textDecorationLine: "line-through",
  },
  meta: { color: color.onPrimary, flex: 1, fontSize: 10 },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  pressed: { opacity: 0.85 },
  price: { color: color.onPrimary, fontSize: 12, fontWeight: "700" },
  strip: {
    backgroundColor: "rgba(30, 43, 51, 0.55)",
    bottom: 0,
    gap: 2,
    left: 0,
    paddingHorizontal: space.xs,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
  },
  title: { color: color.onPrimary, fontSize: 12, fontWeight: "600" },
});
