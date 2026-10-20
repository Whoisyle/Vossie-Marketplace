import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { activeListings, attentionItems, isLowStock, orderCounts, ordersInGroup, weekBars, weekTotals } from "./selectors";
import { createSellerState, docKindsFor, sellerBalanceCents, sellerReduce } from "./state";

const NOW = new Date(2026, 9, 20, 12, 0, 0).getTime();

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

/** A seller who has finished setup and been approved. */
function approved(): DemoState {
  let state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }, { phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" });
  state = run(
    state,
    { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" },
    { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" },
    { type: "sellerSubmitVerification" },
    { type: "sellerReviewTick" },
    { type: "sellerReviewTick" },
  );
  return state;
}

describe("seller demo data", () => {
  const seller = createSellerState(NOW);

  it("matches the numbers in the designs", () => {
    expect(orderCounts(seller.orders).new).toBe(3);
    expect(weekTotals(seller, NOW).thisWeekCents).toBe(124_500);
    expect(weekTotals(seller, NOW).changePercent).toBe(12);
    expect(sellerBalanceCents(seller)).toBe(124_500);
    expect(weekBars(seller, NOW)).toHaveLength(7);
    expect(weekBars(seller, NOW)[6]).toMatchObject({ cents: 12_000, isToday: true });
  });

  it("lists active listings and flags the low stock ones", () => {
    expect(activeListings(seller.listings).length).toBe(7);
    expect(seller.listings.filter(isLowStock).map((item) => item.title)).toEqual(["Plain Coffee"]);
  });

  it("puts new orders first under Needs your attention, then stock, then messages", () => {
    const items = attentionItems(seller, [{ at: "2026-10-20T10:00:00Z", id: "c1", name: "Lerato M.", preview: "Is the burger still available?", unread: true }]);
    expect(items.map((item) => item.kind)).toEqual(["order", "order", "order", "stock", "message"]);
  });

  it("groups accepted orders under Preparing and declined ones under Cancelled", () => {
    expect(ordersInGroup(seller.orders, "preparing")).toHaveLength(2);
    expect(ordersInGroup(seller.orders, "cancelled")).toHaveLength(1);
  });
});

describe("becoming a seller", () => {
  it("asks a registered business for a CIPC document as well", () => {
    expect(docKindsFor("student")).toEqual(["student-card", "id", "address"]);
    expect(docKindsFor("registered")).toEqual(["student-card", "id", "address", "cipc"]);
  });

  it("accepts the student card at once when the Eduvos record matches", () => {
    const state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
    expect(state.seller.documents.map((doc) => [doc.kind, doc.status])).toEqual([["student-card", "verified"], ["id", "required"], ["address", "required"]]);
  });

  it("does not let documents be submitted until every one is given", () => {
    let state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }, { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" });
    state = run(state, { type: "sellerSubmitVerification" });
    expect(state.seller.status).toBe("setup");
  });

  it("moves documents to in review on submit, then verifies them one by one until approved", () => {
    let state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }, { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" }, { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" }, { type: "sellerSubmitVerification" });
    expect(state.seller.status).toBe("pending");
    expect(state.seller.documents.filter((doc) => doc.status === "in-review")).toHaveLength(2);
    state = run(state, { type: "sellerReviewTick" });
    expect(state.seller.status).toBe("pending");
    state = run(state, { type: "sellerReviewTick" });
    expect(state.seller.status).toBe("approved");
    expect(state.seller.alerts[0]?.title).toBe("You are an approved seller");
  });
});

