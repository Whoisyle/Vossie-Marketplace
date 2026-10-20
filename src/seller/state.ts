import { MIN_WITHDRAW_CENTS } from "@/data/wallet";

import { FEE_PERCENT, LIMITS, type SellerPlan } from "./plan";
import { promotionDetail } from "./promotions";
import { SAMPLE_PUSH } from "./push";
import { scheduleFromProfile, storeStatus, summaryRange, weekKey } from "./schedule";
import {
  NOTIFY_KINDS,
  type DocKind,
  type LedgerEntry,
  type NotifyPrefs,
  type SellerAction,
  type AutoAccept,
  type SellerAlert,
  type SellerCase,
  type SellerDocument,
  type SellerKind,
  type SellerListing,
  type SellerOrder,
  type SellerPromotion,
  type SellerReel,
  type SellerReview,
  type SupportTicket,
  type SellerState,
  type TeamMember,
} from "./types";

/** The catalogue store the demo seller runs. A new seller in the demo takes over CampusBites, the catalogue store buyers can order from. */
export const DEMO_STORE_ID = "campusbites";

/** Vossie's cut of the items on an order, in percent. A demo value: the real fee policy is an open decision. */
export const PLATFORM_FEE_PERCENT = 5;

/** The fee on a subtotal, in cents, rounded to the nearest cent. */
export function platformFeeCents(subtotalCents: number, plan: SellerPlan = "free"): number {
  return Math.round((subtotalCents * FEE_PERCENT[plan]) / 100);
}

/** What the seller earns from an order's items once Vossie's fee is taken. */
export function earnCents(subtotalCents: number, plan: SellerPlan = "free"): number {
  return subtotalCents - platformFeeCents(subtotalCents, plan);
}

const MIN = 60_000;
const DAY = 86_400_000;

let counter = 0;
export function sellerId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

function hashDigits(seed: string, modulo: number, width: number): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % modulo;
  return String(hash).padStart(width, "0");
}

/** Six digits the buyer reads out when they collect an order. */
export function handoffCodeFor(seed: string): string {
  return hashDigits(seed, 1_000_000, 6);
}

/** Four digits the seller reads out to the courier at pickup. */
export function courierCodeFor(seed: string): string {
  return hashDigits(`courier-${seed}`, 10_000, 4);
}

/** "#VM-2041" from any run of digits. */
export function orderNumberFrom(digits: string): string {
  return `#VM-${digits.replace(/\D/g, "").slice(-4).padStart(4, "0")}`;
}

/** "Thabo Mokoena" becomes "Thabo M.". */
export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  if (!first) return "A student";
  const last = rest[rest.length - 1];
  return last && !last.endsWith(".") ? `${first} ${last[0]!.toUpperCase()}.` : name.trim();
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

function order(partial: Partial<SellerOrder> & Pick<SellerOrder, "id" | "number" | "buyerName" | "lines" | "status" | "placedAt">): SellerOrder {
  const subtotal = partial.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const delivery = partial.fulfilment === "delivery";
  return {
    buyerVerified: true,
    courierCode: courierCodeFor(partial.id),
    deliveryFeeCents: delivery ? 2500 : 0,
    feeCents: platformFeeCents(subtotal),
    fulfilment: "collection",
    fulfilmentLabel: delivery ? "Courier delivery" : "Campus collection",
    handoffCode: handoffCodeFor(partial.id),
    paymentLabel: "Paid in app",
    place: "Student Center",
    subtotalCents: subtotal,
    totalCents: subtotal + (delivery ? 2500 : 0),
    ...partial,
  };
}

/** The orders waiting for the seller, taken from the owner's designs, plus a few already in progress or finished. */
function ordersSeed(now: number): SellerOrder[] {
  const ago = (minutes: number) => new Date(now - minutes * MIN).toISOString();
  return [
    order({ buyerName: "Thabo Mokoena", fulfilment: "delivery", id: "so-2041", lines: [{ quantity: 1, title: "TI-30XS Calculator", unitPriceCents: 22000 }, { quantity: 1, title: "Calculator cover", unitPriceCents: 12000 }], number: "#VM-2041", place: "Eduvos Res Block B · Potchefstroom", placedAt: ago(12), status: "new" }),
    order({ buyerName: "Lerato Sithole", fulfilment: "delivery", id: "so-2040", lines: [{ quantity: 1, title: "Desk Lamp (white)", unitPriceCents: 12000 }], number: "#VM-2040", place: "Eduvos Res Block A · Potchefstroom", placedAt: ago(24), status: "new" }),
    order({ buyerName: "Sipho Ndlovu", by: "12:00", id: "so-2039", lines: [{ quantity: 1, title: "Casio Scientific Calculator", unitPriceCents: 15000 }], number: "#VM-2039", placedAt: ago(35), status: "new" }),
    order({ buyerName: "Naledi Sebola", fulfilment: "delivery", id: "so-2038", lines: [{ quantity: 1, title: "Economics 101 Textbook", unitPriceCents: 24000 }], number: "#VM-2038", place: "Eduvos Res Block C · Potchefstroom", placedAt: ago(50), status: "accepted" }),
    order({ buyerName: "Sipho Ndlovu", by: "11:15", id: "so-2036", lines: [{ quantity: 1, title: "Calculus Textbook", unitPriceCents: 34000 }], number: "#VM-2036", place: "Campus library", placedAt: ago(60), status: "preparing" }),
    order({ buyerName: "Kabelo Phiri", by: "10:45", id: "so-2035", lines: [{ quantity: 1, title: "Wireless Study Headphones", unitPriceCents: 32000 }], number: "#VM-2035", placedAt: ago(95), status: "ready" }),
    order({ buyerName: "Mpho Lekota", id: "so-2034", lines: [{ quantity: 1, title: "USB-C Hub (7-in-1)", unitPriceCents: 28000 }], number: "#VM-2034", placedAt: ago(26 * 60), status: "done" }),
    order({ buyerName: "Zanele Tshabalala", fulfilment: "delivery", id: "so-2033", lines: [{ quantity: 1, title: "Intro to Programming (Python)", unitPriceCents: 19500 }], number: "#VM-2033", place: "Eduvos Res Block D · Potchefstroom", placedAt: ago(28 * 60), status: "done" }),
    order({ buyerName: "Johan van Wyk", id: "so-2032", lines: [{ quantity: 1, title: "Desk Lamp (white)", unitPriceCents: 12000 }], number: "#VM-2032", placedAt: ago(30 * 60), status: "done" }),
    order({ buyerName: "Ayanda Mkhize", declineReason: "Sold out", id: "so-2031", lines: [{ quantity: 1, title: "Hoodie Teal (M)", unitPriceCents: 28000 }], number: "#VM-2031", placedAt: ago(52 * 60), status: "cancelled" }),
  ];
}

