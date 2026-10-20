import { reelVideoFor } from "./reelVideos";

describe("the clip a reel plays", () => {
  it("uses the seller's own video when there is one", () => {
    expect(reelVideoFor({ caption: "x", id: "a", videoUri: "file:///mine.mp4" })).toBe("file:///mine.mp4");
  });

  it("picks a clip that fits what the reel is about, the same one every time", () => {
    const burger = reelVideoFor({ caption: "Fresh off the grill, Burger & Chips", id: "reel-1", listingId: "burger-chips" });
    const sweets = reelVideoFor({ caption: "Matcha-dipped strawberries", id: "reel-4", listingId: "choc-strawberries" });
    const denim = reelVideoFor({ caption: "Thrift drop: vintage denim jacket", id: "reel-2", listingId: "denim-jacket" });
    expect(new Set([burger, sweets, denim]).size).toBe(3);
    expect(reelVideoFor({ caption: "Fresh off the grill, Burger & Chips", id: "reel-1", listingId: "burger-chips" })).toBe(burger);
  });
});
