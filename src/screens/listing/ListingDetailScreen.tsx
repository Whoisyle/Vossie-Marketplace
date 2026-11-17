import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  StoreLogo,
  Button,
  EmptyState,
  HeartButton,
  Icon,
  QuantityStepper,
  Screen,
  Sheet,
  useToast,
  type IconName,
} from "@/components";
import { dealFor, effectivePrice } from "@/data/deals";
import { isSoldOut, isVerifiedSeller } from "@/data/phase4";
import { formatRand } from "@/data/format";
import { getListing, getListings, getSeller } from "@/data/repository";
import { detailFor } from "@/data/mock/productDetails";
import { useDetail } from "@/lib/paths";
import { notesDetailFor } from "@/data/notes";
import { NotesBuySheet, NotesFacts } from "@/screens/notes/NotesScreens";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, shadow, space, text } from "@/theme/tokens";

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
  const [buyOpen, setBuyOpen] = useState(false);

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
  const detail = listing.notes ? notesDetailFor(listing) : detailFor(listing.id, listing.description, listing.categoryId);
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

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };
  const barCaption = listing.notes ? "Study notes" : soldOut ? "Sold out" : quantity > 1 ? `${quantity} items` : "Total";
  const barAmount = formatRand(listing.notes || soldOut ? unit : unit * quantity);

  return (
    <Screen
      bleedTop
      footer={
        <View style={styles.bar}>
          <View style={styles.barPrice}>
            <Text style={styles.barCaption}>{barCaption}</Text>
            <Text numberOfLines={1} style={styles.barAmount}>
              {barAmount}
            </Text>
          </View>
          {listing.notes ? (
            state.notesLibrary.includes(listing.id) ? (
              <BarButton label="Open your notes" onPress={() => router.push(`/account/notes-read/${listing.id}` as Href)} testID="notes-open" />
            ) : (
              <BarButton label="Buy and download" onPress={() => setBuyOpen(true)} testID="notes-buy" />
            )
          ) : soldOut ? (
            <BarButton
              label={hasAlert("back-in-stock") ? "Alert on" : "Notify me"}
              onPress={() => {
                dispatch({ kind: "back-in-stock", listingId: listing.id, type: "toggleAlert" });
                toast.show(hasAlert("back-in-stock") ? "Alert removed" : "We'll let you know when it's back");
              }}
              outline={hasAlert("back-in-stock")}
              testID="notify-back-in-stock"
            />
          ) : (
            <BarButton label="Add to cart" onPress={addToCart} testID="add-to-cart" />
          )}
        </View>
      }
    >
      <ListingGallery
        images={listing.images}
        overlay={
          <View pointerEvents="box-none" style={styles.topBar}>
            <RoundButton icon="chevron-left" label="Back" onPress={goBack} testID="header-back" />
            <View style={styles.topRight}>
              <View style={styles.round}>
                <HeartButton
                  active={favourite}
                  idleColor={color.heading}
                  onPress={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
                />
              </View>
              <RoundButton icon="more-horizontal" label="More options" onPress={() => setMoreOpen(true)} testID="listing-more" />
            </View>
          </View>
        }
        title={listing.title}
      />

      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" style={styles.title}>
          {listing.title}
        </Text>
        <Pressable
          accessibilityHint="Opens ratings and reviews"
          accessibilityLabel={`${listing.rating.toFixed(1)} stars, ${listing.ratingCount} reviews`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push(open("review", listing.id))}
          style={styles.ratingRow}
          testID="open-reviews"
        >
          <Ionicons color={color.ink} name="star" size={15} />
          <Text style={styles.ratingValue}>{listing.rating.toFixed(2)}</Text>
          <Text style={text.bodySmall}>({listing.ratingCount} reviews)</Text>
          <Icon color={color.textMuted} name="chevron-right" size={14} />
        </Pressable>
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
      </View>

      {soldOut ? (
        <View style={styles.soldOut}>
          <Icon color={color.warning} name="alert-circle" size={16} />
          <Text style={styles.soldOutText}>Sold out right now</Text>
        </View>
      ) : null}

      {seller ? (
        <View style={styles.section}>
          <Pressable accessibilityRole="button" onPress={() => router.push(open("store", seller.id))} style={styles.sellerRow}>
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={[styles.sellerName, styles.nameText]}>
                  {seller.name}
                </Text>
                {isVerifiedSeller(seller) ? <Icon color={color.link} name="check-circle" size={15} /> : null}
              </View>
              <Text numberOfLines={1} style={text.caption}>
                {isVerifiedSeller(seller) ? "Verified seller · " : "Seller · "}
                {seller.location}
              </Text>
            </View>
            <StoreLogo name={seller.name} sellerId={seller.id} size={48} />
          </Pressable>
          <View style={styles.sellerActions}>
            <Pressable accessibilityLabel={`Message ${seller.name}`} accessibilityRole="button" hitSlop={4} onPress={message} style={styles.pillButton}>
              <Icon color={color.heading} name="message-circle" size={15} />
              <Text style={styles.pillButtonText}>Message</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={4}
              onPress={() => dispatch({ sellerId: seller.id, type: "toggleFollow" })}
              style={[styles.pillButton, following && styles.pillButtonOn]}
            >
              <Text style={[styles.pillButtonText, following && styles.pillButtonTextOn]}>{following ? "Following" : "Follow"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.groupHeading}>Good to know</Text>
        <View style={styles.pills}>
          <Info icon="clock" label={listing.openHours} />
          <Info icon="package" label={listing.notes ? "Instant download" : `Ready in ${listing.pickupTime}`} />
          <Info icon="map-pin" label={listing.location} />
        </View>
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

      {soldOut || listing.notes ? null : (
        <View style={[styles.section, styles.quantityRow]}>
          <Text style={styles.groupHeadingFlat}>Quantity</Text>
          <QuantityStepper onChange={setQuantity} value={quantity} />
        </View>
      )}

      {listing.options.length > 0 ? (
        <>
          <Text style={[styles.heading, styles.groupHeading]}>Options</Text>
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
      {listing.notes ? <NotesFacts listing={listing} onPreview={() => router.push(`/home/notes-read/${listing.id}` as Href)} /> : null}
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
      {listing.notes ? (
        <NotesBuySheet
          listing={listing}
          onBought={() => {
            setBuyOpen(false);
            router.push(`/account/notes-read/${listing.id}` as Href);
          }}
          onClose={() => setBuyOpen(false)}
          visible={buyOpen}
        />
      ) : null}
    </Screen>
  );
}

/** A white round button that sits on top of the photo. */
function RoundButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      testID={testID}
    >
      <Icon color={color.heading} name={icon} size={20} />
    </Pressable>
  );
}

/** The main action in the dark bar at the bottom: a white pill. */
function BarButton({ label, onPress, outline = false, testID }: { label: string; onPress: () => void; outline?: boolean; testID?: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.barButton, outline && styles.barButtonOutline, pressed && styles.pressed]}
      testID={testID}
    >
      <Text style={[styles.barButtonText, outline && styles.barButtonTextOutline]}>{label}</Text>
    </Pressable>
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
  bar: {
    alignItems: "center",
    backgroundColor: color.ink,
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: space.sm,
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    ...shadow.raised,
  },
  barAmount: { color: color.onPrimary, fontSize: 20, fontWeight: "700" },
  barButton: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: corner.pill, justifyContent: "center", minHeight: 48, paddingHorizontal: space.xl },
  barButtonOutline: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.6)", borderWidth: 1 },
  barButtonText: { color: color.ink, fontSize: 16, fontWeight: "700" },
  barButtonTextOutline: { color: color.onPrimary },
  barCaption: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  barPrice: { flexShrink: 1 },
  groupHeading: { color: color.text, fontSize: 16, fontWeight: "700", marginBottom: space.xs },
  groupHeadingFlat: { color: color.text, fontSize: 16, fontWeight: "700" },
  pillButton: { alignItems: "center", borderColor: color.borderStrong, borderRadius: corner.pill, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: space.md },
  pillButtonOn: { backgroundColor: color.ink, borderColor: color.ink },
  pillButtonText: { color: color.heading, fontSize: 14, fontWeight: "600" },
  pillButtonTextOn: { color: color.onPrimary },
  pressed: { opacity: 0.7 },
  quantityRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  ratingValue: { color: color.text, fontSize: 14, fontWeight: "700" },
  round: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 22, height: 44, justifyContent: "center", width: 44, ...shadow.card },
  section: { borderTopColor: color.border, borderTopWidth: 1, marginTop: space.md, paddingTop: space.md },
  sellerActions: { flexDirection: "row", gap: space.xs, marginTop: space.sm },
  sellerName: { color: color.text, fontSize: 16, fontWeight: "700" },
  sellerRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  titleBlock: { marginTop: space.md },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  topRight: { alignItems: "center", flexDirection: "row", gap: space.xs },

  alertChip: { alignItems: "center", alignSelf: "flex-start", borderColor: color.borderStrong, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 6, marginTop: space.sm, minHeight: 40, paddingHorizontal: 14 },
  alertChipOn: { backgroundColor: color.ink, borderColor: color.ink },
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
    backgroundColor: color.backgroundMuted,
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
  optionSelected: { backgroundColor: color.ink },
  optionTextSelected: { color: color.onPrimary },
  options: { flexDirection: "row", gap: space.xs },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  dealPill: { backgroundColor: color.mist, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dealPillText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  price: { color: color.text, fontSize: 22, fontWeight: "700" },
  priceRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: 2 },
  was: { color: color.textMuted, fontSize: 14, textDecorationLine: "line-through" },
  ratingRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 4, minHeight: 28 },
  reviewLink: { color: color.link, fontSize: 13, fontWeight: "600" },
  sellerCard: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.md },
  title: { color: color.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  titleRow: { alignItems: "flex-start", flexDirection: "row" },
});