function listing(partial: Partial<SellerListing> & Pick<SellerListing, "id" | "title" | "priceCents" | "onHand" | "category">, at: string, n: number): SellerListing {
  return { description: "", photos: [], sku: `VM-0${230 + n}`, status: "published", unlimited: false, updatedAt: at, variants: [], ...partial };
}

function listingsSeed(now: number): SellerListing[] {
  const at = new Date(now - 3 * DAY).toISOString();
  return [
    listing({ artId: "casio-calculator", category: "electronics", description: "Barely used, comes with cover. Collect on campus.", id: "sl-ti30", onHand: 2, priceCents: 22000, title: "TI-30XS Calculator", variants: ["Black", "Blue"] }, at, 1),
    listing({ artId: "eng-maths", category: "books", description: "Latest edition, light highlighting, no torn pages.", id: "sl-calculus", onHand: 8, priceCents: 34000, title: "Calculus Textbook" }, at, 2),
    listing({ category: "electronics", description: "White LED desk lamp with a flexible arm.", id: "sl-lamp", onHand: 14, priceCents: 12000, title: "Desk Lamp (white)" }, at, 3),
    listing({ artId: "campus-hoodie", category: "fashion", description: "Teal hoodie, medium. Worn twice.", id: "sl-hoodie", onHand: 0, priceCents: 28000, status: "draft", title: "Hoodie Teal (M)", variants: ["M", "L"] }, at, 4),
    listing({ artId: "casio-calculator", category: "electronics", description: "Casio scientific calculator, works perfectly.", id: "sl-casio", onHand: 6, priceCents: 15000, title: "Casio Scientific Calculator" }, at, 5),
    listing({ artId: "textbook-econ", category: "books", description: "Economics 101, latest edition.", id: "sl-econ", onHand: 9, priceCents: 24000, title: "Economics 101 Textbook" }, at, 6),
    listing({ artId: "textbook-prog", category: "books", description: "Covers the full first-year module.", id: "sl-python", onHand: 7, priceCents: 19500, title: "Intro to Programming (Python)" }, at, 7),
    listing({ artId: "headphones", category: "electronics", description: "Over-ear wireless headphones.", id: "sl-headphones", onHand: 3, priceCents: 32000, title: "Wireless Study Headphones" }, at, 8),
    listing({ artId: "usb-hub", category: "electronics", description: "7-in-1 USB-C hub.", id: "sl-hub", onHand: 9, priceCents: 28000, status: "paused", title: "USB-C Hub (7-in-1)" }, at, 9),
  ];
}

const SALE_NAMES = ["TI-30XS Calculator", "Calculus Textbook", "Desk Lamp (white)", "Casio Scientific Calculator", "Economics 101 Textbook", "USB-C Hub (7-in-1)"];

/**
 * A fortnight of sales and one payout, built so the numbers match the designs: R1,245.00 earned in the last seven days,
 * 12% more than the seven before, and everything older already paid out. Each sale shows what the seller kept, and
 * the fee Vossie took.
 */
