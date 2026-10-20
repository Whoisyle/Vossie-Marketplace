import { getListing, getListings, getSeller, registerOwnStore } from "@/data/repository";
import { cartTotals, createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { storeIsLive } from "./catalogue";
import { DAY_KEYS } from "./types";

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

/** A student who runs an approved, finished store called CampusBites, with the demo products, and who is signed in as a buyer too. */
function liveStore(): DemoState {
  let state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { role: "seller", type: "switchRole" }, { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
  state = run(
    state,
    { phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" },
    { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" },
    { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" },
    { type: "sellerSubmitVerification" },
    { type: "sellerReviewTick" },
    { type: "sellerReviewTick" },
    { patch: { description: "Pre-loved books and calculators", location: "Res Block B" }, type: "sellerSaveStore" },
    { type: "sellerFinishSetup" },
    // always open, so the tests do not depend on the time of day
    { schedule: { ...state.seller.schedule, autoPause: false, hours: Object.fromEntries(DAY_KEYS.map((day) => [day, { from: "00:00", open: true, to: "23:59" }])) as typeof state.seller.schedule.hours }, type: "sellerSetSchedule" },
    { role: "buyer", type: "switchRole" },
  );
  // earlier orders the demo student placed with the store would make the first-order offer unavailable
  return { ...state, orders: state.orders.filter((item) => item.sellerId !== "campusbites") };
}

/** The seller finishes an order the buyer placed, so the buyer's order is delivered. */
function deliver(state: DemoState): DemoState {
  const order = state.seller.orders.find((item) => item.buyerOrderId)!;
  return run(state, { accept: true, id: order.id, type: "sellerRespondOrder" }, { id: order.id, to: "preparing", type: "sellerAdvanceOrder" }, { id: order.id, to: "ready", type: "sellerAdvanceOrder" }, { id: order.id, type: "sellerCompleteOrder" });
}

const order = (state: DemoState, listingId = "sl-calculus") => run(state, { listingId, quantity: 1, type: "addToCart" }, { type: "placeOrder" });

afterEach(() => registerOwnStore(null));

describe("buyers see the store the seller runs", () => {
  it("shows the seller's name, words and published products with stock, and nothing before approval", () => {
    expect(getSeller("campusbites")?.name).toBe("CampusBites");
    expect(getListings({ sellerId: "campusbites" }).some((item) => item.id === "sl-ti30")).toBe(false);
    const state = liveStore();
    expect(storeIsLive(state.seller)).toBe(true);
    expect(getSeller("campusbites")).toMatchObject({ bio: "Pre-loved books and calculators", name: "CampusBites" });
    const titles = getListings({ sellerId: "campusbites" }).map((item) => item.title);
    expect(titles).toContain("TI-30XS Calculator");
    expect(titles).not.toContain("Hoodie Teal (M)");
    expect(titles).not.toContain("USB-C Hub (7-in-1)");
    expect(titles).not.toContain("Burger & Chips");
    expect(getListing("sl-ti30")?.sellerId).toBe("campusbites");
    expect(getListing("burger-chips")).toBeTruthy();
  });

  it("takes a product off sale when it runs out or is paused", () => {
    let state = liveStore();
    state = run(state, { delta: -2, id: "sl-ti30", type: "sellerAdjustStock" });
    expect(getListings({ sellerId: "campusbites" }).some((item) => item.id === "sl-ti30")).toBe(false);
    run(state, { id: "sl-calculus", paused: true, type: "sellerPauseListing" });
    expect(getListings({ sellerId: "campusbites" }).some((item) => item.id === "sl-calculus")).toBe(false);
    expect(getListing("sl-calculus")).toBeTruthy();
  });

  it("stops being offered when the student signs out", () => {
    run(liveStore(), { type: "signOut" });
    expect(getListings({ sellerId: "campusbites" }).some((item) => item.id === "sl-calculus")).toBe(false);
  });
});

describe("ordering from the seller's store", () => {
  it("reaches the seller as a new order, takes the stock off and tells the buyer when it is delivered", () => {
    let state = order(liveStore());
    const incoming = state.seller.orders.find((item) => item.buyerOrderId)!;
    expect(incoming).toMatchObject({ lines: [expect.objectContaining({ title: "Calculus Textbook" })], status: "new" });
    expect(state.seller.listings.find((item) => item.id === "sl-calculus")?.onHand).toBe(7);
    state = deliver(state);
    expect(state.orders.find((item) => item.id === incoming.buyerOrderId)?.status).toBe("delivered");
  });

  it("is accepted by the auto-accept rule on a paid plan, for the buyer too", () => {
    let state = liveStore();
    state = run(state, { planId: "seller-plus", type: "subscribe" }, { rule: { maxOrderCents: null, needStock: true, on: true, onlyWhenOpen: false }, type: "sellerSetAutoAccept" });
    state = order(state);
    const incoming = state.seller.orders.find((item) => item.buyerOrderId)!;
    expect(incoming.status).toBe("accepted");
    expect(state.orders.find((item) => item.id === incoming.buyerOrderId)?.status).toBe("accepted");
  });
});

describe("the seller's offers at checkout", () => {
  it("applies a code to the store's items once, and counts the use", () => {
    let state = run(liveStore(), { listingId: "sl-calculus", quantity: 1, type: "addToCart" });
    const full = cartTotals(state);
    expect(full.voucherDiscountCents).toBe(0);
    state = run(state, { code: "VOSSIE10", type: "applyVoucher" });
    expect(state.checkout.voucherCode).toBe("VOSSIE10");
    expect(cartTotals(state)).toMatchObject({ sellerOfferTitle: "First order 10% off", voucherDiscountCents: 3400 });
    state = run(state, { type: "placeOrder" });
    expect(state.seller.promotions.find((item) => item.id === "pr-first")?.redemptions).toBe(19);
    expect(state.promoUses["pr-first"]).toBe(1);
    // a second order is no longer a first order
    const again = run(state, { listingId: "sl-lamp", quantity: 1, type: "addToCart" }, { code: "VOSSIE10", type: "applyVoucher" });
    expect(again.checkout.voucherCode).toBeNull();
  });

  it("waives delivery by itself over R150, and refuses a code for the wrong things", () => {
    let state = run(liveStore(), { listingId: "sl-calculus", quantity: 1, type: "addToCart" });
    expect(cartTotals(state).sellerOfferTitle).toBe("Free delivery over R150");
    expect(cartTotals(state).deliveryFeeCents).toBe(0);
    state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
    expect(cartTotals(state).sellerOfferTitle).toBeNull();
  });

  it("does not apply a scheduled offer, and says why", () => {
    const state = run(liveStore(), { listingId: "sl-calculus", quantity: 1, type: "addToCart" }, { promotion: { active: true, appliesTo: "store", code: "LATER", detail: "", id: "pr-later", kind: "percent", perStudent: 1, redemptions: 0, startsAt: "2099-01-01", title: "Later", value: 20 }, type: "sellerCreatePromotion" });
    const check = cartTotals({ ...state, checkout: { ...state.checkout, voucherCode: "LATER" } });
    expect(check.sellerOfferProblem).toBe("That offer has not started yet.");
    expect(run(state, { code: "LATER", type: "applyVoucher" }).checkout.voucherCode).toBeNull();
  });
});

describe("reviews, returns, follows, messages and reels cross over", () => {
  it("passes a buyer's review to the seller and shows the seller's reply on the buyer's review", () => {
    let state = deliver(order(liveStore()));
    state = run(state, { body: "Great condition", listingId: "sl-calculus", rating: 5, type: "addReview" });
    const mine = state.reviews.find((item) => item.mine)!;
    const theirs = state.seller.reviews.find((item) => item.id === mine.id);
    expect(theirs).toMatchObject({ rating: 5, text: "Great condition" });
    expect(state.seller.reviewCounts[0]).toBe(109);
    expect(state.seller.alerts[0]?.title).toBe("New review");
    state = run(state, { id: mine.id, text: "Thank you!", type: "sellerReplyReview" });
    expect(state.seller.reviews.find((item) => item.id === mine.id)?.reply).toBe("Thank you!");
  });

  it("sends a return to the seller, and a refund and the answer back to the buyer", () => {
    let state = deliver(order(liveStore()));
    const buyerOrder = state.orders[0]!;
    state = run(state, { kind: "return", orderId: buyerOrder.id, reason: "Item does not fit", type: "openReturn" });
    const request = state.returns[0]!;
    expect(state.seller.cases[0]).toMatchObject({ buyerOrderId: buyerOrder.id, id: request.id, kind: "return", status: "open" });
    const before = state.wallet.balanceCents;
    state = run(state, { decision: "approve", id: request.id, type: "sellerResolveCase" });
    expect(state.returns[0]).toMatchObject({ refundCents: 34000, status: "approved" });
    expect(state.wallet.balanceCents).toBe(before + 34000);
    expect(state.notifications[0]?.title).toBe("Refund approved");
    // reporting the same order again is not possible while one is open or answered
    expect(run(state, { kind: "dispute", orderId: buyerOrder.id, reason: "x", type: "openReturn" }).returns).toHaveLength(1);
  });

  it("tells the buyer when the seller declines or answers, with no refund", () => {
    let state = deliver(order(liveStore()));
    state = run(state, { kind: "dispute", orderId: state.orders[0]!.id, reason: "Item arrived damaged", type: "openReturn" });
    const before = state.wallet.balanceCents;
    state = run(state, { decision: "respond", id: state.returns[0]!.id, text: "Sorry, can you send a photo?", type: "sellerResolveCase" });
    expect(state.returns[0]).toMatchObject({ response: "Sorry, can you send a photo?", status: "replied" });
    expect(state.wallet.balanceCents).toBe(before);
  });

  it("only reports orders that were delivered", () => {
    const state = order(liveStore());
    expect(run(state, { kind: "return", orderId: state.orders[0]!.id, reason: "x", type: "openReturn" }).returns).toHaveLength(0);
  });

  it("tells the seller about a new follower once, and counts it on the store", () => {
    let state = run(liveStore(), { sellerId: "campusbites", type: "toggleFollow" });
    expect(state.seller.alerts[0]?.title).toBe("New follower");
    expect(getSeller("campusbites")?.followers).toBe(1);
    state = run(state, { sellerId: "campusbites", type: "toggleFollow" });
    expect(getSeller("campusbites")?.followers).toBe(0);
    expect(state.seller.alerts.filter((item) => item.title === "New follower")).toHaveLength(1);
  });

  it("carries messages both ways: the buyer's lands in the seller's Messages and the reply in the buyer's inbox", () => {
    let state = run(liveStore(), { conversationId: "seller-campusbites", name: "CampusBites", type: "openConversation" }, { body: "Is the textbook still there?", conversationId: "seller-campusbites", type: "sendMessage" });
    const inbox = state.conversations.find((item) => item.id === "inbox-campusbites")!;
    expect(inbox).toMatchObject({ kind: "buyer", unread: true });
    expect(inbox.messages.at(-1)).toMatchObject({ body: "Is the textbook still there?", fromMe: false });
    expect(state.seller.alerts[0]).toMatchObject({ kind: "message", title: "New message" });
    state = run(state, { body: "Yes, come and get it.", conversationId: "inbox-campusbites", type: "sendMessage" });
    const theirs = state.conversations.find((item) => item.id === "seller-campusbites")!;
    expect(theirs.messages.at(-1)).toMatchObject({ body: "Yes, come and get it.", fromMe: false });
    expect(state.notifications[0]?.title).toBe("CampusBites replied");
  });

  it("puts the seller's live reels in the buyer's feed first, and passes a like back to the seller", () => {
    let state = liveStore();
    const own = state.reels.filter((item) => item.sellerId === "campusbites");
    expect(own.map((item) => item.id)).toEqual(["rl-ti30", "rl-pack", "rl-lamp"]);
    expect(state.reels[0]?.id).toBe("rl-ti30");
    const before = state.seller.reels.find((item) => item.id === "rl-ti30")!.likes;
    state = run(state, { reelId: "rl-ti30", type: "toggleReelLike" });
    expect(state.seller.reels.find((item) => item.id === "rl-ti30")?.likes).toBe(before + 1);
    state = run(state, { reelId: "rl-ti30", type: "toggleReelLike" });
    expect(state.seller.reels.find((item) => item.id === "rl-ti30")?.likes).toBe(before);
    state = run(state, { id: "rl-lamp", status: "hidden", type: "sellerSetReelStatus" });
    expect(state.reels.some((item) => item.id === "rl-lamp")).toBe(false);
  });
});
