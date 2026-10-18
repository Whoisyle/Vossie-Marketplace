/**
 * Vossie subscriptions (owner decision, 2026-10-18: three plans). Prices and perks are demo values until the
 * owner confirms them. Billing is taken from the Vossie wallet in the demo; a real provider comes later.
 */
export type PlanId = "plus" | "seller-pro" | "study-pass";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  tagline: string;
  perks: string[];
  /** Who the plan is for, shown as a small tag. */
  audience: string;
  icon: "star" | "briefcase" | "book-open";
  tone: "primary" | "ink" | "teal";
};

export const PLUS_ORDER_DISCOUNT_CENTS = 400;
export const PLUS_FREE_COURIER_OVER_CENTS = 10_000;
export const PLUS_POINTS_MULTIPLIER = 2;
export const STUDY_PASS_PERCENT_OFF_SERVICES = 10;

export const plans: Plan[] = [
  {
    audience: "Every student",
    icon: "star",
    id: "plus",
    name: "Vossie Plus",
    perks: [
      "R4 off every order",
      "Free Vossie courier on orders over R100",
      "Double Vossie Points on every order",
    ],
    priceCents: 4900,
    tagline: "Save on every order",
    tone: "primary",
  },
  {
    audience: "Sellers",
    icon: "briefcase",
    id: "seller-pro",
    name: "Vossie Seller Pro",
    perks: ["Featured listings in Explore", "Promotion tools for your store", "Priority support", "Seller app tools arrive with the seller app"],
    priceCents: 9900,
    tagline: "Sell more on your campus",
    tone: "ink",
  },
  {
    audience: "Students who study here",
    icon: "book-open",
    id: "study-pass",
    name: "Vossie Study Pass",
    perks: ["10% off tutoring and study rooms", "Early access to booking slots", "Exam-season study packs"],
    priceCents: 2900,
    tagline: "Tutors and study rooms for less",
    tone: "teal",
  },
];

export function getPlan(id: PlanId): Plan {
  return plans.find((plan) => plan.id === id)!;
}

export type Subscription = {
  planId: PlanId;
  since: string;
  /** The date of the next payment, or the date the plan ends when it has been cancelled. */
  renewsAt: string;
  /** Cancelled: the perks continue until `renewsAt`, then stop. */
  cancelling: boolean;
};

/** A plan is active until its period ends, even after the student cancels. */
export function hasPlan(subscriptions: Subscription[], id: PlanId, now: Date = new Date()): boolean {
  return subscriptions.some((item) => item.planId === id && new Date(item.renewsAt).getTime() > now.getTime());
}

export function nextMonth(from: Date = new Date()): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}