function ledgerSeed(now: number): LedgerEntry[] {
  const thisWeek = [11000, 15000, 22000, 19000, 26500, 19000, 12000];
  const lastWeek = [9000, 12000, 18000, 16000, 21100, 19000, 16000];
  const entries: LedgerEntry[] = [];
  let sale = 2000;
  const day = (offset: number, total: number, index: number) => {
    const first = Math.round((total * 0.45) / 100) * 100;
    [first, total - first].forEach((cents, part) => {
      const fee = Math.round((cents * PLATFORM_FEE_PERCENT) / (100 - PLATFORM_FEE_PERCENT));
      entries.push({
        amountCents: cents,
        createdAt: new Date(Math.min(now - offset * DAY - (part === 0 ? 5 : 2) * 60 * MIN, now - (part + 1) * 20 * MIN)).toISOString(),
        feeCents: fee,
        id: `led-${offset}-${part}`,
        kind: "sale",
        label: `Order ${orderNumberFrom(String(sale++))}`,
        note: `${SALE_NAMES[(index + part) % SALE_NAMES.length]} · fee R${Math.round(fee / 100)}`,
      });
    });
  };
  thisWeek.forEach((total, i) => day(6 - i, total, i));
  lastWeek.forEach((total, i) => day(13 - i, total, i + 2));
  entries.push({ amountCents: -lastWeek.reduce((a, b) => a + b, 0), createdAt: new Date(now - 1 * DAY - 3 * 60 * MIN).toISOString(), id: "led-payout-1", kind: "payout", label: "Payout to bank", note: "Paid" });
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function alertsSeed(now: number): SellerAlert[] {
  const ago = (minutes: number) => new Date(now - minutes * MIN).toISOString();
  return [
    { body: "Thabo Mokoena ordered TI-30XS Calculator and Calculator cover.", createdAt: ago(12), href: "/seller/orders/so-2041", id: "sa-1", kind: "order", read: false, title: "New order #VM-2041" },
    { body: "TI-30XS Calculator is down to 2.", createdAt: ago(120), href: "/seller/products/sl-ti30", id: "sa-2", kind: "stock", read: false, title: "Low stock" },
    { body: "Lerato M.: Is the calculator still available?", createdAt: ago(200), href: "/seller/home/messages", id: "sa-3", kind: "message", read: true, title: "New message" },
  ];
}

function reelsSeed(now: number): SellerReel[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    { caption: "TI-30XS unboxing, student price", createdAt: ago(21), id: "rl-ti30", likes: 392, listingId: "sl-ti30", orders: 14, salesCents: 308_000, saves: 88, status: "published", taps: 241, views: 4820 },
    { caption: "How I pack a textbook order", createdAt: ago(14), id: "rl-pack", likes: 161, listingId: "sl-calculus", orders: 5, salesCents: 170_000, saves: 40, status: "published", taps: 96, views: 2310 },
    { caption: "Desk glow-up for res", createdAt: ago(6), id: "rl-lamp", likes: 97, listingId: "sl-lamp", orders: 3, salesCents: 36_000, saves: 22, status: "published", taps: 51, views: 1280 },
    { caption: "Hoodie fit check", createdAt: ago(2), id: "rl-hoodie", likes: 0, listingId: "sl-hoodie", orders: 0, salesCents: 0, saves: 0, status: "draft", taps: 0, views: 0 },
  ];
}

function promotionsSeed(now: number): SellerPromotion[] {
  const day = (offset: number) => {
    const at = new Date(now + offset * DAY);
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
  };
  const offers: SellerPromotion[] = [
    { active: true, appliesTo: "store", code: "VOSSIE10", detail: "", endsAt: day(11), firstOrderOnly: true, id: "pr-first", kind: "percent", perStudent: 1, redemptions: 18, startsAt: day(-20), title: "First order 10% off", value: 10 },
    { active: true, appliesTo: "store", detail: "", id: "pr-free", kind: "free-delivery", minSpendCents: 15_000, perStudent: 5, redemptions: 6, startsAt: day(-10), title: "Free delivery over R150" },
    { active: false, appliesTo: "products", detail: "", id: "pr-exam", kind: "bundle", listingIds: ["sl-calculus", "sl-econ"], perStudent: 1, redemptions: 0, scheduled: true, startsAt: day(15), title: "Exam week bundle", value: 52_000 },
  ];
  return offers.map((item) => ({ ...item, detail: promotionDetail(item) }));
}

function reviewsSeed(now: number): SellerReview[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    { author: "Lerato S.", createdAt: ago(2), id: "rv-1", rating: 5, text: "Fast response and the calculator was exactly as described. Easy campus collection." },
    { author: "Sipho N.", createdAt: ago(7), id: "rv-2", rating: 4, text: "Good condition. Courier was a bit late but seller kept me updated." },
  ];
}

function casesSeed(now: number): SellerCase[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    { amountCents: 28000, createdAt: ago(1), id: "cs-2012", kind: "return", orderNumber: "#VM-2012", photos: 0, reason: "Item does not fit. Buyer requests a refund of R 280.", status: "open", title: "Hoodie Teal (M)" },
    { amountCents: 12000, createdAt: ago(2), id: "cs-1998", kind: "dispute", orderNumber: "#VM-1998", photos: 2, reason: "Buyer reports damaged goods on delivery and attached photos.", status: "open", title: "Desk Lamp" },
  ];
}

function ticketsSeed(now: number): SupportTicket[] {
  const ago = (days: number) => new Date(now - days * DAY).toISOString();
  return [
    {
      attachments: [],
      bestTime: "anytime",
      contact: "chat",
      createdAt: ago(5),
      details: "My payout of R1 111.00 was requested on Friday and I want to know when it will arrive.",
      id: "tk-1",
      messages: [
        { at: ago(5), body: "My payout of R1 111.00 was requested on Friday and I want to know when it will arrive.", from: "you", id: "tm-a" },
        { at: ago(4.9), body: "Hi, payouts take one to three working days. Yours was paid on Monday. It should show in your bank today.", from: "support", id: "tm-b" },
      ],
      orderNumber: undefined,
      ref: "VS-1031",
      status: "resolved",
      subject: "When will my payout arrive?",
      topic: "payout",
      urgency: "normal",
    },
  ];
}

