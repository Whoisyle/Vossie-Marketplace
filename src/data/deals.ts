import type { Listing } from "./types";

/**
 * Placeholder deals (owner decision, 2026-10-18: promo banners lead to a store or category page with the
 * deals and their percentages at the top). Real deals will come from seller promo templates and staff banners.
 */
export const dealPercent: Record<string, number> = {
  "burger-chips": 20,
  "campus-hoodie": 15,
  "choc-strawberries": 20,
  "denim-jacket": 30,
  "green-folders": 20,
  "iced-latte": 15,
  "maths-tutoring": 15,
  "mint-laptop": 10,
  "planner-notebooks": 25,
  "zinger-meal": 10,
};

export function dealFor(listingId: string): number {
  return dealPercent[listingId] ?? 0;
}

/** Price after the deal, rounded to the nearest cent. */
export function dealPrice(priceCents: number, percent: number): number {
  if (percent <= 0) return priceCents;
  return Math.round((priceCents * (100 - percent)) / 100);
}

/** The listing's price (or one of its option prices) with any deal applied. */
export function effectivePrice(listing: Pick<Listing, "id" | "priceCents">, priceCents: number = listing.priceCents): number {
  return dealPrice(priceCents, dealFor(listing.id));
}

/** Listings that have a deal, biggest discount first. */
export function withDeals<T extends Pick<Listing, "id">>(listings: T[]): T[] {
  return listings.filter((listing) => dealFor(listing.id) > 0).sort((a, b) => dealFor(b.id) - dealFor(a.id));
}
