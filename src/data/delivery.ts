import type { CampusId, Fulfilment } from "./types";

/**
 * How an order reaches the student (owner decision, 2026-10-18):
 *  - collection: pick it up at the seller / campus, free
 *  - campus-courier: a Vossie courier on the same campus brings it
 *  - hub-to-hub: the seller is on another campus; the order goes seller hub to buyer hub and is collected there
 *  - third-party: an outside courier service, used when no Vossie courier is free
 * The prices and times below are demo values; the real fee percentage and carriers are open owner decisions.
 */
export type DeliveryMode = "collection" | "campus-courier" | "hub-to-hub" | "third-party";

export type DeliveryOption = {
  mode: DeliveryMode;
  label: string;
  detail: string;
  /** Short time promise shown on the choice card. */
  eta: string;
  feeCents: number;
};

export const DELIVERY_FEES: Record<DeliveryMode, number> = {
  collection: 0,
  "campus-courier": 1500,
  "hub-to-hub": 3500,
  "third-party": 5500,
};

export const deliveryLabels: Record<DeliveryMode, string> = {
  collection: "Campus collection",
  "campus-courier": "Campus courier",
  "hub-to-hub": "Hub to hub",
  "third-party": "Third-party courier",
};

const catalogue: Record<DeliveryMode, Omit<DeliveryOption, "mode" | "feeCents">> = {
  collection: { detail: "Pick it up yourself", eta: "Ready in 20 min", label: deliveryLabels.collection },
  "campus-courier": { detail: "A Vossie courier brings it to you", eta: "About 1 hour", label: deliveryLabels["campus-courier"] },
  "hub-to-hub": { detail: "Travels to your campus hub; collect it there", eta: "1 to 2 days", label: deliveryLabels["hub-to-hub"] },
  "third-party": { detail: "An outside courier, used when no Vossie courier is free", eta: "About 1.5 hours", label: deliveryLabels["third-party"] },
};

/** Vossie couriers work 07:00 to 21:00 in the demo; outside that only a third-party courier can deliver. */
export function courierAvailable(now: Date = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 7 && hour < 21;
}

/** True when any seller in the cart is on a different campus from the buyer. */
export function isCrossCampus(buyerCampus: CampusId, sellerCampuses: CampusId[]): boolean {
  return sellerCampuses.some((campus) => campus !== buyerCampus);
}

/** What can be chosen right now, best first. */
export function availableModes(input: { crossCampus: boolean; courierFree: boolean }): DeliveryMode[] {
  if (input.crossCampus) return ["hub-to-hub", "third-party"];
  return input.courierFree ? ["campus-courier", "collection", "third-party"] : ["third-party", "collection"];
}

export function deliveryOption(mode: DeliveryMode): DeliveryOption {
  return { ...catalogue[mode], feeCents: DELIVERY_FEES[mode], mode };
}

/**
 * The mode to pre-select: the student's preferred one when it is available, otherwise the first available.
 * The student can always switch to another option.
 */
export function recommendedMode(input: { crossCampus: boolean; courierFree: boolean; preferred?: DeliveryMode | null }): DeliveryMode {
  const modes = availableModes(input);
  return input.preferred && modes.includes(input.preferred) ? input.preferred : modes[0]!;
}

/** Orders that end at a person's door (or the buyer's hub) are "delivery" for pricing and tracking. */
export function fulfilmentFor(mode: DeliveryMode): Fulfilment {
  return mode === "campus-courier" || mode === "third-party" ? "delivery" : "collection";
}

/** Delivery modes that have a courier on the road, so a live map applies. */
export function hasLiveMap(mode: DeliveryMode): boolean {
  return mode === "campus-courier" || mode === "third-party";
}
