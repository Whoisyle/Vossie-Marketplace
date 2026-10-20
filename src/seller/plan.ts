import { hasPlan, type Subscription } from "@/data/subscriptions";

/** The seller's plan: Free, or Seller Plus or Seller Pro, which are bought as subscriptions. */
export type SellerPlan = "free" | "plus" | "pro";

/** Vossie's cut of each sale, in percent, by plan. Demo values: the real fee policy is an open decision. */
export const FEE_PERCENT: Record<SellerPlan, number> = { free: 5, plus: 3, pro: 2 };

export const PLAN_NAMES: Record<SellerPlan, string> = { free: "Free", plus: "Seller Plus", pro: "Seller Pro" };

/** What each plan allows. `Infinity` means no limit. */
export const LIMITS: Record<SellerPlan, { products: number; liveReels: number; analytics: ("sales" | "products" | "reels")[] }> = {
  free: { analytics: ["sales"], liveReels: 0, products: 10 },
  plus: { analytics: ["sales", "products"], liveReels: 5, products: Infinity },
  pro: { analytics: ["sales", "products", "reels"], liveReels: Infinity, products: Infinity },
};

/** The plan a seller is on, from their subscriptions. The better plan wins when they hold both. */
export function sellerPlanOf(subscriptions: Subscription[], now: Date = new Date()): SellerPlan {
  if (hasPlan(subscriptions, "seller-pro", now)) return "pro";
  if (hasPlan(subscriptions, "seller-plus", now)) return "plus";
  return "free";
}

/** What the free plan lacks that the next one has, in a line for the upgrade message. */
export function upgradeReason(kind: "products" | "reels" | "analytics"): string {
  if (kind === "products") return "The Free plan holds 10 products. Seller Plus has no limit.";
  if (kind === "reels") return "Reels start with Seller Plus (up to 5 live) and are unlimited on Seller Pro.";
  return "Analytics by product starts with Seller Plus. Reel analytics are on Seller Pro.";
}
