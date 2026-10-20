import { sellerBalanceCents } from "./state";
import type { LedgerEntry, SellerListing, SellerOrder, SellerOrderStatus, SellerReel, SellerState } from "./types";

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
export type OrderGroup = "new" | "accepted" | "preparing" | "ready" | "done" | "cancelled";

export function groupOf(status: SellerOrderStatus): OrderGroup {
  if (status === "declined" || status === "cancelled") return "cancelled";
  return status;
}

export function ordersInGroup(orders: SellerOrder[], group: OrderGroup): SellerOrder[] {
  return orders.filter((item) => groupOf(item.status) === group).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export function orderCounts(orders: SellerOrder[]): Record<OrderGroup, number> {
  const counts: Record<OrderGroup, number> = { accepted: 0, cancelled: 0, done: 0, new: 0, preparing: 0, ready: 0 };
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

/** What the seller will earn from orders they have accepted but not yet handed over (net of Vossie's fee). */
export function pendingCents(orders: SellerOrder[]): number {
  return orders.filter((item) => item.status === "accepted" || item.status === "preparing" || item.status === "ready").reduce((sum, item) => sum + item.subtotalCents - item.feeCents, 0);
}

/** Vossie's fee on every sale so far. */
export function feesPaidCents(ledger: LedgerEntry[]): number {
  return ledger.filter((entry) => entry.kind === "sale").reduce((sum, entry) => sum + (entry.feeCents ?? 0), 0);
}

export type Analytics = {
  revenueCents: number;
  /** Percent against the same number of days before, or null with nothing to compare. */
  changePercent: number | null;
  orders: number;
  /** Orders in the range against the week before, as a plain difference. */
  bars: { label: string; cents: number }[];
  top: { title: string; sold: number; cents: number }[];
};

/** Revenue, orders and the best sellers over the last `days` days, with a bar for each slice of the range. */
export function analytics(state: Pick<SellerState, "ledger" | "orders">, days: 7 | 30 | 90, now: number = Date.now()): Analytics {
  const today = startOfDay(now);
  const from = today - (days - 1) * DAY;
  const revenueCents = salesBetween(state.ledger, from, today + DAY);
  const before = salesBetween(state.ledger, from - days * DAY, from);
  const slices = 7;
  const span = (days * DAY) / slices;
  const bars = Array.from({ length: slices }, (_, i) => {
    const start = from + i * span;
    return { cents: salesBetween(state.ledger, start, start + span), label: days === 7 ? WEEKDAY[new Date(start).getDay()]!.slice(0, 1) : `${i + 1}` };
  });
  const inRange = state.orders.filter((item) => item.status !== "declined" && item.status !== "cancelled" && new Date(item.placedAt).getTime() >= from);
  const sold = new Map<string, { sold: number; cents: number }>();
  for (const order of inRange) for (const line of order.lines) sold.set(line.title, { cents: (sold.get(line.title)?.cents ?? 0) + line.unitPriceCents * line.quantity, sold: (sold.get(line.title)?.sold ?? 0) + line.quantity });
  const top = [...sold.entries()].map(([title, value]) => ({ title, ...value })).sort((a, b) => b.cents - a.cents).slice(0, 5);
  return { bars, changePercent: before > 0 ? Math.round(((revenueCents - before) / before) * 100) : null, orders: inRange.length, revenueCents, top };
}

/** How much people who watched a reel did something: liked it, saved it or tapped through, as a percent of views. */
export function engagementPercent(reel: SellerReel): number {
  return reel.views > 0 ? Math.round(((reel.likes + reel.saves + reel.taps) / reel.views) * 1000) / 10 : 0;
}

/** Live reels best first: the most sales, then the most views. Drafts and hidden reels follow, newest first. */
export function rankReels(reels: SellerReel[]): SellerReel[] {
  const live = reels.filter((item) => item.status === "published").sort((a, b) => b.salesCents - a.salesCents || b.views - a.views);
  const rest = reels.filter((item) => item.status !== "published").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...live, ...rest];
}

/** The best performing live reel, or undefined when none has had a view. */
export function bestReel(reels: SellerReel[]): SellerReel | undefined {
  const [first] = rankReels(reels);
  return first && first.status === "published" && first.views > 0 ? first : undefined;
}

export function liveReelCount(reels: SellerReel[]): number {
  return reels.filter((item) => item.status === "published").length;
}

/** Products that count against the plan's limit: everything that is not archived. */
export function productCount(listings: SellerListing[]): number {
  return listings.filter((item) => item.status !== "archived").length;
}

export type SeriesPoint = { label: string; startsAt: number; cents: number };

const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Sales for each day (or each few days over 90 days, so the line stays readable), oldest first, with the same stretch the period before. */
export function revenueSeries(ledger: LedgerEntry[], days: 7 | 30 | 90, now: number = Date.now()): { points: SeriesPoint[]; previous: SeriesPoint[] } {
  const today = startOfDay(now);
  const step = days === 90 ? 3 : 1;
  const count = days / step;
  const build = (endDay: number): SeriesPoint[] =>
    Array.from({ length: count }, (_, i) => {
      const from = endDay - (days - 1) * DAY + i * step * DAY;
      const date = new Date(from);
      return { cents: salesBetween(ledger, from, from + step * DAY), label: `${date.getDate()} ${SHORT_MONTH[date.getMonth()]}`, startsAt: from };
    });
  return { points: build(today), previous: build(today - days * DAY) };
}

export type Insights = {
  revenueCents: number;
  netCents: number;
  feesCents: number;
  refundCents: number;
  orders: number;
  averageOrderCents: number;
  newBuyers: number;
  returningBuyers: number;
  repeatPercent: number;
  delivery: number;
  collection: number;
  cancelledPercent: number;
  categories: { key: string; label: string; cents: number }[];
  /** Sales by weekday (Monday first) and time of day (morning, afternoon, evening). */
  heat: number[][];
  topBuyers: { name: string; orders: number; cents: number }[];
};

/** Everything the Analytics tabs show beyond the revenue line, worked out from the seller's own orders and ledger. */
export function insights(state: Pick<SellerState, "ledger" | "orders" | "listings">, days: 7 | 30 | 90, now: number = Date.now()): Insights {
  const from = startOfDay(now) - (days - 1) * DAY;
  const inRange = state.orders.filter((item) => new Date(item.placedAt).getTime() >= from);
  const sold = inRange.filter((item) => item.status !== "declined" && item.status !== "cancelled");
  const sales = state.ledger.filter((entry) => entry.kind === "sale" && new Date(entry.createdAt).getTime() >= from);
  const revenueCents = sales.reduce((sum, entry) => sum + entry.amountCents, 0);
  const feesCents = sales.reduce((sum, entry) => sum + (entry.feeCents ?? 0), 0);
  const refundCents = state.ledger.filter((entry) => entry.kind === "refund" && new Date(entry.createdAt).getTime() >= from).reduce((sum, entry) => sum - entry.amountCents, 0);
  const everyOrder = new Map<string, number>();
  for (const item of state.orders) if (item.status !== "declined" && item.status !== "cancelled") everyOrder.set(item.buyerName, (everyOrder.get(item.buyerName) ?? 0) + 1);
  const buyers = new Map<string, { orders: number; cents: number }>();
  for (const item of sold) {
    const current = buyers.get(item.buyerName) ?? { cents: 0, orders: 0 };
    buyers.set(item.buyerName, { cents: current.cents + item.subtotalCents, orders: current.orders + 1 });
  }
  const returning = [...buyers.keys()].filter((name) => (everyOrder.get(name) ?? 0) > 1).length;
  const categories = new Map<string, number>();
  for (const item of sold) {
    for (const line of item.lines) {
      const category = state.listings.find((listing) => listing.title === line.title)?.category ?? "other";
      categories.set(category, (categories.get(category) ?? 0) + line.unitPriceCents * line.quantity);
    }
  }
  const heat = Array.from({ length: 7 }, () => [0, 0, 0]);
  for (const entry of sales) {
    const at = new Date(entry.createdAt);
    const row = (at.getDay() + 6) % 7;
    const hour = at.getHours();
    heat[row]![hour < 12 ? 0 : hour < 17 ? 1 : 2]! += 1;
  }
  return {
    averageOrderCents: sold.length > 0 ? Math.round(sold.reduce((sum, item) => sum + item.subtotalCents, 0) / sold.length) : 0,
    cancelledPercent: inRange.length > 0 ? Math.round(((inRange.length - sold.length) / inRange.length) * 100) : 0,
    categories: [...categories.entries()].map(([key, cents]) => ({ cents, key, label: key[0]!.toUpperCase() + key.slice(1) })).sort((a, b) => b.cents - a.cents),
    collection: sold.filter((item) => item.fulfilment === "collection").length,
    delivery: sold.filter((item) => item.fulfilment === "delivery").length,
    feesCents,
    heat,
    netCents: revenueCents - refundCents,
    newBuyers: buyers.size - returning,
    orders: sold.length,
    refundCents,
    repeatPercent: buyers.size > 0 ? Math.round((returning / buyers.size) * 100) : 0,
    returningBuyers: returning,
    revenueCents,
    topBuyers: [...buyers.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.cents - a.cents).slice(0, 3),
  };
}
