import { dealFor, dealPrice, effectivePrice, withDeals } from "./deals";
import { listings } from "./mock/catalog";

describe("deals", () => {
  it("applies a percentage and rounds to the cent", () => {
    expect(dealPrice(6000, 20)).toBe(4800);
    expect(dealPrice(3500, 15)).toBe(2975);
    expect(dealPrice(999, 10)).toBe(899);
    expect(dealPrice(5000, 0)).toBe(5000);
  });

  it("knows which listings have deals and their prices", () => {
    expect(dealFor("burger-chips")).toBe(20);
    expect(dealFor("no-such-listing")).toBe(0);
    expect(effectivePrice({ id: "burger-chips", priceCents: 6000 })).toBe(4800);
    expect(effectivePrice({ id: "burger-chips", priceCents: 6000 }, 3500)).toBe(2800);
  });

  it("lists the biggest discount first", () => {
    const deals = withDeals(listings);
    expect(deals.length).toBeGreaterThan(3);
    const percents = deals.map((listing) => dealFor(listing.id));
    expect(percents).toEqual([...percents].sort((a, b) => b - a));
  });

  it("only refers to listings that exist", () => {
    const ids = new Set(listings.map((listing) => listing.id));
    const { dealPercent } = jest.requireActual<typeof import("./deals")>("./deals");
    for (const id of Object.keys(dealPercent)) expect(ids.has(id)).toBe(true);
  });
});