function teamSeed(): TeamMember[] {
  return [
    { email: "eduv230953@vossie.net", id: "tm-1", name: "Vumisa Malindi", role: "owner" },
    { email: "thabo@vossie.net", id: "tm-2", name: "Thabo Nkosi", role: "packer" },
  ];
}

/** Every kind of alert on for push, email only for money, and quiet hours off. */
export function defaultNotify(): NotifyPrefs {
  const channels = Object.fromEntries(NOTIFY_KINDS.map((kind) => [kind, { email: kind === "money" || kind === "orders", push: true }])) as NotifyPrefs["channels"];
  return { channels, quiet: { from: "22:00", on: false, to: "06:30" }, sound: true };
}

/** Auto-accept off, and when it is switched on it only works while open and for orders that are in stock. */
export function defaultAutoAccept(): AutoAccept {
  return { maxOrderCents: null, needStock: true, on: false, onlyWhenOpen: true };
}

/** A seller with nothing in it: what the live backend starts from, and the state of someone who has not started. */
export function emptySellerState(): SellerState {
  return {
    alerts: [],
    cases: [],
    documents: [],
    ledger: [],
    listings: [],
    orders: [],
    profile: { closes: "17:00", days: ["mon", "tue", "wed", "thu", "fri"], description: "", kind: null, location: "", opens: "08:00", phone: "", storeId: "", storeName: "" },
    promotions: [],
    notify: defaultNotify(),
    reels: [],
    tickets: [],
    reviewCounts: [0, 0, 0, 0, 0],
    reviews: [],
    schedule: scheduleFromProfile({ closes: "17:00", days: ["mon", "tue", "wed", "thu", "fri"], opens: "08:00" }),
    settings: { autoAccept: defaultAutoAccept(), orderNotifications: true },
    goals: { weeklyRevenueCents: null },
    setupDone: false,
    status: "none",
    step: 1,
    team: [],
  };
}

export function createSellerState(now: number = Date.now()): SellerState {
  return {
    alerts: alertsSeed(now),
    cases: casesSeed(now),
    documents: [],
    ledger: ledgerSeed(now),
    listings: listingsSeed(now),
    orders: ordersSeed(now),
    profile: { closes: "17:00", days: ["mon", "tue", "wed", "thu", "fri"], description: "", kind: null, location: "", opens: "08:00", phone: "", storeId: DEMO_STORE_ID, storeName: "" },
    promotions: promotionsSeed(now),
    notify: defaultNotify(),
    reels: reelsSeed(now),
    tickets: ticketsSeed(now),
    reviewCounts: [108, 12, 3, 1, 2],
    reviews: reviewsSeed(now),
    schedule: scheduleFromProfile({ closes: "17:00", days: ["mon", "tue", "wed", "thu", "fri"], opens: "08:00" }),
    settings: { autoAccept: defaultAutoAccept(), orderNotifications: true },
    goals: { weeklyRevenueCents: 200_000 },
    setupDone: false,
    status: "none",
    step: 1,
    team: teamSeed(),
  };
}

/** Documents for a seller kind: the student card is accepted straight away when the Eduvos record matches. */
export function documentsFor(kind: SellerKind | null, verifiedStudent: boolean, now: number = Date.now()): SellerDocument[] {
  return docKindsFor(kind).map((docKind) =>
    docKind === "student-card" && verifiedStudent
      ? { fileName: "Eduvos record", kind: docKind, status: "verified", uploadedAt: new Date(now).toISOString(), verifiedAt: new Date(now).toISOString() }
      : { kind: docKind, status: "required" },
  );
}

export function sellerBalanceCents(state: Pick<SellerState, "ledger">): number {
  return state.ledger.reduce((sum, entry) => sum + entry.amountCents, 0);
}

/** The average rating from the counts of each star. */
export function averageRating(counts: SellerState["reviewCounts"]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return counts.reduce((sum, count, i) => sum + count * (5 - i), 0) / total;
}

/** Sales in the last seven days, for the weekly goal. */
function weekSalesCents(ledger: LedgerEntry[], now: number): number {
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - 6 * 86_400_000;
  return ledger.filter((entry) => entry.kind === "sale" && new Date(entry.createdAt).getTime() >= start).reduce((sum, entry) => sum + entry.amountCents, 0);
}

const rank: Record<SellerOrder["status"], number> = { accepted: 1, cancelled: -1, declined: -1, done: 4, new: 0, preparing: 2, ready: 3 };

