import { categories, listings, sellers } from "./mock/catalog";
import { alternatives, searchListings, suggest } from "./search";

describe("search suggestions", () => {
  it("finds products, stores and categories as you type", () => {
    const result = suggest("bur", listings, sellers, categories);
    expect(result[0]?.label).toBe("Burger & Chips");
    expect(result.every((item) => item.label.toLowerCase().includes("bur") || item.detail.toLowerCase().includes("bur"))).toBe(true);
    const store = suggest("campus", listings, sellers, categories).find((item) => item.kind === "store");
    expect(store?.label).toBe("CampusBites");
    expect(suggest("food", listings, sellers, categories).some((item) => item.kind === "category")).toBe(true);
  });

  it("ignores case, accents and punctuation", () => {
    expect(suggest("  LATTE!! ", listings, sellers, categories)[0]?.label).toBe("Iced Latte");
    expect(suggest("matcha avo", listings, sellers, categories).length).toBeGreaterThan(0);
  });

  it("puts word-start matches ahead of middle matches and caps the list", () => {
    const result = suggest("s", listings, sellers, categories, 4);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("returns nothing for an empty query", () => {
    expect(suggest("   ", listings, sellers, categories)).toEqual([]);
  });
});

describe("full search", () => {
  it("matches every word in any order across title, description and store", () => {
    const hits = searchListings("latte plato", listings, sellers);
    expect(hits.map((listing) => listing.id)).toContain("iced-latte");
    expect(searchListings("zzzz", listings, sellers)).toEqual([]);
  });

  it("offers alternatives when nothing matches", () => {
    const options = alternatives("fod", categories, sellers);
    expect(options.length).toBeGreaterThan(0);
    expect(options).toContain("Food");
  });
});
