import { MIN_WITHDRAW_CENTS } from "@/data/wallet";

import type {
  DocKind,
  LedgerEntry,
  SellerAction,
  SellerAlert,
  SellerDocument,
  SellerKind,
  SellerListing,
  SellerOrder,
  SellerState,
} from "./types";

/** The catalogue store the demo seller runs. A new seller in the demo takes over CampusBites. */
export const DEMO_STORE_ID = "campusbites";

const MIN = 60_000;
const DAY = 86_400_000;

let counter = 0;
export function sellerId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

/** Six digits the buyer reads out when they collect an order. */
export function handoffCodeFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000;
  return String(hash).padStart(6, "0");
}

/** The documents asked for from each kind of seller. The student card comes first. */
export function docKindsFor(kind: SellerKind | null): DocKind[] {
  return kind === "registered" ? ["student-card", "id", "address", "cipc"] : ["student-card", "id", "address"];
}

export const docTitles: Record<DocKind, string> = {
  address: "Proof of address",
  cipc: "CIPC registration",
  id: "ID document",
  "student-card": "Student card",
};

export const docHints: Record<DocKind, string> = {
  address: "Tap to upload PDF or photo",
  cipc: "Company registration certificate",
  id: "South African ID or passport",
  "student-card": "Checked against your Eduvos record",
};

const names: [string, string, string][] = [
  ["Thabo N.", "TN", "Student Center"],
  ["Aisha D.", "AD", "Res Block B"],
  ["Sipho K.", "SK", "Student Center"],
];

function order(partial: Partial<SellerOrder> & Pick<SellerOrder, "id" | "number" | "buyerName" | "lines" | "status" | "placedAt">): SellerOrder {
  const subtotal = partial.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  return {
    buyerVerified: true,
    fulfilment: "collection",
    fulfilmentLabel: "Campus collection",
    handoffCode: handoffCodeFor(partial.id),
    paymentLabel: "Paid in app",
    place: "Student Center",
    subtotalCents: subtotal,
    totalCents: subtotal,
    ...partial,
  };
}

/** The orders waiting for the seller, taken from the owner's designs, plus a few already in progress or finished. */
function ordersSeed(now: number): SellerOrder[] {
  const ago = (minutes: number) => new Date(now - minutes * MIN).toISOString();
  return [
    order({ by: "11:30", id: "so-2041", lines: [{ optionLabel: "Large", quantity: 2, title: "Burger & Chips", unitPriceCents: 6000 }], number: "#2041", buyerName: names[0]![0], placedAt: ago(18), status: "new" }),
    order({ fulfilment: "delivery", fulfilmentLabel: "Delivery to res", id: "so-2040", lines: [{ quantity: 1, title: "Iced Latte", unitPriceCents: 3500 }], number: "#2040", buyerName: names[1]![0], place: "Res Block B", placedAt: ago(25), status: "new" }),
    order({ by: "12:00", id: "so-2039", lines: [{ quantity: 1, title: "Study Notes Bundle", unitPriceCents: 8500 }], number: "#2039", buyerName: names[2]![0], placedAt: ago(40), status: "new" }),
    order({ by: "11:15", id: "so-2038", lines: [{ optionLabel: "Peri-peri", quantity: 1, title: "Grilled Chicken Wrap", unitPriceCents: 5500 }], number: "#2038", buyerName: "Lerato M.", placedAt: ago(55), status: "preparing" }),
    order({ fulfilment: "delivery", fulfilmentLabel: "Delivery to res", id: "so-2037", lines: [{ quantity: 1, title: "Kota Special", unitPriceCents: 4500 }], number: "#2037", buyerName: "Kabelo P.", place: "Res Block A", placedAt: ago(70), status: "accepted" }),
    order({ by: "10:45", id: "so-2036", lines: [{ quantity: 1, title: "Zinger Student Meal", unitPriceCents: 5900 }], number: "#2036", buyerName: "Naledi S.", placedAt: ago(95), status: "ready" }),
    order({ id: "so-2035", lines: [{ quantity: 1, title: "Burger & Chips", unitPriceCents: 6000 }], number: "#2035", buyerName: "Mpho L.", placedAt: ago(26 * 60), status: "done" }),
    order({ id: "so-2034", lines: [{ quantity: 2, title: "Iced Latte", unitPriceCents: 3500 }], number: "#2034", buyerName: "Zanele T.", placedAt: ago(28 * 60), status: "done" }),
    order({ id: "so-2033", lines: [{ quantity: 1, title: "Kota Special", unitPriceCents: 4500 }], number: "#2033", buyerName: "Johan V.", placedAt: ago(30 * 60), status: "done" }),
    order({ id: "so-2032", lines: [{ quantity: 1, title: "Grilled Chicken Wrap", unitPriceCents: 5500 }], number: "#2032", buyerName: "Ayanda M.", placedAt: ago(52 * 60), status: "cancelled", declineReason: "Sold out" }),
  ];
}

