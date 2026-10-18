import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <Pressable
      accessibilityHint="Opens the listing"
      accessibilityLabel={`${listing.title}, ${formatRand(listing.priceCents)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { height }, pressed && styles.pressed]}
      testID={`listing-card-${listing.id}`}
    >
      <Media radius={corner.md} source={listing.images[0]} style={StyleSheet.absoluteFill} />
      <View style={styles.heart}>
        <HeartButton
          active={favourite}
          onPress={onToggleFavourite}
          testID={`favourite-${listing.id}`}
        />
      </View>
      <View style={styles.strip}>
        <Text numberOfLines={1} style={styles.title}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          <Icon name="map-pin" size={10} color={color.onPrimary} />
          <Text numberOfLines={1} style={styles.meta}>
            {listing.location}
          </Text>
          <Text style={styles.price}>{formatRand(listing.priceCents)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: corner.md,
    flex: 1,
    overflow: "hidden",
  },
  heart: { position: "absolute", right: 4, top: 4 },
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
