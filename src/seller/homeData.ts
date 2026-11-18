import { liveReelCount, type WeekBar } from "./selectors";
import type { SellerListing, SellerOrder, SellerOrderStatus, SellerState } from "./types";

/** How far along an order is, as a percent, for the progress cards on Home. A finished or cancelled order has no card. */
export function orderProgress(status: SellerOrderStatus): number {
  switch (status) {
    case "new":
      return 10;
    case "accepted":
      return 35;
    case "preparing":
      return 60;
    case "ready":
      return 85;
    case "done":
      return 100;
    default:
      return 0;
  }
}

export const ORDER_STAGE_LABEL: Partial<Record<SellerOrderStatus, string>> = { accepted: "Accepted", new: "New order", preparing: "Preparing", ready: "Ready" };

/** The orders still in progress, with the one that needs the seller soonest first: new orders, then the oldest of the rest. */
export function ongoingOrders(orders: SellerOrder[]): SellerOrder[] {
  const active = orders.filter((item) => item.status === "new" || item.status === "accepted" || item.status === "preparing" || item.status === "ready");
  const rank = (item: SellerOrder) => (item.status === "new" ? 0 : 1);
  return active.sort((a, b) => rank(a) - rank(b) || a.placedAt.localeCompare(b.placedAt));
}

/** "TI-30XS Calculator" or "TI-30XS Calculator +2 more": what is in the order, in a few words. */
export function orderTitle(order: SellerOrder): string {
  const first = order.lines[0]?.title ?? "Order";
  const more = order.lines.length - 1;
  return more > 0 ? `${first} +${more} more` : first;
}

/** Today's sales against yesterday's, from the seven-day bars (oldest first, today last). Percent is null with no sales yesterday. */
export function todayVsYesterday(bars: WeekBar[]): { todayCents: number; yesterdayCents: number; changePercent: number | null } {
  const today = bars[bars.length - 1]?.cents ?? 0;
  const yesterday = bars[bars.length - 2]?.cents ?? 0;
  return { changePercent: yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null, todayCents: today, yesterdayCents: yesterday };
}

export type ChecklistStep = { key: string; label: string; done: boolean; href: string; action: string };

/** What a new store still needs to look complete to buyers, in the order to do it. */
export function setupChecklist(seller: SellerState): { steps: ChecklistStep[]; done: number; percent: number; next?: ChecklistStep } {
  const profile = seller.profile;
  const steps: ChecklistStep[] = [
    { action: "Add a logo", done: Boolean(profile.logoUri), href: "/seller/account/store", key: "logo", label: "Add your store logo" },
    { action: "Add a banner", done: Boolean(profile.bannerUri), href: "/seller/account/store", key: "banner", label: "Add a store banner" },
    { action: "Write it", done: profile.description.trim().length >= 10, href: "/seller/account/store", key: "about", label: "Tell buyers what you sell" },
    { action: "Add a product", done: seller.listings.some((item) => item.status === "published" || item.status === "under-review"), href: "/seller/products/new", key: "product", label: "Publish your first product" },
    { action: "Post a reel", done: liveReelCount(seller.reels) > 0, href: "/seller/products/reel/new", key: "reel", label: "Post a reel" },
    { action: "Add bank", done: Boolean(profile.bank), href: "/seller/payouts", key: "bank", label: "Add your bank account for payouts" },
  ];
  const done = steps.filter((step) => step.done).length;
  return { done, next: steps.find((step) => !step.done), percent: Math.round((done / steps.length) * 100), steps };
}

const CATEGORY_LABEL: Record<SellerListing["category"], string> = { books: "Books", electronics: "Electronics", fashion: "Fashion", food: "Food", services: "Services" };

/** The store's products grouped by category, biggest first, for the collections row. Archived products are left out. */
export function collectionsOf(listings: SellerListing[]): { key: SellerListing["category"]; label: string; count: number }[] {
  const counts = new Map<SellerListing["category"], number>();
  for (const item of listings) if (item.status !== "archived") counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ count, key, label: CATEGORY_LABEL[key] })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** The people around the store: the owner and helpers the seller added, then the couriers who have taken their orders. */
export function teamPeople(seller: Pick<SellerState, "team" | "orders">, limit = 4): { id: string; name: string; role: string; detail: string }[] {
  const people = seller.team.map((member) => ({ detail: member.email, id: member.id, name: member.name, role: member.role === "owner" ? "Owner" : "Packer" }));
  const deliveries = new Map<string, number>();
  for (const order of seller.orders) if (order.courier && order.status !== "declined" && order.status !== "cancelled") deliveries.set(order.courier.name, (deliveries.get(order.courier.name) ?? 0) + 1);
  const couriers = [...deliveries.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ detail: `${count} ${count === 1 ? "delivery" : "deliveries"} for you`, id: `courier-${name}`, name, role: "Courier" }));
  return [...people, ...couriers].slice(0, limit);
}

/** The products that sold most, from orders that were not declined or cancelled. */
export function bestSellers(orders: SellerOrder[], listings: SellerListing[], limit = 4): { listing?: SellerListing; title: string; sold: number }[] {
  const sold = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "declined" || order.status === "cancelled") continue;
    for (const line of order.lines) sold.set(line.title, (sold.get(line.title) ?? 0) + line.quantity);
  }
  return [...sold.entries()]
    .map(([title, count]) => ({ listing: listings.find((item) => item.title === title), sold: count, title }))
    .sort((a, b) => b.sold - a.sold || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/** What the Home search finds: orders by number, buyer or what is in them, and products by name or code. */
export function searchSeller(seller: Pick<SellerState, "orders" | "listings">, query: string, limit = 5): { orders: SellerOrder[]; listings: SellerListing[] } {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return { listings: [], orders: [] };
  const orders = seller.orders.filter((item) => item.number.toLowerCase().includes(needle) || item.buyerName.toLowerCase().includes(needle) || item.lines.some((line) => line.title.toLowerCase().includes(needle)));
  const listings = seller.listings.filter((item) => item.title.toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle));
  return { listings: listings.slice(0, limit), orders: orders.slice(0, limit) };
}
