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

/** Fees for the modes that have one price. A third-party courier has three, see THIRD_PARTY_TIERS. */
export const DELIVERY_FEES: Record<DeliveryMode, number> = {
  collection: 0,
  "campus-courier": 1500,
  "hub-to-hub": 3500,
  "third-party": 5500,
};

/**
 * The three choices shown when the student picks a third-party courier. Which courier companies sit behind
 * them is an open owner decision, so they are named by speed for now. Prices and times are demo values.
 */
export type ThirdPartyTier = "economy" | "standard" | "express";

export const THIRD_PARTY_TIERS: { id: ThirdPartyTier; label: string; eta: string; detail: string; feeCents: number; etaMinutes: number }[] = [
  { detail: "Cheapest, shared route", eta: "2 to 3 hours", etaMinutes: 150, feeCents: 4500, id: "economy", label: "Economy" },
  { detail: "Direct to you", eta: "About 1.5 hours", etaMinutes: 90, feeCents: 5500, id: "standard", label: "Standard" },
  { detail: "Fastest, goes straight away", eta: "Under 45 minutes", etaMinutes: 45, feeCents: 8500, id: "express", label: "Express" },
];

export function thirdPartyTier(id: ThirdPartyTier) {
  return THIRD_PARTY_TIERS.find((tier) => tier.id === id) ?? THIRD_PARTY_TIERS[1]!;
}

/** The fee for a mode, using the chosen tier when it is a third-party courier. */
export function deliveryFee(mode: DeliveryMode, tier: ThirdPartyTier = "standard"): number {
  return mode === "third-party" ? thirdPartyTier(tier).feeCents : DELIVERY_FEES[mode];
}

/** Estimate in minutes for the order card; hub to hub takes days, so it has none. */
export function deliveryEtaMinutes(mode: DeliveryMode, tier: ThirdPartyTier = "standard"): number | undefined {
  if (mode === "collection") return 20;
  if (mode === "campus-courier") return 60;
  if (mode === "third-party") return thirdPartyTier(tier).etaMinutes;
  return undefined;
}

export const deliveryLabels: Record<DeliveryMode, string> = {
  collection: "Campus collection",
  "campus-courier": "Vossie courier",
  "hub-to-hub": "Campus hub to hub",
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

/** True when any seller in the list is on a different campus from the buyer. */
export function isCrossCampus(buyerCampus: CampusId, sellerCampuses: CampusId[]): boolean {
  return sellerCampuses.some((campus) => campus !== buyerCampus);
}

/**
 * Items from the buyer's own campus ("local") and from other campuses ("remote") are delivered separately:
 * hub to hub is only ever offered for the remote ones.
 */
export function splitByCampus<T>(buyerCampus: CampusId, items: T[], campusOf: (item: T) => CampusId | undefined) {
  const local: T[] = [];
  const remote: T[] = [];
  for (const item of items) (campusOf(item) && campusOf(item) !== buyerCampus ? remote : local).push(item);
  return { local, remote };
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
