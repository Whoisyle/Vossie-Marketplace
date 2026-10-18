import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  EmptyState,
  HeartButton,
  Icon,
  Media,
  QuantityStepper,
  Screen,
  StarRating,
  useToast,
} from "@/components";
import { dealFor, effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { getListing, getSeller } from "@/data/repository";
import { useDetail } from "@/lib/paths";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** Listing detail: gallery, seller, options, quantity and add to cart. */
export function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const open = useDetail();
  const { dispatch, state } = useDemoStore();
  const listing = getListing(id);
  const seller = listing ? getSeller(listing.sellerId) : undefined;
  const [imageIndex, setImageIndex] = useState(0);
  const [optionId, setOptionId] = useState<string | undefined>(
    listing?.options[1]?.id ?? listing?.options[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);

  // remember what was looked at for Home's recents and recommendations
  useEffect(() => {
    if (id) dispatch({ listingId: id, type: "viewListing" });
  }, [dispatch, id]);

  if (!listing) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="Back to Home"
          icon="alert-circle"
          message="This listing may have been removed."
          onAction={() => router.replace("/home")}
          title="Listing not found"
        />
      </Screen>
    );
  }

  const option = listing.options.find((item) => item.id === optionId);
  const percent = dealFor(listing.id);
  const unit = effectivePrice(listing, option?.priceCents ?? listing.priceCents);
  const favourite = state.favourites.includes(listing.id);
  const following = seller ? state.following.includes(seller.id) : false;
  const thumbs = listing.images.length > 1 ? listing.images : [];
  const imageCount = Math.max(listing.images.length, 1);

  const addToCart = () => {
    dispatch({ listingId: listing.id, optionId, quantity, type: "addToCart" });
    toast.show(`${quantity} × ${listing.title} added to cart`);
  };
  const message = () => {
    if (!seller) return;
    dispatch({ conversationId: `seller-${seller.id}`, name: seller.name, type: "openConversation" });
    router.push(`/account/inbox/seller-${seller.id}` as Href);
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <QuantityStepper onChange={setQuantity} value={quantity} />
          <View style={styles.flex}>
            <Button
              fullWidth
              icon="shopping-cart"
              label={`Add to Cart · ${formatRand(unit * quantity)}`}
              onPress={addToCart}
              testID="add-to-cart"
            />
          </View>
        </View>
      }
    >
      <AppHeader back />
      <View style={styles.gallery}>
        <View style={styles.hero}>
          <Media
            accessibilityLabel={listing.title}
            radius={corner.md}
            source={listing.images[imageIndex]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {imageIndex + 1}/{imageCount}
            </Text>
          </View>
        </View>
        {thumbs.length > 0 ? (
          <View style={styles.thumbs}>
            {thumbs.slice(0, 3).map((source, index) => (
              <Pressable
                accessibilityLabel={`Photo ${index + 1}`}
                accessibilityRole="button"
                key={index}
                onPress={() => setImageIndex(index)}
                style={styles.thumb}
              >
                <Media radius={corner.sm} source={source} style={StyleSheet.absoluteFill} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>
            {listing.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatRand(unit)}</Text>
            {percent > 0 ? (
              <>
                <Text style={styles.was}>{formatRand(option?.priceCents ?? listing.priceCents)}</Text>
                <View style={styles.dealPill}>
                  <Text style={styles.dealPillText}>-{percent}%</Text>
                </View>
              </>
            ) : null}
          </View>
          <Pressable
            accessibilityHint="Opens ratings and reviews"
            accessibilityLabel={`${listing.rating.toFixed(1)} stars, ${listing.ratingCount} reviews`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push(open("review", listing.id))}
            style={styles.ratingRow}
            testID="open-reviews"
          >
            <StarRating size={15} value={listing.rating} />
            <Text style={text.bodySmall}>
              {listing.rating.toFixed(1)} ({listing.ratingCount})
            </Text>
            <Text style={styles.reviewLink}>Reviews</Text>
            <Icon color={color.link} name="chevron-right" size={14} />
          </Pressable>
        </View>
        <HeartButton
          active={favourite}
          idleColor={color.textSecondary}
          onPress={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
        />
      </View>

      <View style={styles.pills}>
        <Info icon="clock" label={listing.openHours} />
        <Info icon="package" label={`Ready in ${listing.pickupTime}`} />
        <Info icon="map-pin" label={listing.location} />
      </View>

      {seller ? (
        <Card onPress={() => router.push(open("store", seller.id))} style={styles.sellerCard} variant="soft">
          <Avatar name={seller.name} size={48} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={text.cardTitle}>
              {seller.name}
            </Text>
            <Text numberOfLines={1} style={text.caption}>
              {seller.location}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Message ${seller.name}`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={message}
            style={styles.iconButton}
          >
            <Icon name="message-circle" size={18} />
          </Pressable>
          <Button
            label={following ? "Following" : "Follow"}
            onPress={() => dispatch({ sellerId: seller.id, type: "toggleFollow" })}
            size="sm"
            variant={following ? "outline" : "accent"}
          />
        </Card>
      ) : null}

      <Text style={styles.heading}>Description</Text>
      <Card variant="soft">
        <Text style={text.body}>{listing.description}</Text>
      </Card>

      {listing.options.length > 0 ? (
        <>
          <Text style={styles.heading}>Options</Text>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {listing.options.map((item) => {
              const selected = item.id === optionId;
              return (
                <Pressable
                  accessibilityLabel={`${item.label}, ${formatRand(item.priceCents)}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={item.id}
                  onPress={() => setOptionId(item.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionTextSelected]}>{item.label}</Text>
                  <Text style={[styles.optionPrice, selected && styles.optionTextSelected]}>
                    {formatRand(effectivePrice(listing, item.priceCents))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Info({ icon, label }: { icon: "clock" | "package" | "map-pin"; label: string }) {
  return (
    <View style={styles.info}>
      <Icon color={color.heading} name={icon} size={13} />
      <Text numberOfLines={1} style={styles.infoText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    backgroundColor: "rgba(30, 43, 51, 0.55)",
    borderRadius: corner.pill,
    bottom: space.xs,
    left: space.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
  },
  counterText: { color: color.onPrimary, fontSize: 11, fontWeight: "600" },
  flex: { flex: 1 },
  footer: { alignItems: "center", flexDirection: "row", gap: space.sm },
  gallery: { flexDirection: "row", gap: space.xs },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  hero: { aspectRatio: 1.25, borderRadius: corner.md, flex: 1, overflow: "hidden" },
  iconButton: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  info: {
    alignItems: "center",
    backgroundColor: color.surfaceSoft,
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
  infoText: { color: color.heading, flexShrink: 1, fontSize: 12 },
  option: {
    alignItems: "center",
    backgroundColor: color.surfaceSoft,
    borderRadius: corner.md,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: space.xs,
  },
  optionLabel: { color: color.heading, fontSize: 14, fontWeight: "600" },
  optionPrice: { color: color.textSecondary, fontSize: 12 },
  optionSelected: { backgroundColor: color.accent },
  optionTextSelected: { color: color.onPrimary },
  options: { flexDirection: "row", gap: space.xs },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  dealPill: { backgroundColor: color.mist, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dealPillText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  price: { color: color.text, fontSize: 22, fontWeight: "700" },
  priceRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: 2 },
  was: { color: color.textMuted, fontSize: 14, textDecorationLine: "line-through" },
  ratingRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 4, minHeight: 28 },
  reviewLink: { color: color.link, fontSize: 13, fontWeight: "600" },
  sellerCard: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.md },
  thumb: { borderRadius: corner.sm, flex: 1, overflow: "hidden", width: 56 },
  thumbs: { gap: space.xs, width: 56 },
  title: { ...text.pageTitle, marginTop: space.sm },
  titleRow: { alignItems: "flex-start", flexDirection: "row" },
});
