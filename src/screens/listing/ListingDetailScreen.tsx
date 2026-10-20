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
  QuantityStepper,
  Screen,
  Sheet,
  StarRating,
  useToast,
} from "@/components";
import { dealFor, effectivePrice } from "@/data/deals";
import { isSoldOut, isVerifiedSeller } from "@/data/phase4";
import { formatRand } from "@/data/format";
import { getListing, getListings, getSeller } from "@/data/repository";
import { detailFor } from "@/data/mock/productDetails";
import { useDetail } from "@/lib/paths";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { ListingFacts, ListingGallery, ListingRow, ReviewPreview } from "./ListingSections";

/** Listing detail: gallery, seller, options, quantity and add to cart. */
export function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const open = useDetail();
  const { dispatch, state } = useDemoStore();
  const listing = getListing(id);
  const seller = listing ? getSeller(listing.sellerId) : undefined;
  const [optionId, setOptionId] = useState<string | undefined>(
    listing?.options[1]?.id ?? listing?.options[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);

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
  const soldOut = isSoldOut(listing.id);
  const hasAlert = (kind: "price-drop" | "back-in-stock") => state.alerts.some((item) => item.listingId === listing.id && item.kind === kind);
  const following = seller ? state.following.includes(seller.id) : false;
  const detail = detailFor(listing.id, listing.description, listing.categoryId);
  const reviews = state.reviews.filter((review) => review.listingId === listing.id);
  const fromStore = getListings({ sellerId: listing.sellerId }).filter((item) => item.id !== listing.id).slice(0, 6);
  const alike = getListings({ categoryId: listing.categoryId }).filter((item) => item.id !== listing.id && item.sellerId !== listing.sellerId).slice(0, 6);

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
          {soldOut ? null : <QuantityStepper onChange={setQuantity} value={quantity} />}
          <View style={styles.flex}>
            {soldOut ? (
              <Button
                fullWidth
                icon="bell"
                label={hasAlert("back-in-stock") ? "We'll tell you when it's back" : "Sold out · Notify me"}
                onPress={() => {
                  dispatch({ kind: "back-in-stock", listingId: listing.id, type: "toggleAlert" });
                  toast.show(hasAlert("back-in-stock") ? "Alert removed" : "We'll let you know when it's back");
                }}
                testID="notify-back-in-stock"
                variant={hasAlert("back-in-stock") ? "outline" : "primary"}
              />
            ) : (
              <Button
                fullWidth
                icon="shopping-cart"
                label={`Add to Cart · ${formatRand(unit * quantity)}`}
                onPress={addToCart}
                testID="add-to-cart"
              />
            )}
          </View>
        </View>
      }
    >
      <AppHeader
        back
        right={
          <Pressable accessibilityLabel="More options" accessibilityRole="button" hitSlop={8} onPress={() => setMoreOpen(true)} style={styles.more} testID="listing-more">
            <Icon color={color.heading} name="more-horizontal" size={20} />
          </Pressable>
        }
      />
      <ListingGallery images={listing.images} title={listing.title} />

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

      {soldOut ? (
        <View style={styles.soldOut}>
          <Icon color={color.warning} name="alert-circle" size={16} />
          <Text style={styles.soldOutText}>Sold out right now</Text>
        </View>
      ) : null}

      <View style={styles.alerts}>
        <Pressable
          accessibilityLabel="Tell me when the price drops"
          accessibilityRole="switch"
          accessibilityState={{ checked: hasAlert("price-drop") }}
          onPress={() => {
            dispatch({ kind: "price-drop", listingId: listing.id, type: "toggleAlert" });
            toast.show(hasAlert("price-drop") ? "Price alert removed" : "We'll tell you when the price drops");
          }}
          style={[styles.alertChip, hasAlert("price-drop") && styles.alertChipOn]}
          testID="alert-price-drop"
        >
          <Icon color={hasAlert("price-drop") ? color.onPrimary : color.heading} name="trending-down" size={14} />
          <Text style={[styles.alertText, hasAlert("price-drop") && styles.alertTextOn]}>
            {hasAlert("price-drop") ? "Price alert on" : "Alert me if the price drops"}
          </Text>
        </Pressable>
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
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={[text.cardTitle, styles.nameText]}>
                {seller.name}
              </Text>
              {isVerifiedSeller(seller) ? <Icon color={color.link} name="check-circle" size={15} /> : null}
            </View>
            <Text numberOfLines={1} style={text.caption}>
              {isVerifiedSeller(seller) ? "Verified seller · " : ""}
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
      <ListingFacts detail={detail} />
      <ReviewPreview listing={listing} onAll={() => router.push(open("review", listing.id))} reviews={reviews} />
      <ListingRow favourites={state.favourites} items={fromStore} onOpen={(next) => router.push(open("listing", next))} onToggle={(next) => dispatch({ listingId: next, type: "toggleFavourite" })} title="More from this store" />
      <ListingRow favourites={state.favourites} items={alike} onOpen={(next) => router.push(open("listing", next))} onToggle={(next) => dispatch({ listingId: next, type: "toggleFavourite" })} title="You may also like" />
      <Sheet onClose={() => setMoreOpen(false)} title={listing.title} visible={moreOpen}>
        <Button
          fullWidth
          icon="flag"
          label="Report this listing"
          onPress={() => {
            setMoreOpen(false);
            toast.show("Thanks, our team will take a look");
          }}
          variant="outline"
        />
        {seller ? (
          <Button
            fullWidth
            icon="slash"
            label={`Block ${seller.name}`}
            onPress={() => {
              dispatch({ name: seller.name, type: "blockUser", userId: `seller-${seller.id}` });
              setMoreOpen(false);
              toast.show(`${seller.name} blocked. Their listings are hidden`);
              router.back();
            }}
            testID="block-seller"
            variant="danger"
          />
        ) : null}
      </Sheet>
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
  alertChip: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.surfaceSoft, borderRadius: 18, flexDirection: "row", gap: 6, minHeight: 36, paddingHorizontal: 12 },
  alertChipOn: { backgroundColor: color.primary },
  alertText: { color: color.heading, fontSize: 13, fontWeight: "600" },
  alertTextOn: { color: color.onPrimary },
  alerts: { marginTop: space.sm },
  more: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  nameText: { flexShrink: 1 },
  soldOut: { alignItems: "center", backgroundColor: color.warningSoft, borderRadius: 12, flexDirection: "row", gap: 6, marginTop: space.sm, padding: space.sm },
  soldOutText: { color: color.warning, fontSize: 13, fontWeight: "700" },
  flex: { flex: 1 },
  footer: { alignItems: "center", flexDirection: "row", gap: space.sm },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
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
  title: { ...text.pageTitle, marginTop: space.sm },
  titleRow: { alignItems: "flex-start", flexDirection: "row" },
});
