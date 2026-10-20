import { backendEnabled, supabase, unwrap } from "@/services/client";
import * as money from "@/services/money";
import * as sellerService from "@/services/seller";
import type { SellerOrderRow, SellerOrderStatus as DbOrderStatus } from "@/services/types";

import { docKindsFor } from "./state";
import type { DayKey, DocKind, DocStatus, LedgerEntry, SellerDocument, SellerListing, SellerListingStatus, SellerOrder, SellerOrderStatus, SellerState, SellerStatus } from "./types";

/**
 * The live side of seller mode: reading what the database holds and shaping it like the demo state, so the screens
 * cannot tell which one they are showing. The shaping functions are pure and tested; `loadSellerState` is the thin part
 * that calls the services.
 */

export const DOC_KIND_TO_DB: Record<DocKind, sellerService.SellerDocKindDb> = { address: "address", cipc: "cipc", id: "id", "student-card": "student_card" };
const DOC_KIND_FROM_DB: Record<string, DocKind> = { address: "address", cipc: "cipc", id: "id", student_card: "student-card" };

/** The database's seller status as the app's: draft and rejected sellers are still in setup, active sellers are approved. */
export function mapSellerStatus(status: string | undefined): SellerStatus {
  if (!status) return "none";
  if (status === "active") return "approved";
  if (status === "pending_review" || status === "suspended") return "pending";
  return "setup";
}

export function mapDocStatus(status: string): DocStatus {
  return status === "in_review" ? "in-review" : (status as DocStatus);
}

export function mapDocuments(rows: { kind: string; status: string; file_name: string | null; note: string | null; updated_at: string }[], kind: SellerState["profile"]["kind"]): SellerDocument[] {
  return docKindsFor(kind).map((docKind) => {
    const row = rows.find((item) => DOC_KIND_FROM_DB[item.kind] === docKind);
    return row ? { fileName: row.file_name ?? undefined, kind: docKind, note: row.note ?? undefined, status: mapDocStatus(row.status), uploadedAt: row.updated_at } : { kind: docKind, status: "required" };
  });
}

/** Where an order is for the seller. Orders still waiting for payment are not shown. */
export function mapOrderStatus(status: DbOrderStatus): SellerOrderStatus | null {
  switch (status) {
    case "awaiting_payment":
      return null;
    case "awaiting_seller":
      return "new";
    case "accepted":
      return "accepted";
    case "preparing":
      return "preparing";
    case "ready":
      return "ready";
    case "in_fulfilment":
    case "delivered":
    case "issue_window":
    case "completed":
      return "done";
    case "rejected":
      return "declined";
    default:
      return "cancelled";
  }
}

export function mapSellerOrder(row: SellerOrderRow, buyerNames: Record<string, string>, collectionPlace: string): SellerOrder | null {
  const status = mapOrderStatus(row.status);
  if (!status) return null;
  const delivery = row.fulfilment === "vossie_delivery";
  return {
    buyerName: buyerNames[row.buyer_id] ?? "A student",
    buyerVerified: true,
    fulfilment: delivery ? "delivery" : "collection",
    fulfilmentLabel: delivery ? "Delivery" : "Campus collection",
    // the code is read out by the buyer and checked on the server; the seller never sees it
    handoffCode: "",
    id: row.id,
    lines: (row.order_items ?? []).map((item) => ({ optionLabel: item.option_label || undefined, quantity: item.quantity, title: item.title, unitPriceCents: item.unit_price_cents })),
    number: `#${row.number.replace(/\D/g, "").slice(-4)}`,
    paymentLabel: "Paid in app",
    place: collectionPlace,
    placedAt: row.created_at,
    status,
    subtotalCents: row.subtotal_cents,
    totalCents: row.total_cents,
  };
}

type DbListing = {
  id: string;
  type: "goods" | "service";
  title: string;
  description: string;
  status: string;
  category_id: string;
  updated_at: string;
  listing_options: { id: string; label: string; price_cents: number; on_hand: number; unlimited: boolean }[];
};

export function mapListingStatus(status: string): SellerListingStatus {
  if (status === "published") return "published";
  if (status === "paused" || status === "sold_out") return "paused";
  if (status === "draft") return "draft";
  return "under-review";
}

const CATEGORIES: SellerListing["category"][] = ["food", "books", "electronics", "fashion", "services"];

