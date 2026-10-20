import { toMin } from "./schedule";
import type { NotifyKind, NotifyPrefs, SellerAlert } from "./types";

/** Which notification setting an alert falls under. Account alerts (approval, support) have no switch and always come through. */
export function notifyKindOf(alert: Pick<SellerAlert, "kind">): NotifyKind | null {
  switch (alert.kind) {
    case "order":
      return "orders";
    case "stock":
      return "stock";
    case "message":
      return "messages";
    case "money":
      return "money";
    case "review":
      return "reviews";
    case "promo":
      return "promotions";
    default:
      return null;
  }
}

/** Whether a time falls in the quiet hours, including a stretch that runs past midnight (22:00 to 06:30). */
export function inQuietHours(quiet: NotifyPrefs["quiet"], now: Date): boolean {
  if (!quiet.on) return false;
  const from = toMin(quiet.from);
  const to = toMin(quiet.to);
  if (Number.isNaN(from) || Number.isNaN(to) || from === to) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export type PushPlan = {
  /** Show the heads-up card at all. */
  show: boolean;
  /** Buzz and chime with it. Off in quiet hours and when sound is off. */
  loud: boolean;
};

/** What to do with a new alert, from the seller's choices: push for its kind, quiet hours and sound. */
export function planPush(prefs: NotifyPrefs, alert: Pick<SellerAlert, "kind">, now: Date): PushPlan {
  const kind = notifyKindOf(alert);
  const wanted = kind ? prefs.channels[kind].push : true;
  return { loud: wanted && prefs.sound && !inQuietHours(prefs.quiet, now), show: wanted };
}

export type PushAction = { key: "accept" | "decline" | "restock" | "reply" | "view"; label: string };

/** The buttons under a notification, so the common job can be done without opening the app. */
export function actionsFor(alert: Pick<SellerAlert, "kind">): PushAction[] {
  switch (alert.kind) {
    case "order":
      return [{ key: "accept", label: "Accept" }, { key: "decline", label: "Decline" }];
    case "stock":
      return [{ key: "restock", label: "Restock +10" }];
    case "message":
    case "review":
      return [{ key: "reply", label: "Reply" }];
    default:
      return [{ key: "view", label: "View" }];
  }
}

/** A made-up example of each kind, for the preview gallery and the test push. */
export const SAMPLE_PUSH: Record<NotifyKind, { title: string; body: string; kind: SellerAlert["kind"]; href: string }> = {
  messages: { body: "Lerato M.: Is the calculator still available?", href: "/seller/home/messages", kind: "message", title: "New message" },
  money: { body: "R 1 111.00 is on its way to your bank.", href: "/seller/payouts", kind: "money", title: "Payout requested" },
  orders: { body: "Thabo Mokoena ordered TI-30XS Calculator and Calculator cover.", href: "/seller/orders", kind: "order", title: "New order #VM-2041" },
  promotions: { body: "First order 10% off ends in 3 days.", href: "/seller/account/promotions", kind: "promo", title: "Promotion ending soon" },
  reviews: { body: "Sipho N. left 4 stars: Good condition, courier was a bit late.", href: "/seller/account/reviews", kind: "review", title: "New review" },
  stock: { body: "TI-30XS Calculator is down to 2.", href: "/seller/products/inventory", kind: "stock", title: "Low stock" },
};
