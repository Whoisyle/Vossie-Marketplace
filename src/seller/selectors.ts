import { sellerBalanceCents } from "./state";
import type { LedgerEntry, SellerListing, SellerOrder, SellerOrderStatus, SellerState } from "./types";

const DAY = 86_400_000;

/** Stock at or below this counts as low and shows up under "Needs your attention". */
export const LOW_STOCK_AT = 5;

export type WeekBar = { label: string; cents: number; isToday: boolean };

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Midnight at the start of the day `now` falls in (the phone's own time zone). */
function startOfDay(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function salesBetween(ledger: LedgerEntry[], from: number, to: number): number {
  return ledger.filter((entry) => entry.kind === "sale" && new Date(entry.createdAt).getTime() >= from && new Date(entry.createdAt).getTime() < to).reduce((sum, entry) => sum + entry.amountCents, 0);
}

/** Sales for each of the last seven days, oldest first, so the chart always ends on today and is never empty. */
export function weekBars(state: Pick<SellerState, "ledger">, now: number = Date.now()): WeekBar[] {
  const today = startOfDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY;
    return { cents: salesBetween(state.ledger, from, from + DAY), isToday: i === 6, label: WEEKDAY[new Date(from).getDay()]! };
  });
}

/** The last seven days against the seven before: the total, and how much more or less in percent (null with no earlier sales). */
export function weekTotals(state: Pick<SellerState, "ledger">, now: number = Date.now()): { thisWeekCents: number; lastWeekCents: number; changePercent: number | null } {
  const today = startOfDay(now);
  const thisWeekCents = salesBetween(state.ledger, today - 6 * DAY, today + DAY);
  const lastWeekCents = salesBetween(state.ledger, today - 13 * DAY, today - 6 * DAY);
  return { changePercent: lastWeekCents > 0 ? Math.round(((thisWeekCents - lastWeekCents) / lastWeekCents) * 100) : null, lastWeekCents, thisWeekCents };
}

/** How a seller order status is grouped under the Orders filter chips. */
export type OrderGroup = "new" | "preparing" | "ready" | "done" | "cancelled";

export function groupOf(status: SellerOrderStatus): OrderGroup {
  if (status === "accepted" || status === "preparing") return "preparing";
  if (status === "declined" || status === "cancelled") return "cancelled";
  return status;
}

export function ordersInGroup(orders: SellerOrder[], group: OrderGroup): SellerOrder[] {
  return orders.filter((item) => groupOf(item.status) === group).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export function orderCounts(orders: SellerOrder[]): Record<OrderGroup, number> {
  const counts: Record<OrderGroup, number> = { cancelled: 0, done: 0, new: 0, preparing: 0, ready: 0 };
  for (const item of orders) counts[groupOf(item.status)] += 1;
  return counts;
}

export function activeListings(listings: SellerListing[]): SellerListing[] {
  return listings.filter((item) => item.status === "published");
}

export function isLowStock(listing: SellerListing): boolean {
  return listing.status === "published" && !listing.unlimited && listing.onHand <= LOW_STOCK_AT;
}

export type Attention =
  | { kind: "order"; id: string; title: string; detail: string; at: string; orderId: string }
  | { kind: "stock"; id: string; title: string; detail: string; at: string; listingId: string }
  | { kind: "message"; id: string; title: string; detail: string; at: string; conversationId: string };

/** What needs the seller now: new orders first, then stock running out, then unanswered messages. */
export function attentionItems(
  state: Pick<SellerState, "orders" | "listings">,
  messages: { id: string; name: string; unread: boolean; preview: string; at: string }[],
): Attention[] {
  const orders: Attention[] = ordersInGroup(state.orders, "new").map((item) => ({
    at: item.placedAt,
    detail: `${item.fulfilmentLabel} · ${item.buyerName}`,
    id: `a-${item.id}`,
    kind: "order",
    orderId: item.id,
    title: `${item.number} · ${item.lines.map((line) => `${line.title}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join(", ")}`,
  }));
  const stock: Attention[] = state.listings.filter(isLowStock).map((item) => ({
    at: item.updatedAt,
    detail: item.onHand === 0 ? "Sold out" : `${item.onHand} left`,
    id: `a-${item.id}`,
    kind: "stock",
    listingId: item.id,
    title: item.title,
  }));
  const talk: Attention[] = messages.filter((item) => item.unread).map((item) => ({ at: item.at, conversationId: item.id, detail: item.preview, id: `a-${item.id}`, kind: "message", title: item.name }));
  return [...orders, ...stock, ...talk];
}

export function availableCents(state: Pick<SellerState, "ledger">): number {
  return sellerBalanceCents(state);
}