export function mapListing(row: DbListing): SellerListing {
  const option = row.listing_options[0];
  return {
    category: (CATEGORIES.includes(row.category_id as SellerListing["category"]) ? row.category_id : "food") as SellerListing["category"],
    description: row.description,
    id: row.id,
    onHand: option?.on_hand ?? 0,
    optionId: option?.id,
    priceCents: option?.price_cents ?? 0,
    status: mapListingStatus(row.status),
    title: row.title,
    unlimited: option?.unlimited ?? false,
    updatedAt: row.updated_at,
  };
}

/**
 * The earnings list from what the database knows: each finished order is a sale, each payout is money out, and
 * an opening line brings the total to the available balance the server reports.
 */
export function buildLedger(orders: SellerOrderRow[], payouts: { id: string; amount_cents: number; created_at: string }[], availableCents: number, now: number = Date.now()): LedgerEntry[] {
  const sales: LedgerEntry[] = orders
    .filter((row) => mapOrderStatus(row.status) === "done")
    .map((row) => ({ amountCents: row.subtotal_cents, createdAt: row.created_at, id: `led-${row.id}`, kind: "sale", label: `Sale · ${row.number}`, sellerOrderId: row.id }));
  const paid: LedgerEntry[] = payouts.map((row) => ({ amountCents: -row.amount_cents, createdAt: row.created_at, id: `led-${row.id}`, kind: "payout", label: "Payout · Bank transfer" }));
  const entries = [...sales, ...paid];
  const known = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  if (known !== availableCents) {
    // anything the list does not explain (older sales, adjustments) is shown as one earlier line, outside the week charts
    entries.push({ amountCents: availableCents - known, createdAt: new Date(now - 30 * 86_400_000).toISOString(), id: "led-earlier", kind: "sale", label: "Earlier earnings" });
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

type DbSeller = {
  id: string;
  display_name: string;
  bio: string | null;
  location_text: string | null;
  status: string;
  kind: string | null;
  contact_phone: string | null;
  logo_path: string | null;
  open_days: string[] | null;
  opens_at: string | null;
  closes_at: string | null;
};

const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Reads the seller's whole state from Supabase. Returns null when there is no seller yet or the backend is off. */
export async function loadSellerState(): Promise<Partial<SellerState> | null> {
  if (!backendEnabled) return null;
  const me = (await sellerService.getMySeller()) as unknown as DbSeller | null;
  if (!me) return null;
  const kind = me.kind === "student" ? "student" : me.kind === "registered" ? "registered" : me.kind === "campus_business" ? "campus-business" : null;
  const [docRows, listingRows, orderRows, balances, payouts] = await Promise.all([
    sellerService.listMySellerDocuments(),
    sellerService.listMyListingsWithStock(),
    sellerService.listIncomingOrders(),
    money.getBalances(),
    money.listMyPayouts(),
  ]);
  const buyerIds = [...new Set(orderRows.map((row) => row.buyer_id))];
  const buyers = buyerIds.length > 0 ? unwrap(await supabase.from("profile_cards").select("id, display_name").in("id", buyerIds)) : [];
  const names: Record<string, string> = Object.fromEntries((buyers as { id: string; display_name: string }[]).map((item) => [item.id, item.display_name]));
  const status = mapSellerStatus(me.status);
  return {
    approvedAt: status === "approved" ? new Date().toISOString() : undefined,
    documents: kind ? mapDocuments(docRows as never, kind) : [],
    ledger: buildLedger(orderRows, payouts as never, balances.seller_available_cents),
    listings: (listingRows as unknown as DbListing[]).map(mapListing),
    orders: orderRows.map((row) => mapSellerOrder(row, names, me.location_text ?? "")).filter((item): item is SellerOrder => item !== null),
    profile: {
      closes: (me.closes_at ?? "17:00:00").slice(0, 5),
      days: (me.open_days ?? []).filter((day: string): day is DayKey => (DAYS as string[]).includes(day)),
      description: me.bio ?? "",
      kind,
      location: me.location_text ?? "",
      logoUri: me.logo_path ? supabase.storage.from("avatars").getPublicUrl(me.logo_path).data.publicUrl : undefined,
      opens: (me.opens_at ?? "08:00:00").slice(0, 5),
      phone: me.contact_phone ?? "",
      storeId: me.id,
      storeName: me.display_name,
    },
    status,
  };
}
