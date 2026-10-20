import { dateKey } from "./schedule";
import { promotionState } from "./promotions";
import type { SellerPromotion, SellerState } from "./types";

/** One line of the buyer's cart as the seller's offers need to see it. */
export type OfferLine = { listingId: string; unitCents: number; quantity: number; category: SellerState["listings"][number]["category"] | "other" };

export type OfferResult = {
  /** The offer that applied, if any. */
  promotion: SellerPromotion | null;
  discountCents: number;
  /** Take the delivery fee off as well (a free-delivery offer). */
  freeDelivery: boolean;
  /** Why a code the buyer typed cannot be used, in plain words. */
  problem: string | null;
};

export const NO_OFFER: OfferResult = { discountCents: 0, freeDelivery: false, problem: null, promotion: null };

function rand(cents: number): string {
  return `R${Math.ceil(cents / 100)}`;
}

/** The lines an offer covers: the whole store, chosen products or a category. */
function covered(promotion: SellerPromotion, lines: OfferLine[]): OfferLine[] {
  if (promotion.appliesTo === "products") return lines.filter((line) => promotion.listingIds?.includes(line.listingId));
  if (promotion.appliesTo === "category") return lines.filter((line) => line.category === promotion.category);
  return lines;
}

/** What one offer takes off these lines, and whether it waives delivery. Zero when the lines do not qualify. */
export function offerValue(promotion: SellerPromotion, lines: OfferLine[]): { cents: number; freeDelivery: boolean } {
  const hit = covered(promotion, lines);
  const subtotal = hit.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  if (hit.length === 0) return { cents: 0, freeDelivery: false };
  switch (promotion.kind) {
    case "percent":
      return { cents: Math.round((subtotal * (promotion.value ?? 0)) / 100), freeDelivery: false };
    case "rand-off":
      return { cents: Math.min(subtotal, promotion.value ?? 0), freeDelivery: false };
    case "free-delivery":
      return { cents: 0, freeDelivery: true };
    case "buy-x-get-y": {
      const group = (promotion.buyX ?? 2) + (promotion.getY ?? 1);
      const prices = hit.flatMap((line) => Array.from({ length: line.quantity }, () => line.unitCents)).sort((a, b) => a - b);
      const free = Math.floor(prices.length / group) * (promotion.getY ?? 1);
      return { cents: prices.slice(0, free).reduce((sum, price) => sum + price, 0), freeDelivery: false };
    }
    default: {
      // a bundle price: every product in the bundle must be in the cart, and the bundle costs the price set
      const ids = promotion.listingIds ?? [];
      if (ids.length === 0 || !ids.every((id) => hit.some((line) => line.listingId === id))) return { cents: 0, freeDelivery: false };
      const worth = ids.reduce((sum, id) => sum + (hit.find((line) => line.listingId === id)?.unitCents ?? 0), 0);
      return { cents: Math.max(0, worth - (promotion.value ?? worth)), freeDelivery: false };
    }
  }
}

/** Why this buyer cannot use an offer right now, or null when they can. */
export function offerProblem(promotion: SellerPromotion, args: { now: Date; lines: OfferLine[]; earlierOrders: number; usedByBuyer: number }): string | null {
  const state = promotionState(promotion, args.now);
  if (state === "scheduled") return "That offer has not started yet.";
  if (state === "ended") return "That offer has ended.";
  if (state === "paused") return "That offer is not running right now.";
  const hit = covered(promotion, args.lines);
  if (hit.length === 0) return promotion.appliesTo === "products" ? "That offer is for other products." : promotion.appliesTo === "category" ? `That offer is for ${promotion.category}.` : "Nothing in your cart qualifies.";
  const subtotal = hit.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  if (promotion.minSpendCents && subtotal < promotion.minSpendCents) return `Spend ${rand(promotion.minSpendCents - subtotal)} more to use this offer.`;
  if (promotion.firstOrderOnly && args.earlierOrders > 0) return "That offer is for a first order from this store.";
  if (promotion.maxUses !== undefined && promotion.redemptions >= promotion.maxUses) return "That offer has been used up.";
  if (promotion.perStudent !== undefined && args.usedByBuyer >= promotion.perStudent) return "You have already used that offer.";
  if (offerValue(promotion, args.lines).cents === 0 && !offerValue(promotion, args.lines).freeDelivery) return "Nothing in your cart qualifies.";
  return null;
}

/**
 * The seller's offer for this cart. A code the buyer typed is checked and applied; with no code, the best offer that applies by
 * itself (one with no code) is used. Only offers from the store the student runs can apply, to that store's items.
 */
export function sellerOffer(args: { seller: SellerState; code: string | null; lines: OfferLine[]; earlierOrders: number; promoUses: Record<string, number>; now?: Date }): OfferResult {
  const now = args.now ?? new Date();
  if (args.lines.length === 0) return NO_OFFER;
  const check = (promotion: SellerPromotion) => offerProblem(promotion, { earlierOrders: args.earlierOrders, lines: args.lines, now, usedByBuyer: args.promoUses[promotion.id] ?? 0 });
  const code = args.code?.trim().toUpperCase();
  if (code) {
    const typed = args.seller.promotions.find((item) => item.code === code);
    if (typed) {
      const problem = check(typed);
      if (problem) return { ...NO_OFFER, problem };
      const value = offerValue(typed, args.lines);
      return { discountCents: value.cents, freeDelivery: value.freeDelivery, problem: null, promotion: typed };
    }
  }
  const automatic = args.seller.promotions
    .filter((item) => !item.code && check(item) === null)
    .map((item) => ({ item, value: offerValue(item, args.lines) }))
    .sort((a, b) => b.value.cents - a.value.cents)[0];
  return automatic ? { discountCents: automatic.value.cents, freeDelivery: automatic.value.freeDelivery, problem: null, promotion: automatic.item } : NO_OFFER;
}

/** Whether this code belongs to one of the seller's offers (so the checkout knows not to say "not valid"). */
export function isSellerCode(seller: SellerState, code: string): boolean {
  return seller.promotions.some((item) => item.code === code.trim().toUpperCase());
}

/** A note for the cart when the store is closed, from the seller's own schedule. */
export function closedNote(label: string, autoPause: boolean): string {
  return autoPause ? `${label}. You can still order: it waits in the store's queue and is handled when it opens.` : `${label}. The seller may take a while to answer.`;
}

export { dateKey };
