import type { Listing, Reel, Seller } from "@/data/types";

import { registerOwnStore } from "@/data/repository";
import { averageRating } from "./state";
import type { SellerState } from "./types";

/** A seller listing dressed as the buyer's own listing type, so the buyer's cards, cart and checkout can use it. */
export function asListing(item: SellerState["listings"][number], storeId: string, campusId: Listing["campusId"] = "potchefstroom"): Listing {
  const category = item.category === "services" ? "services" : item.category === "food" ? "food" : item.category === "books" ? "study" : item.category === "fashion" ? "fashion" : "tech";
  return {
    campusId,
    categoryId: category as Listing["categoryId"],
    createdDaysAgo: Math.max(0, Math.round((Date.now() - new Date(item.updatedAt).getTime()) / 86_400_000)),
    description: item.description,
    id: item.id,
    images: item.photos.length > 0 ? item.photos : item.artId ? [`art:${item.artId}`] : [],
    location: "",
    openHours: "",
    options: item.variants.map((label, index) => ({ id: `${item.id}-v${index}`, label, priceCents: item.priceCents })),
    pickupTime: "Today",
    popular: item.onHand > 0 && item.onHand <= 5,
    priceCents: item.priceCents,
    rating: 4.8,
    ratingCount: 12,
    sellerId: storeId,
    title: item.title,
  };
}

/** The seller's store as a buyer's store record: the name, the words, where to collect and the rating the reviews add up to. */
export function asSeller(state: SellerState, followers: number): Seller {
  const total = state.reviewCounts.reduce((a, b) => a + b, 0);
  return {
    bio: state.profile.description,
    campusId: "potchefstroom",
    followers,
    id: state.profile.storeId,
    location: state.profile.place ? `${state.profile.place.name}, ${state.profile.place.address.split(",")[0]}` : state.profile.location,
    name: state.profile.storeName || "Your store",
    rating: Math.round(averageRating(state.reviewCounts) * 10) / 10 || 0,
    ratingCount: total,
  };
}

/** Whether buyers should see this seller's own store: they are approved and have finished setting it up. */
export function storeIsLive(state: SellerState): boolean {
  return state.status === "approved" && state.setupDone && state.profile.storeId !== "";
}

/**
 * Tells the catalogue which store the seller runs so buyers see it. Only published products with stock are offered. Called
 * whenever the seller side changes; it does nothing but set a value, so it can be called as often as needed.
 */
export function syncCatalogue(state: SellerState, followers: number): void {
  if (!storeIsLive(state)) {
    registerOwnStore(null);
    return;
  }
  const storeId = state.profile.storeId;
  registerOwnStore({
    known: state.listings.map((item) => asListing(item, storeId)),
    listings: state.listings.filter((item) => item.status === "published" && (item.unlimited || item.onHand > 0)).map((item) => asListing(item, storeId)),
    seller: asSeller(state, followers),
  });
}

/**
 * The seller's live reels as buyer reels, put first in the Reels feed in place of any earlier copy. Buyers' comments on a
 * reel are kept. The like count leaves out the buyer's own like, which the feed adds itself.
 */
export function syncOwnReels(feed: Reel[], seller: SellerState, liked: string[]): Reel[] {
  const storeId = seller.profile.storeId;
  const kept = new Map(feed.filter((reel) => reel.sellerId === storeId).map((reel) => [reel.id, reel]));
  const rest = feed.filter((reel) => reel.sellerId !== storeId);
  if (!storeIsLive(seller)) return rest;
  const own = seller.reels
    .filter((reel) => reel.status === "published")
    .map((reel): Reel => ({
      caption: reel.caption,
      comments: kept.get(reel.id)?.comments ?? [],
      id: reel.id,
      likes: Math.max(0, reel.likes - (liked.includes(reel.id) ? 1 : 0)),
      listingId: reel.listingId,
      seller: seller.profile.storeName || "Your store",
      sellerId: storeId,
      tint: "#2D5563",
      videoUri: reel.videoUri,
    }));
  return [...own, ...rest];
}
