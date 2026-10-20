import { dateKey, shortDay } from "./schedule";
import type { SellerPromotion } from "./types";

export const PROMOTION_KINDS: { key: SellerPromotion["kind"]; label: string }[] = [
  { key: "percent", label: "Percent off" },
  { key: "rand-off", label: "Rand off" },
  { key: "free-delivery", label: "Free delivery" },
  { key: "buy-x-get-y", label: "Buy X get Y" },
  { key: "bundle", label: "Bundle price" },
];

function rand(cents: number): string {
  const rands = cents / 100;
  return `R${Number.isInteger(rands) ? rands : rands.toFixed(2)}`;
}

/** The line buyers read for an offer, made from what the seller filled in. */
export function promotionDetail(item: SellerPromotion): string {
  const parts: string[] = [];
  if (item.kind === "percent") parts.push(`${item.value ?? 10}% off`);
  else if (item.kind === "rand-off") parts.push(`${rand(item.value ?? 2000)} off`);
  else if (item.kind === "free-delivery") parts.push("Free delivery");
  else if (item.kind === "buy-x-get-y") parts.push(`Buy ${item.buyX ?? 2}, get ${item.getY ?? 1} free`);
  else parts.push(`Bundle for ${rand(item.value ?? 10_000)}`);
  if (item.minSpendCents) parts.push(`over ${rand(item.minSpendCents)}`);
  if (item.appliesTo === "products" && item.listingIds?.length) parts.push(`on ${item.listingIds.length} ${item.listingIds.length === 1 ? "product" : "products"}`);
  if (item.appliesTo === "category" && item.category) parts.push(`on ${item.category}`);
  if (item.firstOrderOnly) parts.push("first order");
  if (item.code) parts.push(`code ${item.code}`);
  if (item.endsAt) parts.push(`ends ${shortDay(item.endsAt)}`);
  return parts.join(" · ");
}

export type PromotionState = "active" | "scheduled" | "ended" | "paused";

/** Where an offer is up to today: running, not started, over, or switched off. */
export function promotionState(item: SellerPromotion, now: Date): PromotionState {
  const today = dateKey(now);
  if (item.ended || (item.endsAt && item.endsAt < today)) return "ended";
  if (!item.active) return item.scheduled || (item.startsAt && item.startsAt > today) ? "scheduled" : "paused";
  if (item.startsAt && item.startsAt > today) return "scheduled";
  return "active";
}

export type PromotionProblem = "title" | "value" | "code" | "dates" | "products" | "limit";

/** What is wrong with an offer that stops it being saved, one entry for each field. */
export function promotionProblems(item: SellerPromotion, others: SellerPromotion[]): Partial<Record<PromotionProblem, string>> {
  const found: Partial<Record<PromotionProblem, string>> = {};
  if (item.title.trim().length < 3) found.title = "Give the offer a name of at least 3 letters.";
  if (item.kind === "percent" && !((item.value ?? 0) >= 1 && (item.value ?? 0) <= 90)) found.value = "Choose a percent between 1 and 90.";
  if (item.kind === "rand-off" && (item.value ?? 0) < 100) found.value = "Choose an amount of at least R1.";
  if (item.kind === "bundle" && (item.value ?? 0) < 100) found.value = "Choose a bundle price of at least R1.";
  if (item.kind === "buy-x-get-y" && !((item.buyX ?? 0) >= 1 && (item.getY ?? 0) >= 1)) found.value = "Choose how many to buy and how many are free.";
  if (item.code !== undefined) {
    if (!/^[A-Z0-9]{4,12}$/.test(item.code)) found.code = "A code is 4 to 12 letters or numbers.";
    else if (others.some((other) => other.id !== item.id && other.code === item.code && promotionState(other, new Date()) !== "ended")) found.code = "You already use that code.";
  }
  if (item.startsAt && item.endsAt && item.endsAt < item.startsAt) found.dates = "The end date must be on or after the start date.";
  if (item.appliesTo === "products" && !item.listingIds?.length) found.products = "Pick at least one product.";
  if (item.maxUses !== undefined && item.perStudent !== undefined && item.perStudent > item.maxUses) found.limit = "One student cannot use it more times than the total.";
  return found;
}
