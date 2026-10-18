import type { Order } from "./types";

/**
 * Vossie Points (owner decision, 2026-10-18): 1 point for every R10 spent, 10 points are worth R1.
 * Points are earned when an order is delivered. Redeeming as wallet credit and bonus actions come in Phase 4.
 */
export const CENTS_PER_POINT = 1000;
export const POINTS_PER_RAND = 10;

export type Tier = { id: "bronze" | "silver" | "gold"; label: string; from: number };

export const TIERS: Tier[] = [
  { from: 0, id: "bronze", label: "Bronze" },
  { from: 500, id: "silver", label: "Silver" },
  { from: 1500, id: "gold", label: "Gold" },
];

/** Welcome gift so a brand-new demo account does not start empty-handed. */
export const WELCOME_POINTS = 50;

export function pointsForOrder(totalCents: number): number {
  return Math.floor(Math.max(0, totalCents) / CENTS_PER_POINT);
}

/** Points earned from delivered orders plus the welcome gift. */
export function pointsBalance(orders: Pick<Order, "status" | "totalCents">[]): number {
  return (
    WELCOME_POINTS +
    orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + pointsForOrder(order.totalCents), 0)
  );
}

/** Rand value of a points balance, in cents (10 points = R1). */
export function pointsValueCents(points: number): number {
  return Math.floor(points / POINTS_PER_RAND) * 100;
}

export function tierFor(points: number): Tier {
  return [...TIERS].reverse().find((tier) => points >= tier.from) ?? TIERS[0]!;
}

/** The next tier and how far along the student is towards it; null at the top. */
export function nextTier(points: number): { tier: Tier; remaining: number; progress: number } | null {
  const current = tierFor(points);
  const next = TIERS[TIERS.indexOf(current) + 1];
  if (!next) return null;
  return { progress: (points - current.from) / (next.from - current.from), remaining: next.from - points, tier: next };
}