function itemsLabel(order: Pick<SellerOrder, "lines">): string {
  return order.lines.map((line) => `${line.title}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join(", ");
}

/** The seller side of every seller action. Changes to the buyer's own order, alerts and notifications are made by `bridge.ts`. */
export function sellerReduce(state: SellerState, action: SellerAction, ctx: { verifiedStudent: boolean; now?: number; plan?: SellerPlan } = { verifiedStudent: true }): SellerState {
  const now = ctx.now ?? Date.now();
  const plan = ctx.plan ?? "free";
  const stamp = new Date(now).toISOString();
  const patchOrder = (id: string, patch: Partial<SellerOrder>) => state.orders.map((item) => (item.id === id ? { ...item, ...patch } : item));
  const addAlert = (alert: Omit<SellerAlert, "createdAt" | "id" | "read">): SellerAlert[] => [{ ...alert, createdAt: stamp, id: sellerId("sa"), read: false }, ...state.alerts];
  const credit = (found: SellerOrder): LedgerEntry => ({
    amountCents: found.subtotalCents - found.feeCents,
    createdAt: stamp,
    feeCents: found.feeCents,
    id: sellerId("led"),
    kind: "sale",
    label: `Order ${found.number}`,
    note: `Sale · fee R${Math.round(found.feeCents / 100)}`,
    sellerOrderId: found.id,
  });

  /** After money arrives: if it took the week past the target for the first time this week, say so once. */
  const withGoal = (next: SellerState): SellerState => {
    const target = next.goals.weeklyRevenueCents;
    const week = weekKey(new Date(now));
    if (!target || next.goalReachedWeek === week) return next;
    if (weekSalesCents(state.ledger, now) >= target || weekSalesCents(next.ledger, now) < target) return next;
    return { ...next, alerts: [{ body: `You have sold R${Math.round(target / 100)} this week, the target you set. Well done.`, createdAt: stamp, href: "/seller/account/goals", id: sellerId("sa"), kind: "money", read: false, title: "Weekly goal reached" }, ...next.alerts], goalReachedWeek: week };
  };

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
        documents: state.documents.map((doc) => (doc.kind === action.kind && doc.status !== "verified" ? { ...doc, fileKind: action.fileKind, fileName: action.fileName, status: "uploaded", uploadedAt: stamp, uri: action.uri } : doc)),
      };
    case "sellerReplaceDocument":
      // only a document that was verified can be sent again this way; the store keeps trading while it is checked
      if (!state.documents.some((doc) => doc.kind === action.kind && doc.status === "verified")) return state;
      return {
        ...state,
        documents: state.documents.map((doc) => (doc.kind === action.kind && doc.status === "verified" ? { fileKind: action.fileKind, fileName: action.fileName, kind: doc.kind, status: "in-review" as const, uploadedAt: stamp, uri: action.uri } : doc)),
      };
    case "sellerRemoveDocument":
      // a file can be taken back until the documents are sent in
      if (state.status === "pending" || state.status === "approved") return state;
      return { ...state, documents: state.documents.map((doc) => (doc.kind === action.kind && doc.status === "uploaded" ? { kind: doc.kind, status: "required" as const } : doc)) };
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
      const documents = state.documents.map((doc) => (doc.kind === next.kind ? { ...doc, status: "verified" as const, verifiedAt: stamp } : doc));
      const allVerified = documents.every((doc) => doc.status === "verified");
      const wasApproved = state.status === "approved";
      return {
        ...state,
        alerts: allVerified
          ? addAlert(wasApproved ? { body: `Your ${docTitles[next.kind].toLowerCase()} was checked and is up to date.`, href: "/seller/account/documents", kind: "account", title: "Document verified" } : { body: "You can start listing and taking orders.", href: "/seller/home", kind: "account", title: "You are an approved seller" })
          : state.alerts,
        approvedAt: allVerified && !wasApproved ? stamp : state.approvedAt,
        documents,
        status: allVerified ? "approved" : state.status,
      };
    }
    case "sellerSaveStore": {
      const profile = { ...state.profile, ...action.patch };
      // the setup hours become the schedule until the seller refines it
      const schedule = state.schedule.preset === "custom" && !state.setupDone ? scheduleFromProfile(profile) : state.schedule;
      return { ...state, profile, schedule };
    }
    case "sellerSetSchedule": {
      const range = summaryRange(action.schedule);
      return { ...state, profile: { ...state.profile, ...range }, schedule: action.schedule };
    }
    case "sellerSetNotify":
      return { ...state, notify: action.notify };
    case "sellerSaveReel": {
      const exists = state.reels.some((item) => item.id === action.reel.id);
      const going = action.reel.status === "published" && !state.reels.some((item) => item.id === action.reel.id && item.status === "published");
      const live = state.reels.filter((item) => item.status === "published").length;
      // a plan holds only so many live reels; reels already live stay live
      if (going && live >= LIMITS[plan].liveReels) return state;
      return { ...state, reels: exists ? state.reels.map((item) => (item.id === action.reel.id ? { ...item, ...action.reel, createdAt: item.createdAt } : item)) : [{ ...action.reel, createdAt: stamp }, ...state.reels] };
    }
    case "sellerSetReelStatus": {
      const found = state.reels.find((item) => item.id === action.id);
      if (!found || found.status === action.status) return state;
      const live = state.reels.filter((item) => item.status === "published").length;
      if (action.status === "published" && live >= LIMITS[plan].liveReels) return state;
      return { ...state, reels: state.reels.map((item) => (item.id === action.id ? { ...item, status: action.status } : item)) };
    }
    case "sellerDeleteReel":
      return { ...state, reels: state.reels.filter((item) => item.id !== action.id) };
    case "sellerReelTick":
      return {
        ...state,
        reels: state.reels.map((item) => {
          if (item.status !== "published") return item;
          const seed = [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) + action.n;
          return { ...item, likes: item.likes + (seed % 3 === 0 ? 1 : 0), saves: item.saves + (seed % 7 === 0 ? 1 : 0), taps: item.taps + (seed % 4 === 0 ? 1 : 0), views: item.views + 2 + (seed % 5) };
        }),
      };
    case "sellerPing": {
      const sample = SAMPLE_PUSH[action.kind];
      return { ...state, alerts: addAlert({ body: sample.body, href: sample.href, kind: sample.kind, title: sample.title }) };
    }
    case "sellerMarkAlertRead":
      return { ...state, alerts: state.alerts.map((item) => (item.id === action.id ? { ...item, read: true } : item)) };
    case "sellerFinishSetup":
      return { ...state, setupDone: true };
    case "sellerReceiveOrder": {
      if (state.orders.some((item) => item.id === action.order.id)) return state;
      // an order that arrives while the store is shut waits in the queue, and the seller is told when it was
      const closed = state.schedule.autoPause && !storeStatus(state.schedule, new Date(now)).open;
      // the fee is the one for the plan the seller is on when the order arrives
      const priced = { ...action.order, feeCents: platformFeeCents(action.order.subtotalCents, plan) };
      const rule = state.settings.autoAccept;
      const inStock = priced.lines.every((line) => {
        const found = state.listings.find((listing) => listing.title === line.title);
        return !found || found.unlimited || found.onHand >= line.quantity;
      });
      const auto = plan !== "free" && LIMITS[plan].tools.autoAccept && rule.on && !closed && (!rule.onlyWhenOpen || storeStatus(state.schedule, new Date(now)).open) && (rule.maxOrderCents === null || priced.subtotalCents <= rule.maxOrderCents) && (!rule.needStock || inStock);
      const order = closed ? { ...priced, queued: true } : auto ? { ...priced, status: "accepted" as const } : priced;
      return {
        ...state,
        alerts: addAlert(
          auto
            ? { body: `${order.buyerName} ordered ${itemsLabel(order)}. It was accepted by your auto-accept rule.`, href: `/seller/orders/${order.id}`, kind: "order", title: `Order ${order.number} accepted` }
            : { body: closed ? `${order.buyerName} ordered ${itemsLabel(order)} while you were closed. It is waiting for you.` : `${order.buyerName} ordered ${itemsLabel(order)}.`, href: `/seller/orders/${order.id}`, kind: "order", title: `New order ${order.number}` },
        ),
        orders: [order, ...state.orders],
      };
    }
    case "sellerReelEvent":
      return { ...state, reels: state.reels.map((item) => (item.id === action.id ? { ...item, likes: Math.max(0, item.likes + action.likes) } : item)) };
    case "sellerReceiveReview": {
      if (state.reviews.some((item) => item.id === action.review.id)) return state;
      const counts = [...state.reviewCounts] as SellerState["reviewCounts"];
      counts[5 - action.review.rating]! += 1;
      return {
        ...state,
        alerts: addAlert({ body: `${action.review.author} left ${action.review.rating} ${action.review.rating === 1 ? "star" : "stars"}${action.review.text ? `: ${action.review.text}` : "."}`, href: "/seller/account/reviews", kind: "review", title: "New review" }),
        reviewCounts: counts,
        reviews: [action.review, ...state.reviews],
      };
    }
    case "sellerReceiveCase": {
      if (state.cases.some((item) => item.id === action.case.id)) return state;
      return {
        ...state,
        alerts: addAlert({ body: `${action.case.orderNumber} · ${action.case.title}: ${action.case.reason}`, href: "/seller/account/cases", kind: "money", title: action.case.kind === "return" ? "Return requested" : "A buyer reported a problem" }),
        cases: [action.case, ...state.cases],
      };
    }
    case "sellerNote":
      return { ...state, alerts: addAlert({ body: action.body, href: action.href, kind: action.kind, title: action.title }) };
    case "sellerApprovalSeen":
      return state.approvalSeen ? state : { ...state, approvalSeen: true };
    case "sellerSetAutoAccept":
      return { ...state, settings: { ...state.settings, autoAccept: action.rule } };
    case "sellerBulkAccept": {
      // accept every order that is waiting; a paid-plan tool
      if (plan === "free" || !LIMITS[plan].tools.bulkAccept) return state;
      const waiting = state.orders.filter((item) => item.status === "new");
      if (waiting.length === 0) return state;
      return { ...state, orders: state.orders.map((item) => (item.status === "new" ? { ...item, status: "accepted" as const } : item)) };
    }
    case "sellerCloseEarly":
      return { ...state, schedule: { ...state.schedule, closeEarly: action.at ? { at: action.at, date: action.date } : undefined } };
    case "sellerSetGoal":
      return { ...state, goalReachedWeek: undefined, goals: { weeklyRevenueCents: action.weeklyRevenueCents && action.weeklyRevenueCents > 0 ? action.weeklyRevenueCents : null } };
    case "sellerWeeklySummary": {
      if (state.lastSummaryWeek === action.weekKey || !state.notify.channels.summary.push) return state.lastSummaryWeek === action.weekKey ? state : { ...state, lastSummaryWeek: action.weekKey };
      const from = new Date(now);
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() - 6 * 86_400_000;
      const revenue = weekSalesCents(state.ledger, now);
      const before = state.ledger.filter((entry) => entry.kind === "sale" && new Date(entry.createdAt).getTime() >= start - 7 * 86_400_000 && new Date(entry.createdAt).getTime() < start).reduce((sum, entry) => sum + entry.amountCents, 0);
      const orders = state.orders.filter((item) => item.status !== "declined" && item.status !== "cancelled" && new Date(item.placedAt).getTime() >= start).length;
      const change = before > 0 ? Math.round(((revenue - before) / before) * 100) : null;
      return {
        ...state,
        alerts: addAlert({ body: `R${String(Math.round(revenue / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} from ${orders} ${orders === 1 ? "order" : "orders"}${change === null ? "" : `, ${Math.abs(change)}% ${change >= 0 ? "up on" : "down on"} the week before`}. Your statement is ready.`, href: "/seller/payouts/statements", kind: "summary", title: "Your week" }),
        lastSummaryWeek: action.weekKey,
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
    case "sellerSetParcel":
      return { ...state, orders: patchOrder(action.id, { ...(action.size ? { parcelSize: action.size } : {}), ...(action.note !== undefined ? { courierNote: action.note } : {}) }) };
    case "sellerAssignCourier": {
      // demo only: a courier takes the delivery job a few seconds after the order is ready
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || current.fulfilment !== "delivery" || current.status !== "ready" || current.courier) return state;
      return {
        ...state,
        alerts: addAlert({ body: `Tebogo K. is coming for ${current.number}. Read out the handover code when they arrive.`, href: `/seller/orders/${current.id}`, kind: "order", title: "A courier is on the way" }),
        orders: patchOrder(action.id, { courier: { arrivesInMin: 4, name: "Tebogo K.", rating: 4.9, vehicle: "Bicycle" } }),
      };
    }
    case "sellerHandToCourier": {
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || current.status !== "ready" || !current.courier) return state;
      return withGoal({
        ...state,
        alerts: addAlert({ body: `${current.number} is with ${current.courier.name}. ${((current.subtotalCents - current.feeCents) / 100).toFixed(2)} was added to your earnings.`, href: "/seller/payouts", kind: "money", title: "Handed to the courier" }),
        ledger: [credit(current), ...state.ledger],
        orders: patchOrder(action.id, { status: "done" }),
      });
    }
    case "sellerCompleteOrder": {
      const current = state.orders.find((item) => item.id === action.id);
      if (!current || current.status === "done" || current.status === "declined" || current.status === "cancelled") return state;
      return withGoal({
        ...state,
        alerts: addAlert({ body: `${current.number} was handed over. ${itemsLabel(current)} has been paid to you.`, href: "/seller/payouts", kind: "money", title: "Order complete" }),
        ledger: [credit(current), ...state.ledger],
        orders: patchOrder(action.id, { status: "done" }),
      });
    }
    case "sellerSaveListing": {
      const exists = state.listings.some((item) => item.id === action.listing.id);
      const saved = { ...action.listing, updatedAt: stamp };
      return { ...state, listings: exists ? state.listings.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...state.listings] };
    }
    case "sellerPauseListing":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, status: action.paused ? "paused" : "published", updatedAt: stamp } : item)) };
    case "sellerRestock":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, onHand: item.onHand + Math.max(0, action.quantity), updatedAt: stamp } : item)) };
    case "sellerAdjustStock":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, onHand: Math.max(0, item.onHand + action.delta), updatedAt: stamp } : item)) };
    case "sellerArchiveListing":
      return { ...state, listings: state.listings.map((item) => (item.id === action.id ? { ...item, status: action.archived ? "archived" : "draft", updatedAt: stamp } : item)) };
    case "sellerDeleteListing":
      return { ...state, listings: state.listings.filter((item) => item.id !== action.id) };
    case "sellerSaveBank":
      return { ...state, profile: { ...state.profile, bank: action.bank } };
    case "sellerWithdraw": {
      if (action.amountCents < MIN_WITHDRAW_CENTS || action.amountCents > sellerBalanceCents(state) || !state.profile.bank) return state;
      return {
        ...state,
        alerts: addAlert({ body: `R${(action.amountCents / 100).toFixed(2)} is on its way to ${state.profile.bank.bankName}.`, href: "/seller/payouts", kind: "money", title: "Payout requested" }),
        ledger: [{ amountCents: -action.amountCents, createdAt: stamp, id: sellerId("led"), kind: "payout", label: "Payout to bank", note: "Requested" }, ...state.ledger],
      };
    }
    case "sellerCreatePromotion":
      return { ...state, promotions: [action.promotion, ...state.promotions] };
    case "sellerUpdatePromotion":
      return { ...state, promotions: state.promotions.map((item) => (item.id === action.promotion.id ? { ...item, ...action.promotion } : item)) };
    case "sellerDeletePromotion":
      return { ...state, promotions: state.promotions.filter((item) => item.id !== action.id) };
    case "sellerCreateTicket": {
      const number = 1032 + state.tickets.length;
      const ticket = { ...action.ticket, createdAt: stamp, ref: `VS-${number}`, status: "open" as const };
      return {
        ...state,
        alerts: addAlert({ body: `We have your request about ${ticket.subject}. Reference ${ticket.ref}.`, href: `/seller/account/support/${ticket.id}`, kind: "account", title: "Support request sent" }),
        tickets: [ticket, ...state.tickets],
      };
    }
    case "sellerReplyTicket": {
      const body = action.body.trim();
      const open = state.tickets.find((item) => item.id === action.id && item.status !== "resolved");
      if (!body || !open) return state;
      return { ...state, tickets: state.tickets.map((item) => (item.id === action.id ? { ...item, messages: [...item.messages, { at: stamp, body, from: "you" as const, id: sellerId("tm") }] } : item)) };
    }
    case "sellerResolveTicket":
      return { ...state, tickets: state.tickets.map((item) => (item.id === action.id ? { ...item, status: "resolved" as const } : item)) };
    case "sellerSupportReply": {
      const found = state.tickets.find((item) => item.id === action.id);
      if (!found || found.status !== "open") return state;
      const how = found.contact === "phone" ? `We will call you ${found.bestTime === "anytime" ? "today" : `this ${found.bestTime}`}.` : found.contact === "email" ? "We will also email you." : "We will keep talking here.";
      const body = found.urgency === "urgent" ? `Thanks, this is marked urgent so a person is looking at it now. ${how}` : `Thanks, we have your request and a person is looking at it. ${how}`;
      return {
        ...state,
        alerts: addAlert({ body: `Support replied about ${found.subject}.`, href: `/seller/account/support/${found.id}`, kind: "account", title: "Support replied" }),
        tickets: state.tickets.map((item) => (item.id === found.id ? { ...item, messages: [...item.messages, { at: stamp, body, from: "support" as const, id: sellerId("tm") }], status: "in-progress" as const } : item)),
      };
    }
    case "sellerTogglePromotion":
      return { ...state, promotions: state.promotions.map((item) => (item.id === action.id ? { ...item, active: action.active, scheduled: action.active ? false : item.scheduled } : item)) };
    case "sellerReplyReview":
      return { ...state, reviews: state.reviews.map((item) => (item.id === action.id ? { ...item, reply: action.text.trim() } : item)) };
    case "sellerResolveCase": {
      const found = state.cases.find((item) => item.id === action.id);
      if (!found || found.status !== "open") return state;
      if (action.decision === "respond") {
        return { ...state, cases: state.cases.map((item) => (item.id === found.id ? { ...item, resolution: action.text?.trim() || "You replied. Waiting for Vossie support." } : item)) };
      }
      const approved = action.decision === "approve";
      return {
        ...state,
        alerts: addAlert({ body: `${found.orderNumber} · ${found.title}: ${approved ? "refund approved" : "return declined"}.`, href: "/seller/account/cases", kind: "money", title: approved ? "Refund approved" : "Return declined" }),
        cases: state.cases.map((item) => (item.id === found.id ? { ...item, resolution: approved ? "Refund approved" : action.text?.trim() || "Declined", status: "resolved" } : item)),
        ledger: approved ? [{ amountCents: -found.amountCents, createdAt: stamp, id: sellerId("led"), kind: "refund", label: `Refund ${found.orderNumber}`, note: found.title }, ...state.ledger] : state.ledger,
      };
    }
    case "sellerInviteTeam": {
      const email = action.email.trim().toLowerCase();
      if (!email || state.team.some((item) => item.email === email)) return state;
      return { ...state, team: [...state.team, { email, id: sellerId("tm"), name: action.name.trim() || email, role: "packer" }] };
    }
    case "sellerRemoveTeam":
      return { ...state, team: state.team.filter((item) => item.id !== action.id || item.role === "owner") };
    case "sellerSetSetting":
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case "sellerMarkAlertsRead":
      return { ...state, alerts: state.alerts.map((item) => ({ ...item, read: true })) };
    case "sellerHydrate": {
      const patch = action.patch;
      const orders = patch.orders ?? state.orders;
      // a new order the seller has not been told about yet becomes an alert
      const known = new Set(state.alerts.map((item) => item.id));
      const fresh: SellerAlert[] = orders
        .filter((item) => item.status === "new" && !known.has(`sa-${item.id}`))
        .map((item) => ({ body: `${item.buyerName} ordered ${itemsLabel(item)}.`, createdAt: item.placedAt, href: `/seller/orders/${item.id}`, id: `sa-${item.id}`, kind: "order" as const, read: false, title: `New order ${item.number}` }));
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
  { buyer: "Zinhle Mahlangu", by: "12:30", line: { quantity: 1, title: "Casio Scientific Calculator", unitPriceCents: 15000 } },
  { buyer: "Pieter van Zyl", delivery: "Eduvos Res Block C · Potchefstroom", line: { quantity: 1, title: "Desk Lamp (white)", unitPriceCents: 12000 } },
  { buyer: "Amanda Khumalo", by: "13:00", line: { quantity: 1, title: "Intro to Programming (Python)", unitPriceCents: 19500 } },
];

/** Demo only: the n-th order that arrives from a student while the seller is using the app, so the arrival can be seen. */
export function demoIncomingOrder(now: number, n: number): SellerOrder {
  const pick = ARRIVALS[n % ARRIVALS.length]!;
  const id = `so-demo-${n}-${now.toString(36)}`;
  return order({
    buyerName: pick.buyer,
    by: pick.by,
    fulfilment: pick.delivery ? "delivery" : "collection",
    id,
    lines: [pick.line],
    number: orderNumberFrom(String(2042 + n)),
    place: pick.delivery ?? "Student Center",
    placedAt: new Date(now).toISOString(),
    status: "new",
  });
}

/** Whether what a camera read from a courier's QR is this order's four digit code. The QR holds the digits, or "vossie-courier:" and the digits. */
export function scanMatchesCourierCode(scanned: string, code: string): boolean {
  const digits = scanned.trim().replace(/^vossie-courier:/i, "");
  return code.length > 0 && digits === code;
}