describe("taking an order from a buyer in this app", () => {
  it("does not offer orders to a seller who is not approved yet", () => {
    const state = run(signedIn(), { listingId: "burger-chips", quantity: 1, type: "addToCart" }, { type: "placeOrder" });
    expect(state.seller.orders.some((item) => item.buyerOrderId)).toBe(false);
  });

  it("follows an order from the buyer to the seller and back: accept, prepare, ready, hand over", () => {
    let state = run(approved(), { listingId: "burger-chips", quantity: 2, type: "addToCart" }, { type: "placeOrder" });
    const incoming = state.seller.orders.find((item) => item.buyerOrderId);
    expect(incoming).toMatchObject({ status: "new", subtotalCents: expect.any(Number) });
    const buyerId = incoming!.buyerOrderId!;
    expect(state.orders.find((item) => item.id === buyerId)?.status).toBe("placed");

    state = run(state, { accept: true, id: incoming!.id, type: "sellerRespondOrder" });
    expect(state.orders.find((item) => item.id === buyerId)?.status).toBe("accepted");
    state = run(state, { id: incoming!.id, to: "preparing", type: "sellerAdvanceOrder" });
    expect(state.orders.find((item) => item.id === buyerId)?.status).toBe("preparing");
    state = run(state, { id: incoming!.id, to: "ready", type: "sellerAdvanceOrder" });
    expect(state.orders.find((item) => item.id === buyerId)?.status).toBe("ready");

    const before = sellerBalanceCents(state.seller);
    state = run(state, { id: incoming!.id, type: "sellerCompleteOrder" });
    expect(state.orders.find((item) => item.id === buyerId)?.status).toBe("delivered");
    expect(sellerBalanceCents(state.seller)).toBe(before + incoming!.subtotalCents);
  });

  it("cancels the buyer's order when the seller declines", () => {
    let state = run(approved(), { listingId: "burger-chips", quantity: 1, type: "addToCart" }, { type: "placeOrder" });
    const incoming = state.seller.orders.find((item) => item.buyerOrderId)!;
    state = run(state, { accept: false, id: incoming.id, reason: "Sold out", type: "sellerRespondOrder" });
    expect(state.orders.find((item) => item.id === incoming.buyerOrderId)?.status).toBe("cancelled");
    expect(state.seller.orders.find((item) => item.id === incoming.id)?.status).toBe("declined");
  });

  it("cannot move an order backwards or accept it twice", () => {
    const seller = createSellerState(NOW);
    const ready = sellerReduce(seller, { id: "so-2038", to: "ready", type: "sellerAdvanceOrder" }, { now: NOW, verifiedStudent: true });
    const back = sellerReduce(ready, { id: "so-2038", to: "preparing", type: "sellerAdvanceOrder" }, { now: NOW, verifiedStudent: true });
    expect(back.orders.find((item) => item.id === "so-2038")?.status).toBe("ready");
    const again = sellerReduce(seller, { accept: true, id: "so-2038", type: "sellerRespondOrder" }, { now: NOW, verifiedStudent: true });
    expect(again).toBe(seller);
  });
});

describe("listings and withdrawals", () => {
  it("restocks, pauses and saves a listing", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { id: "sl-coffee", quantity: 20, type: "sellerRestock" });
    expect(seller.listings.find((item) => item.id === "sl-coffee")?.onHand).toBe(23);
    seller = sellerReduce(seller, { id: "sl-coffee", paused: true, type: "sellerPauseListing" });
    expect(activeListings(seller.listings).length).toBe(6);
    seller = sellerReduce(seller, { listing: { category: "food", description: "", id: "sl-new", onHand: 5, priceCents: 1000, status: "draft", title: "Loaded Chips", unlimited: false, updatedAt: "" }, type: "sellerSaveListing" });
    expect(seller.listings[0]?.title).toBe("Loaded Chips");
  });

  it("only pays out from a saved bank account, above the minimum and no more than the balance", () => {
    let seller = createSellerState(NOW);
    const noBank = sellerReduce(seller, { amountCents: 10_000, type: "sellerWithdraw" });
    expect(noBank).toBe(seller);
    seller = sellerReduce(seller, { bank: { accountHolder: "V Student", bankName: "Capitec", last4: "1234" }, type: "sellerSaveBank" });
    expect(sellerReduce(seller, { amountCents: 5_000, type: "sellerWithdraw" })).toBe(seller);
    expect(sellerReduce(seller, { amountCents: 999_999, type: "sellerWithdraw" })).toBe(seller);
    const paid = sellerReduce(seller, { amountCents: 50_000, type: "sellerWithdraw" });
    expect(sellerBalanceCents(paid)).toBe(124_500 - 50_000);
    expect(paid.ledger[0]).toMatchObject({ amountCents: -50_000, kind: "payout" });
  });
});
