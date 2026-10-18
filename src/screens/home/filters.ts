import { dealFor, effectivePrice } from "@/data/deals";
import type { Listing } from "@/data/types";

export type SortKey = "recommended" | "price-low" | "price-high" | "top-rated" | "newest";

export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  "price-high": "Price: high to low",
  "price-low": "Price: low to high",
  recommended: "Recommended",
  "top-rated": "Top rated",
};

export type Filters = {
  /** Highest price in cents, or null for any price. */
  maxPriceCents: number | null;
  /** 0 means any rating. */
  minRating: 0 | 4 | 4.5;
  openNow: boolean;
  /** Only listings that have a deal on right now. */
  dealsOnly: boolean;
  sort: SortKey;
};

export const NO_FILTERS: Filters = { dealsOnly: false, maxPriceCents: null, minRating: 0, openNow: false, sort: "recommended" };

/** Slider range: R0 to R5 000 in R50 steps. The top of the range means "any price". */
export const PRICE_STEP_CENTS = 5_000;
export const PRICE_MAX_CENTS = 500_000;

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.maxPriceCents !== null ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.dealsOnly ? 1 : 0) +
    (filters.sort !== "recommended" ? 1 : 0)
  );
}

/** Parses "10:00 – 18:00" (any dash) into minutes after midnight; null when it cannot be read. */
export function parseOpenHours(text: string): { open: number; close: number } | null {
  const match = /(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return null;
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  return { close, open };
}

/** True when the listing's hours cover `now`. Listings without readable hours are treated as always open. */
export function isOpenNow(openHours: string, now: Date = new Date()): boolean {
  const hours = parseOpenHours(openHours);
  if (!hours) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return hours.close > hours.open
    ? minutes >= hours.open && minutes < hours.close
    : minutes >= hours.open || minutes < hours.close;
}

export function applyFilters(listings: Listing[], filters: Filters, now: Date = new Date()): Listing[] {
  const kept = listings.filter(
    (listing) =>
      (filters.maxPriceCents === null || effectivePrice(listing) <= filters.maxPriceCents) &&
      listing.rating >= filters.minRating &&
      (!filters.openNow || isOpenNow(listing.openHours, now)) &&
      (!filters.dealsOnly || dealFor(listing.id) > 0),
  );
  switch (filters.sort) {
    case "price-low":
      return [...kept].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-high":
      return [...kept].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "top-rated":
      return [...kept].sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    case "newest":
      return [...kept].sort((a, b) => a.createdDaysAgo - b.createdDaysAgo);
    default:
      return kept;
  }
}

export function priceLabel(maxPriceCents: number | null): string {
  return maxPriceCents === null ? "Any price" : `Up to R ${Math.round(maxPriceCents / 100)}`;
}
