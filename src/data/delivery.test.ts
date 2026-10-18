import { availableModes, courierAvailable, fulfilmentFor, isCrossCampus, recommendedMode } from "./delivery";
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
