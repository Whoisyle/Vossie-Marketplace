import { baseFromPath, detailHref } from "./paths";

jest.mock("expo-router", () => ({ usePathname: () => "/explore" }));

describe("detail paths", () => {
  it("keeps you in the tab you came from", () => {
    expect(detailHref("/explore", "store", "kfc")).toBe("/explore/store/kfc");
    expect(detailHref("/reels", "listing", "x")).toBe("/reels/listing/x");
    expect(detailHref("/home/listing/abc", "review", "abc")).toBe("/home/review/abc");
  });

  it("falls back to Home", () => {
    expect(baseFromPath("/sign-in")).toBe("home");
    expect(baseFromPath("")).toBe("home");
    expect(baseFromPath(null)).toBe("home");
  });
});
