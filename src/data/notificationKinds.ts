import type { AppSettings, NotificationItem } from "./types";

/** What an in-app notification is about, so it can be filtered, given an icon and checked against the student's settings. */
export type NotificationKind = "orders" | "messages" | "offers" | "account";

export function notificationKind(item: Pick<NotificationItem, "title" | "href">): NotificationKind {
  const href = item.href ?? "";
  const title = item.title.toLowerCase();
  if (href.includes("/activity/") || /order|delivered|courier|booking|withdraw/.test(title)) return "orders";
  if (href.includes("/inbox") || /message|replied/.test(title)) return "messages";
  if (/price drop|back in stock|deal|offer|promo|search saved/.test(title) || href.includes("/promo")) return "offers";
  return "account";
}

export const kindIcon: Record<NotificationKind, "package" | "message-circle" | "tag" | "bell"> = {
  account: "bell",
  messages: "message-circle",
  offers: "tag",
  orders: "package",
};

export const kindLabel: Record<NotificationKind, string> = {
  account: "Account",
  messages: "Messages",
  offers: "Offers",
  orders: "Orders",
};

/** Whether the student's notification settings let this one through. Account notices are always shown. */
export function allowedBySettings(kind: NotificationKind, title: string, settings: Pick<AppSettings, "notifyOrders" | "notifyMessages" | "notifyPromos" | "notifyAlerts">): boolean {
  if (kind === "orders") return settings.notifyOrders;
  if (kind === "messages") return settings.notifyMessages;
  if (kind === "offers") return /price drop|back in stock/i.test(title) ? settings.notifyAlerts : settings.notifyPromos;
  return true;
}

/** Notifications that have appeared since a list was last seen, newest first. */
export function newSince(previousIds: Set<string>, current: NotificationItem[]): NotificationItem[] {
  return current.filter((item) => !item.read && !previousIds.has(item.id));
}
