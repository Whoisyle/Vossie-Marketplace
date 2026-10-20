import { hasPlan, type Subscription } from "@/data/subscriptions";

/** The seller's plan: Free, or Seller Plus or Seller Pro, which are bought as subscriptions. */
export type SellerPlan = "free" | "plus" | "pro";

/** Vossie's cut of each sale, in percent, by plan. Demo values: the real fee policy is an open decision. */
export const FEE_PERCENT: Record<SellerPlan, number> = { free: 5, plus: 3, pro: 2 };

export const PLAN_NAMES: Record<SellerPlan, string> = { free: "Free", plus: "Seller Plus", pro: "Seller Pro" };

/** What each plan allows. `Infinity` means no limit. */
export const LIMITS: Record<SellerPlan, { products: number; liveReels: number; analytics: ("sales" | "products" | "customers" | "reels")[]; tools: { orderSearch: boolean; bulkAccept: boolean; autoAccept: boolean; returningBuyers: boolean } }> = {
  free: { analytics: ["sales"], liveReels: 0, products: 10, tools: { autoAccept: false, bulkAccept: false, orderSearch: false, returningBuyers: false } },
  plus: { analytics: ["sales", "products", "customers"], liveReels: 5, products: Infinity, tools: { autoAccept: true, bulkAccept: true, orderSearch: true, returningBuyers: false } },
  pro: { analytics: ["sales", "products", "customers", "reels"], liveReels: Infinity, products: Infinity, tools: { autoAccept: true, bulkAccept: true, orderSearch: true, returningBuyers: true } },
};

/** The plan a seller is on, from their subscriptions. The better plan wins when they hold both. */
export function sellerPlanOf(subscriptions: Subscription[], now: Date = new Date()): SellerPlan {
  if (hasPlan(subscriptions, "seller-pro", now)) return "pro";
  if (hasPlan(subscriptions, "seller-plus", now)) return "plus";
  return "free";
}

/** What the free plan lacks that the next one has, in a line for the upgrade message. */
export function upgradeReason(kind: "products" | "reels" | "analytics" | "orderTools" | "returningBuyers"): string {
  if (kind === "orderTools") return "Order search, accept all and the auto-accept rule start with Seller Plus.";
  if (kind === "returningBuyers") return "Spotting returning buyers for your marketing is a Seller Pro tool.";
  if (kind === "products") return "The Free plan holds 10 products. Seller Plus has no limit.";
  if (kind === "reels") return "Reels start with Seller Plus (up to 5 live) and are unlimited on Seller Pro.";
  return "Product and customer analytics start with Seller Plus. Reel analytics are on Seller Pro.";
}