function listingsSeed(now: number): SellerListing[] {
  const at = new Date(now - 3 * DAY).toISOString();
  const base = { description: "", status: "published" as const, unlimited: false, updatedAt: at };
  return [
    { ...base, artId: "burger-chips", category: "food", description: "Flame-grilled beef patty, cheese, lettuce and chips.", id: "sl-burger", onHand: 24, priceCents: 6000, title: "Burger & Chips" },
    { ...base, artId: "chicken-wrap", category: "food", description: "Peri-peri chicken, slaw and garlic mayo in a toasted wrap.", id: "sl-wrap", onHand: 12, priceCents: 5500, title: "Grilled Chicken Wrap" },
    { ...base, artId: "flat-white", category: "food", description: "Plain filter coffee, brewed fresh.", id: "sl-coffee", onHand: 3, priceCents: 2200, title: "Plain Coffee" },
    { ...base, artId: "kota-special", category: "food", description: "Quarter loaf stuffed with chips, polony, cheese and sauce.", id: "sl-kota", onHand: 9, priceCents: 4500, title: "Kota Special" },
    { ...base, artId: "zinger-meal", category: "food", description: "Crispy zinger burger with a cold drink.", id: "sl-zinger", onHand: 15, priceCents: 5900, title: "Zinger Student Meal" },
    { ...base, artId: "iced-latte", category: "food", description: "Iced latte over ice.", id: "sl-latte", onHand: 30, priceCents: 3500, title: "Iced Latte" },
    { ...base, artId: "textbook-econ", category: "books", description: "Typed notes and past papers for first-year modules.", id: "sl-notes", onHand: 0, priceCents: 8500, title: "Study Notes Bundle", unlimited: true },
  ];
}

const SALE_NAMES = ["Burger & Chips", "Iced Latte", "Kota Special", "Grilled Chicken Wrap", "Zinger Student Meal", "Study Notes Bundle"];

/**
 * A fortnight of sales and one payout, built so the numbers match the designs: R1,245.00 in the last seven days,
 * 12% more than the seven before, and everything older already paid out.
 */
