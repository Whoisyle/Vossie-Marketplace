import { getSellers } from "@/data/repository";

import { storeBanner, storeLogo } from "./storePhotos";

describe("store pictures", () => {
  it("gives every store a logo and a banner", () => {
    for (const seller of getSellers()) {
      expect(storeLogo(seller.id)).toBeDefined();
      expect(storeBanner(seller.id)).toBeDefined();
    }
  });

  it("has nothing for a store it does not know", () => {
    expect(storeLogo("nobody")).toBeUndefined();
    expect(storeBanner("nobody")).toBeUndefined();
  });
});
