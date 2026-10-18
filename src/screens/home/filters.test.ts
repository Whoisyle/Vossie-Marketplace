import { listings } from "@/data/mock/catalog";

import { activeFilterCount, applyFilters, isOpenNow, NO_FILTERS, parseOpenHours, priceLabel } from "./filters";

describe("home filters", () => {
  it("reads opening hours with any dash", () => {
    expect(parseOpenHours("10:00 – 18:00")).toEqual({ close: 1080, open: 600 });
    expect(parseOpenHours("07:30-17:00")).toEqual({ close: 1020, open: 450 });
    expect(parseOpenHours("Same day")).toBeNull();
  });

  it("knows whether a store is open at a given time", () => {
    expect(isOpenNow("10:00 – 18:00", new Date(2026, 9, 18, 12, 0))).toBe(true);
    expect(isOpenNow("10:00 – 18:00", new Date(2026, 9, 18, 18, 0))).toBe(false);
    expect(isOpenNow("22:00 – 02:00", new Date(2026, 9, 18, 23, 30))).toBe(true);
    expect(isOpenNow("22:00 – 02:00", new Date(2026, 9, 18, 12, 0))).toBe(false);
    expect(isOpenNow("whenever", new Date())).toBe(true);
  });

  it("does nothing with no filters set", () => {
    expect(applyFilters(listings, NO_FILTERS)).toHaveLength(listings.length);
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });

  it("filters by price and rating together", () => {
    const result = applyFilters(listings, { maxPriceCents: 10_000, minRating: 4.5, openNow: false });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((listing) => listing.priceCents <= 10_000 && listing.rating >= 4.5)).toBe(true);
  });

  it("filters by open now", () => {
    const noon = new Date(2026, 9, 18, 12, 0);
    const midnight = new Date(2026, 9, 18, 23, 59);
    expect(applyFilters(listings, { ...NO_FILTERS, openNow: true }, noon).length).toBeGreaterThan(0);
    expect(applyFilters(listings, { ...NO_FILTERS, openNow: true }, midnight).length).toBeLessThan(listings.length);
  });

  it("counts and labels", () => {
    expect(activeFilterCount({ maxPriceCents: 5_000, minRating: 4, openNow: true })).toBe(3);
    expect(priceLabel(null)).toBe("Any price");
    expect(priceLabel(25_000)).toBe("Up to R 250");
  });
});
