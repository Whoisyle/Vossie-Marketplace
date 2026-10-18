import { firstName, forYou, greeting, recentListings } from "./personalise";
import { listings } from "./mock/catalog";

const none = { favourites: [], following: [], orders: [], recentViews: [] };

describe("personalisation", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 9, 18, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 9, 18, 13))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 9, 18, 20))).toBe("Good evening");
    expect(greeting(new Date(2026, 9, 18, 2))).toBe("Still up");
  });

  it("uses the first name only", () => {
    expect(firstName("  Vumisa Dlamini ")).toBe("Vumisa");
    expect(firstName("")).toBe("");
  });

  it("suggests things from categories and stores the student already likes", () => {
    const picks = forYou(listings, { ...none, favourites: ["mint-laptop"], following: ["thabos-books"] });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.some((listing) => listing.id === "mint-laptop")).toBe(false);
    expect(picks.some((listing) => listing.categoryId === "electronics")).toBe(true);
    expect(picks.some((listing) => listing.sellerId === "thabos-books")).toBe(true);
  });

  it("leaves out things already ordered", () => {
    const orders = [{ lines: [{ listingId: "burger-chips", title: "x", quantity: 1, unitPriceCents: 1 }] }];
    const picks = forYou(listings, { ...none, orders, recentViews: ["iced-latte"] });
    expect(picks.some((listing) => listing.id === "burger-chips")).toBe(false);
  });

  it("returns nothing for a brand new student so the row can be hidden", () => {
    expect(forYou(listings, none)).toEqual([]);
  });

  it("lists recent views newest first and skips unknown ids", () => {
    const recents = recentListings(listings, ["iced-latte", "gone", "burger-chips"]);
    expect(recents.map((listing) => listing.id)).toEqual(["iced-latte", "burger-chips"]);
  });
});
