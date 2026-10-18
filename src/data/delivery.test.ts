import {
  availableModes,
  courierAvailable,
  deliveryFee,
  fulfilmentFor,
  isCrossCampus,
  recommendedMode,
  splitByCampus,
  THIRD_PARTY_TIERS,
} from "./delivery";
import { nextTier, pointsBalance, pointsForOrder, pointsValueCents, tierFor, WELCOME_POINTS } from "./points";

describe("delivery modes", () => {
  it("offers a Vossie courier, collection and a third-party fallback on the same campus", () => {
    expect(availableModes({ courierFree: true, crossCampus: false })).toEqual(["campus-courier", "collection", "third-party"]);
  });

  it("falls back to a third-party courier when no Vossie courier is free", () => {
    expect(availableModes({ courierFree: false, crossCampus: false })[0]).toBe("third-party");
    expect(recommendedMode({ courierFree: false, crossCampus: false })).toBe("third-party");
  });

  it("uses hub to hub when the seller is on another campus", () => {
    expect(isCrossCampus("potchefstroom", ["potchefstroom", "pretoria"])).toBe(true);
    expect(isCrossCampus("potchefstroom", ["potchefstroom"])).toBe(false);
    expect(recommendedMode({ courierFree: true, crossCampus: true })).toBe("hub-to-hub");
  });

  it("respects the student's preference only when it is available", () => {
    expect(recommendedMode({ courierFree: true, crossCampus: false, preferred: "collection" })).toBe("collection");
    expect(recommendedMode({ courierFree: true, crossCampus: true, preferred: "collection" })).toBe("hub-to-hub");
  });

  it("knows Vossie couriers work in the daytime", () => {
    expect(courierAvailable(new Date(2026, 9, 18, 12, 0))).toBe(true);
    expect(courierAvailable(new Date(2026, 9, 18, 23, 0))).toBe(false);
  });

  it("maps modes to delivery or collection for pricing", () => {
    expect(fulfilmentFor("campus-courier")).toBe("delivery");
    expect(fulfilmentFor("third-party")).toBe("delivery");
    expect(fulfilmentFor("hub-to-hub")).toBe("collection");
    expect(fulfilmentFor("collection")).toBe("collection");
  });
});

describe("groups and third-party tiers", () => {
  it("splits items into this campus and other campuses", () => {
    const items = [
      { campus: "potchefstroom" as const, id: "a" },
      { campus: "pretoria" as const, id: "b" },
    ];
    const { local, remote } = splitByCampus("potchefstroom", items, (item) => item.campus);
    expect(local.map((item) => item.id)).toEqual(["a"]);
    expect(remote.map((item) => item.id)).toEqual(["b"]);
  });

  it("never offers hub to hub for items on the buyer's own campus", () => {
    expect(availableModes({ courierFree: true, crossCampus: false })).not.toContain("hub-to-hub");
    expect(availableModes({ courierFree: false, crossCampus: false })).not.toContain("hub-to-hub");
  });

  it("has three third-party choices with their own fees", () => {
    expect(THIRD_PARTY_TIERS).toHaveLength(3);
    expect(deliveryFee("third-party", "economy")).toBeLessThan(deliveryFee("third-party", "standard"));
    expect(deliveryFee("third-party", "express")).toBeGreaterThan(deliveryFee("third-party", "standard"));
    expect(deliveryFee("campus-courier", "express")).toBe(1500);
  });
});

describe("points", () => {
  it("earns 1 point per R10 and values 10 points at R1", () => {
    expect(pointsForOrder(9999)).toBe(9);
    expect(pointsForOrder(10900)).toBe(10);
    expect(pointsValueCents(250)).toBe(2500);
    expect(pointsValueCents(9)).toBe(0);
  });

  it("only counts delivered orders, on top of the welcome gift", () => {
    const balance = pointsBalance([
      { status: "delivered", totalCents: 20000 },
      { status: "on-the-way", totalCents: 99999 },
    ]);
    expect(balance).toBe(WELCOME_POINTS + 20);
  });

  it("finds the tier and progress to the next", () => {
    expect(tierFor(0).id).toBe("bronze");
    expect(tierFor(500).id).toBe("silver");
    expect(tierFor(5000).id).toBe("gold");
    expect(nextTier(250)).toMatchObject({ remaining: 250, tier: { id: "silver" } });
    expect(nextTier(250)!.progress).toBeCloseTo(0.5);
    expect(nextTier(5000)).toBeNull();
  });
});
