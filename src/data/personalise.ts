import type { CategoryId, Listing, Order } from "./types";

/** Time-of-day greeting in the viewer's local time. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export type Taste = {
  favourites: string[];
  following: string[];
  orders: Pick<Order, "lines">[];
  recentViews: string[];
};

/**
 * "For you": what this student has already shown they like, built from data the app already has.
 * Listings from followed stores and from categories of their favourites, orders and recent views score
 * higher; things they already favourited or ordered are left out so the row shows something new.
 */
export function forYou(listings: Listing[], taste: Taste, limit = 8): Listing[] {
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const categoryWeight = new Map<CategoryId, number>();
  const bump = (id: string, weight: number) => {
    const listing = byId.get(id);
    if (listing) categoryWeight.set(listing.categoryId, (categoryWeight.get(listing.categoryId) ?? 0) + weight);
  };
  taste.favourites.forEach((id) => bump(id, 3));
  taste.recentViews.forEach((id) => bump(id, 1));
  taste.orders.forEach((order) => order.lines.forEach((line) => bump(line.listingId, 2)));

  const seen = new Set<string>([
    ...taste.favourites,
    ...taste.orders.flatMap((order) => order.lines.map((line) => line.listingId)),
  ]);

  return listings
    .filter((listing) => !seen.has(listing.id))
    .map((listing) => {
      // only things connected to something the student has done count; quality just orders them
      const signal = (categoryWeight.get(listing.categoryId) ?? 0) + (taste.following.includes(listing.sellerId) ? 4 : 0);
      return { listing, score: signal + listing.rating / 5 + (listing.popular ? 0.5 : 0), signal };
    })
    .filter((entry) => entry.signal > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.listing);
}

/** The listings a student looked at most recently, newest first, without ones that no longer exist. */
export function recentListings(listings: Listing[], recentViews: string[], limit = 8): Listing[] {
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  return recentViews
    .map((id) => byId.get(id))
    .filter((listing): listing is Listing => Boolean(listing))
    .slice(0, limit);
}