function ledgerSeed(now: number): LedgerEntry[] {
  const thisWeek = [11000, 15000, 22000, 19000, 26500, 19000, 12000];
  const lastWeek = [9000, 12000, 18000, 16000, 21100, 19000, 16000];
  const entries: LedgerEntry[] = [];
  const day = (offset: number, total: number, index: number) => {
    const first = Math.round((total * 0.45) / 100) * 100;
    const parts = [first, total - first];
    parts.forEach((cents, part) => {
      const stamp = now - offset * DAY - (part === 0 ? 5 : 2) * 60 * MIN - (part === 0 && offset === 0 ? 0 : 0);
      entries.push({
        amountCents: cents,
        createdAt: new Date(Math.min(stamp, now - (part + 1) * 20 * MIN)).toISOString(),
        id: `led-${offset}-${part}`,
        kind: "sale",
        label: `Sale · ${SALE_NAMES[(index + part) % SALE_NAMES.length]}`,
      });
    });
  };
  thisWeek.forEach((total, i) => day(6 - i, total, i));
  lastWeek.forEach((total, i) => day(13 - i, total, i + 2));
  entries.push({ amountCents: -lastWeek.reduce((a, b) => a + b, 0), createdAt: new Date(now - 1 * DAY - 3 * 60 * MIN).toISOString(), id: "led-payout-1", kind: "payout", label: "Payout · Bank transfer" });
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function alertsSeed(now: number): SellerAlert[] {
  const ago = (minutes: number) => new Date(now - minutes * MIN).toISOString();
  return [
    { body: "Thabo N. ordered Burger & Chips x2.", createdAt: ago(18), href: "/seller/orders/so-2041", id: "sa-1", kind: "order", read: false, title: "New order #2041" },
    { body: "Plain Coffee is down to 3.", createdAt: ago(120), href: "/seller/listings/sl-coffee", id: "sa-2", kind: "stock", read: false, title: "Low stock" },
    { body: "Lerato M.: Is the burger still available?", createdAt: ago(200), href: "/seller/home/messages", id: "sa-3", kind: "message", read: true, title: "New message" },
  ];
}

/** A seller with nothing in it: what the live backend starts from, and the state of someone who has not started. */
export function emptySellerState(): SellerState {
  return {
    alerts: [],
    documents: [],
    ledger: [],
    listings: [],
    orders: [],
    profile: { closes: "17:00", days: ["mon", "tue", "wed", "thu", "fri"], description: "", kind: null, location: "", opens: "08:00", phone: "", storeId: "", storeName: "" },
    setupDone: false,
    status: "none",
    step: 1,
  };
}

export function createSellerState(now: number = Date.now()): SellerState {
  return {
    alerts: alertsSeed(now),
    documents: [],
    ledger: ledgerSeed(now),
    listings: listingsSeed(now),
    orders: ordersSeed(now),
    profile: {
      closes: "17:00",
      days: ["mon", "tue", "wed", "thu", "fri"],
      description: "",
      kind: null,
      location: "",
      opens: "08:00",
      phone: "",
      storeId: DEMO_STORE_ID,
      storeName: "",
    },
    setupDone: false,
    status: "none",
    step: 1,
  };
}

/** Documents for a seller kind: the student card is accepted straight away when the Eduvos record matches. */
export function documentsFor(kind: SellerKind | null, verifiedStudent: boolean, now: number = Date.now()): SellerDocument[] {
  return docKindsFor(kind).map((docKind) =>
    docKind === "student-card" && verifiedStudent
      ? { fileName: "Eduvos record", kind: docKind, status: "verified", uploadedAt: new Date(now).toISOString() }
      : { kind: docKind, status: "required" },
  );
}

export function sellerBalanceCents(state: Pick<SellerState, "ledger">): number {
  return state.ledger.reduce((sum, entry) => sum + entry.amountCents, 0);
}

const rank: Record<SellerOrder["status"], number> = { accepted: 1, cancelled: -1, declined: -1, done: 4, new: 0, preparing: 2, ready: 3 };

/** The seller side of every seller action. Changes to the buyer's own order, alerts and notifications are made by `bridge.ts`. */
export function sellerReduce(state: SellerState, action: SellerAction, ctx: { verifiedStudent: boolean; now?: number } = { verifiedStudent: true }): SellerState {
  const now = ctx.now ?? Date.now();
  const stamp = new Date(now).toISOString();
  const patchOrder = (id: string, patch: Partial<SellerOrder>) => state.orders.map((item) => (item.id === id ? { ...item, ...patch } : item));
  const addAlert = (alert: Omit<SellerAlert, "createdAt" | "id" | "read">): SellerAlert[] => [{ ...alert, createdAt: stamp, id: sellerId("sa"), read: false }, ...state.alerts];

  switch (action.type) {
    case "sellerStart":
      return state.status === "none" ? { ...state, status: "setup", step: 1 } : state;
    case "sellerSetKind": {
      const documents = state.documents.length > 0 && state.profile.kind === action.kind ? state.documents : documentsFor(action.kind, ctx.verifiedStudent, now);
      return { ...state, documents, profile: { ...state.profile, kind: action.kind } };
    }
    case "sellerSetBasics":
      return { ...state, profile: { ...state.profile, phone: action.phone.trim(), storeName: action.storeName.trim() } };
    case "sellerGoToStep":
      return { ...state, step: action.step };
    case "sellerUploadDocument":
      return {
        ...state,
        documents: state.documents.map((doc) => (doc.kind === action.kind && doc.status !== "verified" ? { ...doc, fileName: action.fileName, status: "uploaded", uploadedAt: stamp } : doc)),
      };
    case "sellerSubmitVerification": {
      if (state.documents.length === 0 || state.documents.some((doc) => doc.status === "required" || doc.status === "rejected")) return state;
      return {
        ...state,
        documents: state.documents.map((doc) => (doc.status === "uploaded" ? { ...doc, status: "in-review" } : doc)),
        status: state.status === "approved" ? "approved" : "pending",
        submittedAt: stamp,
      };
    }
    case "sellerReviewTick": {
      // demo only: Vossie Operations accepts one document at a time; when the last is accepted the seller is approved
      const next = state.documents.find((doc) => doc.status === "in-review");
      if (!next) return state;
      const documents = state.documents.map((doc) => (doc.kind === next.kind ? { ...doc, status: "verified" as const } : doc));
      const allVerified = documents.every((doc) => doc.status === "verified");
      return {
        ...state,
        alerts: allVerified ? addAlert({ body: "You can start listing and taking orders.", href: "/seller/home", kind: "account", title: "You are an approved seller" }) : state.alerts,
        approvedAt: allVerified ? stamp : state.approvedAt,
        documents,
        status: allVerified ? "approved" : state.status,
      };
    }
    case "sellerSaveStore":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "sellerFinishSetup":
      return { ...state, setupDone: true, status: state.status === "setup" ? "setup" : state.status };
    case "sellerReceiveOrder": {
      if (state.orders.some((item) => item.id === action.order.id)) return state;
      return {
        ...state,
        alerts: addAlert({ body: `${action.order.buyerName} ordered ${action.order.lines.map((line) => `${line.title}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join(", ")}.`, href: `/seller/orders/${action.order.id}`, kind: "order", title: `New order ${action.order.number}` }),
        orders: [action.order, ...state.orders],
      };
    }
    case "sellerRespondOrder": {
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || current.status !== "new") return state;
      return action.accept
        ? { ...state, orders: patchOrder(action.id, { status: "accepted" }) }
        : { ...state, orders: patchOrder(action.id, { declineReason: action.reason ?? "Declined by the seller", status: "declined" }) };
    }
    case "sellerAdvanceOrder": {
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || rank[action.to] <= rank[current.status] || current.status === "declined" || current.status === "cancelled") return state;
      return { ...state, orders: patchOrder(action.id, { status: action.to }) };
    }
    case "sellerCompleteOrder": {
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || current.status === "done" || current.status === "declined" || current.status === "cancelled") return state;
      const label = `Sale · ${current.lines.map((line) => `${line.title}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join(", ")}`;
      return {
        ...state,
        alerts: addAlert({ body: `${current.number} was handed over. ${label.replace("Sale · ", "")} has been paid to you.`, href: "/seller/earnings", kind: "money", title: "Order complete" }),
        ledger: [{ amountCents: current.subtotalCents, createdAt: stamp, id: sellerId("led"), kind: "sale", label, sellerOrderId: current.id }, ...state.ledger],
        orders: patchOrder(action.id, { status: "done" }),
      };
    }
    case "sellerSaveListing": {
      const exists = state.listings.some((item) => item.id === action.listing.id);
      const listing = { ...action.listing, updatedAt: stamp };
      return { ...state, listings: exists ? state.listings.map((item) => (item.id === listing.id ? listing : item)) : [listing, ...state.listings] };
    }
    case "sellerPauseListing":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, status: action.paused ? "paused" : "published", updatedAt: stamp } : item)) };
    case "sellerRestock":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, onHand: item.onHand + Math.max(0, action.quantity), updatedAt: stamp } : item)) };
    case "sellerDeleteListing":
      return { ...state, listings: state.listings.filter((item) => item.id !== action.id) };
    case "sellerSaveBank":
      return { ...state, profile: { ...state.profile, bank: action.bank } };
    case "sellerWithdraw": {
      if (action.amountCents < MIN_WITHDRAW_CENTS || action.amountCents > sellerBalanceCents(state) || !state.profile.bank) return state;
      return {
        ...state,
        alerts: addAlert({ body: `R${(action.amountCents / 100).toFixed(2)} is on its way to ${state.profile.bank.bankName}.`, href: "/seller/earnings", kind: "money", title: "Withdrawal requested" }),
        ledger: [{ amountCents: -action.amountCents, createdAt: stamp, id: sellerId("led"), kind: "payout", label: "Payout · Bank transfer" }, ...state.ledger],
      };
    }
    case "sellerMarkAlertsRead":
      return { ...state, alerts: state.alerts.map((item) => ({ ...item, read: true })) };
    case "sellerHydrate": {
      const patch = action.patch;
      const orders = patch.orders ?? state.orders;
      // a new order the seller has not been told about yet becomes an alert
      const known = new Set(state.alerts.map((item) => item.id));
      const fresh: SellerAlert[] = orders
        .filter((item) => item.status === "new" && !known.has(`sa-${item.id}`))
        .map((item) => ({ body: `${item.buyerName} ordered ${item.lines.map((line) => `${line.title}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join(", ")}.`, createdAt: item.placedAt, href: `/seller/orders/${item.id}`, id: `sa-${item.id}`, kind: "order" as const, read: false, title: `New order ${item.number}` }));
      const status = patch.status ?? state.status;
      return {
        ...state,
        ...patch,
        alerts: [...fresh, ...state.alerts],
        profile: patch.profile ? { ...state.profile, ...patch.profile, bank: state.profile.bank, logoUri: patch.profile.logoUri ?? state.profile.logoUri } : state.profile,
        // someone who finished the store step before, or who is approved, does not set up again on a new phone
        setupDone: state.setupDone || status === "approved" || Boolean(patch.profile?.location),
        step: state.step,
      };
    }
    default:
      return state;
  }
}

const ARRIVALS: { buyer: string; line: SellerOrder["lines"][number]; delivery?: string; by?: string }[] = [
  { buyer: "Zinhle M.", by: "12:30", line: { quantity: 1, title: "Zinger Student Meal", unitPriceCents: 5900 } },
  { buyer: "Pieter V.", delivery: "Res Block C", line: { quantity: 1, title: "Kota Special", unitPriceCents: 4500 } },
  { buyer: "Amanda K.", by: "13:00", line: { quantity: 2, title: "Iced Latte", unitPriceCents: 3500 } },
];

/** Demo only: the n-th order that arrives from a student while the seller is using the app, so the arrival can be seen. */
export function demoIncomingOrder(now: number, n: number): SellerOrder {
  const pick = ARRIVALS[n % ARRIVALS.length]!;
  const id = `so-demo-${n}-${now.toString(36)}`;
  const subtotal = pick.line.unitPriceCents * pick.line.quantity;
  return {
    buyerName: pick.buyer,
    buyerVerified: true,
    by: pick.by,
    fulfilment: pick.delivery ? "delivery" : "collection",
    fulfilmentLabel: pick.delivery ? "Delivery to res" : "Campus collection",
    handoffCode: handoffCodeFor(id),
    id,
    lines: [pick.line],
    number: `#${2042 + n}`,
    paymentLabel: "Paid in app",
    place: pick.delivery ?? "Student Center",
    placedAt: new Date(now).toISOString(),
    status: "new",
    subtotalCents: subtotal,
    totalCents: subtotal,
  };
}
