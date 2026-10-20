import type { SellerOrderRow } from "@/services/types";
import { createInitialState, demoReducer } from "@/state/demoReducer";

import { buildLedger, mapDocuments, mapListing, mapListingStatus, mapOrderStatus, mapSellerOrder, mapSellerStatus } from "./live";
import { emptySellerState, sellerBalanceCents } from "./state";
import type { SellerOrder } from "./types";

const row = (over: Partial<SellerOrderRow> = {}): SellerOrderRow => ({
  accept_by: null,
  buyer_id: "buyer-1",
  created_at: "2026-10-20T10:00:00Z",
  delivery_fee_cents: 0,
  discount_cents: 0,
  fulfilment: "campus_handoff",
  has_goods: true,
  id: "so-1",
  issue_window_ends_at: null,
  number: "#2605012",
  order_id: "o-1",
  order_items: [{ id: "i1", line_total_cents: 12000, listing_id: "l1", option_label: "Large", quantity: 2, title: "Burger & Chips", type: "goods", unit_price_cents: 6000 }],
  refunded_cents: 0,
  seller_id: "s-1",
  seller_user_id: "u-1",
  status: "awaiting_seller",
  subtotal_cents: 12000,
  total_cents: 12000,
  ...over,
});

describe("reading the database as the screens expect", () => {
  it("maps seller status: draft and rejected are still setup, active is approved", () => {
    expect(mapSellerStatus(undefined)).toBe("none");
    expect(mapSellerStatus("draft")).toBe("setup");
    expect(mapSellerStatus("rejected")).toBe("setup");
    expect(mapSellerStatus("pending_review")).toBe("pending");
    expect(mapSellerStatus("suspended")).toBe("pending");
    expect(mapSellerStatus("active")).toBe("approved");
  });

  it("maps order status, and leaves out orders still waiting for payment", () => {
    expect(mapOrderStatus("awaiting_payment")).toBeNull();
    expect(mapOrderStatus("awaiting_seller")).toBe("new");
    expect(mapOrderStatus("accepted")).toBe("accepted");
    expect(mapOrderStatus("preparing")).toBe("preparing");
    expect(mapOrderStatus("ready")).toBe("ready");
    for (const finished of ["in_fulfilment", "delivered", "issue_window", "completed"] as const) expect(mapOrderStatus(finished)).toBe("done");
    expect(mapOrderStatus("rejected")).toBe("declined");
    for (const stopped of ["timed_out", "cancelled", "disputed", "refunded"] as const) expect(mapOrderStatus(stopped)).toBe("cancelled");
  });

  it("builds a seller order with the buyer's name, the lines and no handoff code", () => {
    const order = mapSellerOrder(row(), { "buyer-1": "Thabo N." }, "Student Center")!;
    expect(order).toMatchObject({ buyerName: "Thabo N.", fulfilment: "collection", fulfilmentLabel: "Campus collection", handoffCode: "", number: "#5012", place: "Student Center", status: "new", totalCents: 12000 });
    expect(order.lines).toEqual([{ optionLabel: "Large", quantity: 2, title: "Burger & Chips", unitPriceCents: 6000 }]);
    expect(mapSellerOrder(row({ status: "awaiting_payment" }), {}, "")).toBeNull();
    expect(mapSellerOrder(row({ fulfilment: "vossie_delivery" }), {}, "")!.fulfilment).toBe("delivery");
  });

  it("maps listings with their price and stock from the first option", () => {
    const listing = mapListing({ category_id: "food", description: "Tasty", id: "l1", listing_options: [{ id: "opt1", label: "Standard", on_hand: 3, price_cents: 6000, unlimited: false }], status: "published", title: "Burger", type: "goods", updated_at: "2026-10-19T00:00:00Z" });
    expect(listing).toMatchObject({ onHand: 3, optionId: "opt1", priceCents: 6000, status: "published", unlimited: false });
    expect(mapListingStatus("sold_out")).toBe("paused");
    expect(mapListingStatus("flagged")).toBe("under-review");
    expect(mapListingStatus("draft")).toBe("draft");
  });

  it("maps documents for the seller kind, with missing ones marked required", () => {
    const docs = mapDocuments([{ file_name: "id.jpg", kind: "id", note: null, status: "in_review", updated_at: "2026-10-20T10:00:00Z" }], "student");
    expect(docs.map((doc) => [doc.kind, doc.status])).toEqual([["student-card", "required"], ["id", "in-review"], ["address", "required"]]);
    expect(mapDocuments([], "registered").map((doc) => doc.kind)).toEqual(["student-card", "id", "address", "cipc"]);
  });

  it("builds an earnings list that adds up to the balance the server reports", () => {
    const orders = [row({ id: "a", number: "#1001", status: "completed", subtotal_cents: 6000 }), row({ id: "b", number: "#1002", status: "delivered", subtotal_cents: 3500 }), row({ id: "c", number: "#1003", status: "awaiting_seller" })];
    const ledger = buildLedger(orders, [{ amount_cents: 2000, created_at: "2026-10-19T10:00:00Z", id: "p1" }], 9000, Date.parse("2026-10-20T12:00:00Z"));
    expect(sellerBalanceCents({ ledger })).toBe(9000);
    expect(ledger.find((entry) => entry.kind === "payout")?.amountCents).toBe(-2000);
    expect(ledger.some((entry) => entry.id === "led-earlier")).toBe(true);
  });

  it("needs no earlier line when the sales and payouts already explain the balance", () => {
    const ledger = buildLedger([row({ status: "completed", subtotal_cents: 6000 })], [], 6000);
    expect(ledger).toHaveLength(1);
  });
});

describe("hydrating the seller screens from the database", () => {
  const signedIn = () => demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
  const incoming = (id: string): SellerOrder => ({ ...mapSellerOrder(row({ id }), { "buyer-1": "Thabo N." }, "Student Center")! });

  it("replaces the orders and turns a new order into an alert, once", () => {
    let state = signedIn();
    state = demoReducer(state, { patch: { ...emptySellerState(), orders: [incoming("so-9")], status: "approved" }, type: "sellerHydrate" });
    expect(state.seller.orders.map((item) => item.id)).toEqual(["so-9"]);
    expect(state.seller.alerts[0]).toMatchObject({ id: "sa-so-9", kind: "order", read: false });
    const again = demoReducer(state, { patch: { orders: [incoming("so-9")] }, type: "sellerHydrate" });
    expect(again.seller.alerts.filter((item) => item.id === "sa-so-9")).toHaveLength(1);
  });

  it("keeps the saved bank, the wizard step and a finished setup", () => {
    let state = signedIn();
    state = demoReducer(state, { bank: { accountHolder: "V", bankName: "Capitec", last4: "1234" }, type: "sellerSaveBank" });
    state = demoReducer(state, { step: 3, type: "sellerGoToStep" });
    state = demoReducer(state, { patch: { profile: { ...emptySellerState().profile, location: "Res Block B", storeName: "CampusBites" }, status: "pending" }, type: "sellerHydrate" });
    expect(state.seller.profile.bank?.last4).toBe("1234");
    expect(state.seller.step).toBe(3);
    expect(state.seller.setupDone).toBe(true);
  });
});
