import { dealFor } from "./deals";
import { getListings, getSeller } from "./repository";
import type { CategoryId, Listing } from "./types";

/**
 * Promotion banners (demo data, 2026-10-18). Each one points at a store or a category; tapping it opens the
 * promotion page with that store's or category's discounted listings first. Later, sellers create promos from a
 * template and Vossie staff create campus-wide banners, with approval rules and their own tables.
 */
export type PromoTarget = { kind: "store"; id: string } | { kind: "category"; id: CategoryId };

export type PromoDef = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: string;
  tone: "primary" | "ink" | "teal";
  target: PromoTarget;
};

export const promoDefs: PromoDef[] = [
  { cta: "See the deals", icon: "coffee", id: "promo-campusbites", subtitle: "Burgers and meal deals between lectures", target: { id: "campusbites", kind: "store" }, title: "Lunch deals at CampusBites", tone: "primary" },
  { cta: "Shop fashion", icon: "shopping-bag", id: "promo-fashion", subtitle: "Thrifted and upcycled, up to 30% off", target: { id: "fashion", kind: "category" }, title: "Fashion finds", tone: "ink" },
  { cta: "See the deals", icon: "book-open", id: "promo-paper-trail", subtitle: "Planners, highlighters and printing for exam season", target: { id: "paper-trail", kind: "store" }, title: "Exam season stationery", tone: "teal" },
  { cta: "Browse services", icon: "tool", id: "promo-services", subtitle: "Tutors and study help from final-year students", target: { id: "services", kind: "category" }, title: "Study smart", tone: "primary" },
  { cta: "See the deals", icon: "coffee", id: "promo-coffee", subtitle: "Iced lattes and flat whites at Plato Coffee", target: { id: "plato-coffee", kind: "store" }, title: "The coffee run", tone: "ink" },
];

export function getPromo(id: string): PromoDef | undefined {
  return promoDefs.find((item) => item.id === id);
}

/** The listings a promotion covers. */
export function promoScope(def: PromoDef): Listing[] {
  return def.target.kind === "store" ? getListings({ sellerId: def.target.id }) : getListings({ categoryId: def.target.id });
}

/** Discounted listings first (biggest discount first), then the rest of that store or category. */
export function promoListings(def: PromoDef): { deals: Listing[]; others: Listing[] } {
  const all = promoScope(def);
  const deals = all.filter((listing) => dealFor(listing.id) > 0).sort((a, b) => dealFor(b.id) - dealFor(a.id));
  return { deals, others: all.filter((listing) => dealFor(listing.id) === 0) };
}

/** The biggest discount on offer, or 0. */
export function promoPercent(def: PromoDef): number {
  return Math.max(0, ...promoListings(def).deals.map((listing) => dealFor(listing.id)));
}

export function promoTargetName(def: PromoDef): string {
  if (def.target.kind === "store") return getSeller(def.target.id)?.name ?? "this store";
  return def.target.id === "services" ? "services" : def.target.id;
}
