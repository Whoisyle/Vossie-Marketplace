import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { activeListings, analytics, bestReel, insights, revenueSeries, engagementPercent, liveReelCount, productCount, rankReels, attentionItems, feesPaidCents, isLowStock, pendingCents, orderCounts, ordersInGroup, weekBars, weekTotals } from "./selectors";
import { filterLedger, receiptText, referenceFor, statements, statementText } from "./receipts";
import { applyPreset, applyTimetable, pickupSlots, storeStatus, summaryRange } from "./schedule";
import { distanceKm } from "@/data/geo";
import { minutesFor, offsetPoint } from "@/screens/seller/OrderMap";
import { sellerPlanOf } from "./plan";
import { CAMPUS_HUBS, locationFromPlace, locationLine, placeFromHit } from "./places";
import { promotionDetail, promotionProblems, promotionState } from "./promotions";
import { DAY_KEYS, type SellerReel } from "./types";
import { averageRating, createSellerState, demoIncomingOrder, docKindsFor, earnCents, scanMatchesCourierCode, sellerBalanceCents, sellerReduce } from "./state";

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
    expect(seller.listings.filter(isLowStock).map((item) => item.title)).toEqual(["TI-30XS Calculator", "Wireless Study Headphones"]);
  });

  it("puts new orders first under Needs your attention, then stock, then messages", () => {
    const items = attentionItems(seller, [{ at: "2026-10-20T10:00:00Z", id: "c1", name: "Lerato M.", preview: "Is the burger still available?", unread: true }]);
    expect(items.map((item) => item.kind)).toEqual(["order", "order", "order", "stock", "stock", "message"]);
  });

  it("groups accepted orders under Preparing and declined ones under Cancelled", () => {
    expect(ordersInGroup(seller.orders, "preparing")).toHaveLength(1);
    expect(ordersInGroup(seller.orders, "accepted")).toHaveLength(1);
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
    expect(sellerBalanceCents(state.seller)).toBe(before + earnCents(incoming!.subtotalCents));
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
    seller = sellerReduce(seller, { id: "sl-ti30", quantity: 20, type: "sellerRestock" });
    expect(seller.listings.find((item) => item.id === "sl-ti30")?.onHand).toBe(22);
    seller = sellerReduce(seller, { id: "sl-ti30", paused: true, type: "sellerPauseListing" });
    expect(activeListings(seller.listings).length).toBe(6);
    seller = sellerReduce(seller, { listing: { category: "food", description: "", id: "sl-new", onHand: 5, priceCents: 1000, status: "draft", title: "Loaded Chips", photos: [], sku: "VM-0001", unlimited: false, updatedAt: "", variants: [] }, type: "sellerSaveListing" });
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

describe("the new seller screens' rules", () => {
  it("shows what the seller earns after Vossie's fee, and pays the net when an order is handed over", () => {
    let seller = createSellerState(NOW);
    const order = seller.orders.find((item) => item.id === "so-2041")!;
    expect(order).toMatchObject({ deliveryFeeCents: 2500, feeCents: 1700, subtotalCents: 34000 });
    expect(earnCents(order.subtotalCents)).toBe(32300);
    seller = sellerReduce(seller, { id: "so-2041", type: "sellerRespondOrder", accept: true }, { now: NOW, verifiedStudent: true });
    seller = sellerReduce(seller, { id: "so-2041", to: "ready", type: "sellerAdvanceOrder" });
    // no courier yet, so it cannot be handed over
    expect(sellerReduce(seller, { id: "so-2041", type: "sellerHandToCourier" })).toBe(seller);
    seller = sellerReduce(seller, { id: "so-2041", type: "sellerAssignCourier" });
    expect(seller.orders.find((item) => item.id === "so-2041")?.courier?.name).toBe("Tebogo K.");
    const before = sellerBalanceCents(seller);
    seller = sellerReduce(seller, { id: "so-2041", type: "sellerHandToCourier" });
    expect(seller.orders.find((item) => item.id === "so-2041")?.status).toBe("done");
    expect(sellerBalanceCents(seller)).toBe(before + 32300);
  });

  it("only gives a courier to a delivery order that is ready", () => {
    const seller = createSellerState(NOW);
    expect(sellerReduce(seller, { id: "so-2039", type: "sellerAssignCourier" })).toBe(seller);
    expect(sellerReduce(seller, { id: "so-2041", type: "sellerAssignCourier" })).toBe(seller);
  });

  it("changes stock by one and never below zero, and archives a product", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { delta: -5, id: "sl-ti30", type: "sellerAdjustStock" });
    expect(seller.listings.find((item) => item.id === "sl-ti30")?.onHand).toBe(0);
    seller = sellerReduce(seller, { delta: 1, id: "sl-ti30", type: "sellerAdjustStock" });
    expect(seller.listings.find((item) => item.id === "sl-ti30")?.onHand).toBe(1);
    seller = sellerReduce(seller, { archived: true, id: "sl-ti30", type: "sellerArchiveListing" });
    expect(seller.listings.find((item) => item.id === "sl-ti30")?.status).toBe("archived");
    expect(activeListings(seller.listings).some((item) => item.id === "sl-ti30")).toBe(false);
  });

  it("approving a return refunds the buyer from the balance, and declining does not", () => {
    let seller = createSellerState(NOW);
    const before = sellerBalanceCents(seller);
    seller = sellerReduce(seller, { decision: "approve", id: "cs-2012", type: "sellerResolveCase" });
    expect(seller.cases.find((item) => item.id === "cs-2012")).toMatchObject({ resolution: "Refund approved", status: "resolved" });
    expect(sellerBalanceCents(seller)).toBe(before - 28000);
    expect(sellerReduce(seller, { decision: "approve", id: "cs-2012", type: "sellerResolveCase" })).toBe(seller);
    const declined = sellerReduce(createSellerState(NOW), { decision: "decline", id: "cs-2012", type: "sellerResolveCase" });
    expect(sellerBalanceCents(declined)).toBe(before);
  });

  it("switches promotions, replies to reviews and manages the team", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { active: true, id: "pr-exam", type: "sellerTogglePromotion" });
    expect(seller.promotions.find((item) => item.id === "pr-exam")).toMatchObject({ active: true, scheduled: false });
    seller = sellerReduce(seller, { id: "rv-1", text: "Thank you!", type: "sellerReplyReview" });
    expect(seller.reviews[0]?.reply).toBe("Thank you!");
    seller = sellerReduce(seller, { email: "New@Vossie.net", name: "Naledi", type: "sellerInviteTeam" });
    expect(seller.team.at(-1)).toMatchObject({ email: "new@vossie.net", role: "packer" });
    expect(sellerReduce(seller, { email: "new@vossie.net", name: "Again", type: "sellerInviteTeam" }).team).toHaveLength(seller.team.length);
    const owner = seller.team.find((item) => item.role === "owner")!;
    expect(sellerReduce(seller, { id: owner.id, type: "sellerRemoveTeam" }).team).toHaveLength(seller.team.length);
    expect(averageRating(seller.reviewCounts)).toBeCloseTo(4.8, 1);
  });

  it("adds up pending money, fees and analytics from the seed", () => {
    const seller = createSellerState(NOW);
    // accepted #2038 (R240), preparing #2036 (R340) and ready #2035 (R320), each less 5%
    expect(pendingCents(seller.orders)).toBe(22800 + 32300 + 30400);
    expect(feesPaidCents(seller.ledger)).toBeGreaterThan(0);
    const week = analytics(seller, 7, NOW);
    expect(week.revenueCents).toBe(124_500);
    expect(week.changePercent).toBe(12);
    expect(analytics(seller, 30, NOW).revenueCents).toBeGreaterThanOrEqual(week.revenueCents);
  });
});

describe("courier QR codes", () => {
  it("accepts the digits with or without the prefix and nothing else", () => {
    expect(scanMatchesCourierCode("4829", "4829")).toBe(true);
    expect(scanMatchesCourierCode(" vossie-courier:4829 ", "4829")).toBe(true);
    expect(scanMatchesCourierCode("4828", "4829")).toBe(false);
    expect(scanMatchesCourierCode("4829", "")).toBe(false);
  });
});

describe("operating times", () => {
  const monday10 = new Date(2026, 9, 19, 10, 0);

  it("is open inside the hours and says when it opens next outside them", () => {
    const schedule = createSellerState(NOW).schedule;
    expect(storeStatus(schedule, monday10)).toMatchObject({ label: "Open now · until 17:00", open: true });
    expect(storeStatus(schedule, new Date(2026, 9, 19, 18, 0)).label).toBe("Closed · opens tomorrow 08:00");
    expect(storeStatus(schedule, new Date(2026, 9, 24, 12, 0)).label).toBe("Closed · opens Mon 08:00");
  });

  it("follows a closure and the manual switch", () => {
    let schedule = createSellerState(NOW).schedule;
    schedule = { ...schedule, closures: [{ from: "2026-10-19", id: "c", label: "Exam week", to: "2026-10-21" }] };
    expect(storeStatus(schedule, monday10)).toMatchObject({ label: "Closed · back on 22 Oct", open: false, reason: "closure" });
    expect(storeStatus({ ...schedule, closures: [], closedNow: true }, monday10).reason).toBe("manual");
  });

  it("applies presets and keeps the single range the database holds in step", () => {
    const base = createSellerState(NOW).schedule;
    const all = applyPreset(base, "every-day");
    expect(DAY_KEYS.every((day) => all.hours[day].open)).toBe(true);
    expect(summaryRange(all).days).toHaveLength(7);
    expect(summaryRange(applyPreset(all, "weekdays")).days).toEqual(["mon", "tue", "wed", "thu", "fri"]);
  });

  it("opens the store in the longest gap between lectures, and stays shut when there is none", () => {
    const base = createSellerState(NOW).schedule;
    const lecture = (id: string, from: string, to: string, day: "mon" | "tue" = "mon") => ({ day, from, id, label: "Lecture", to });
    const week = applyTimetable(base, [lecture("a", "08:00", "10:00"), lecture("b", "13:00", "15:00"), lecture("c", "08:00", "17:00", "tue")]);
    expect(week.hours.mon).toEqual({ from: "10:00", open: true, to: "13:00" });
    expect(week.hours.tue.open).toBe(false);
    expect(week.hours.wed).toMatchObject({ from: "08:00", open: true, to: "17:00" });
    expect(week.preset).toBe("timetable");
  });

  it("offers pickup slots after the cut-off, in steps, and none when closed", () => {
    const schedule = createSellerState(NOW).schedule;
    expect(pickupSlots(schedule, monday10).slice(0, 3)).toEqual(["10:30", "11:00", "11:30"]);
    expect(pickupSlots({ ...schedule, slotMinutes: 60 }, monday10).slice(0, 2)).toEqual(["11:00", "12:00"]);
    expect(pickupSlots(schedule, new Date(2026, 9, 17, 10, 0))).toEqual([]);
    expect(pickupSlots({ ...schedule, closedNow: true }, monday10)).toEqual([]);
  });

  it("queues an order that arrives while the store is closed, and syncs the profile from the schedule", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { schedule: { ...seller.schedule, closedNow: true }, type: "sellerSetSchedule" });
    seller = sellerReduce(seller, { order: demoIncomingOrder(NOW, 0), type: "sellerReceiveOrder" }, { now: NOW, verifiedStudent: true });
    expect(seller.orders[0]?.queued).toBe(true);
    expect(seller.alerts[0]?.body).toMatch(/while you were closed/);
    const base = createSellerState(NOW);
    expect(sellerReduce(base, { schedule: applyPreset(base.schedule, "every-day"), type: "sellerSetSchedule" }).profile.days).toHaveLength(7);
  });
});

describe("receipts and statements", () => {
  it("builds references, filters and searches the ledger", () => {
    const ledger = createSellerState(NOW).ledger;
    const sale = ledger.find((item) => item.kind === "sale")!;
    expect(referenceFor(sale)).toMatch(/^VM-S-\d{4}$/);
    expect(filterLedger(ledger, "payout", "all", "", NOW).every((item) => item.kind === "payout")).toBe(true);
    expect(filterLedger(ledger, "all", "7", "", NOW).length).toBeLessThan(filterLedger(ledger, "all", "all", "", NOW).length);
    expect(filterLedger(ledger, "all", "all", sale.label, NOW).length).toBeGreaterThan(0);
    expect(filterLedger(ledger, "all", "all", "no such thing", NOW)).toEqual([]);
  });

  it("writes the receipt text with the fee, and a statement per month that adds up", () => {
    const seller = createSellerState(NOW);
    const order = seller.orders[0]!;
    const text = receiptText({ amountCents: 32300, createdAt: order.placedAt, id: "x", kind: "sale", label: "Order #VM-2041", sellerOrderId: order.id }, order, "CampusBites");
    expect(text).toContain("Vossie platform fee: - R 17.00");
    expect(text).toContain("You earned: R 323.00");
    const months = statements(seller.ledger);
    expect(months.reduce((sum, item) => sum + item.netCents, 0)).toBe(sellerBalanceCents(seller));
    expect(statementText(months[0]!, "CampusBites")).toContain("Statement for");
  });
});

describe("reels and plans", () => {
  const reel = (id: string, status: SellerReel["status"] = "published"): SellerReel => ({ caption: "New reel", createdAt: "", id, likes: 0, listingId: "sl-ti30", orders: 0, salesCents: 0, saves: 0, status, taps: 0, views: 0 });

  it("finds the best reel by sales and engagement", () => {
    const seller = createSellerState(NOW);
    expect(bestReel(seller.reels)?.id).toBe("rl-ti30");
    expect(rankReels(seller.reels).map((item) => item.id)).toEqual(["rl-ti30", "rl-pack", "rl-lamp", "rl-hoodie"]);
    expect(engagementPercent(seller.reels[0]!)).toBeCloseTo(15, 1);
    expect(liveReelCount(seller.reels)).toBe(3);
  });

  it("holds only as many live reels as the plan allows, and keeps the ones already live", () => {
    const seller = createSellerState(NOW);
    const save = (plan: "free" | "plus" | "pro", id: string) => sellerReduce(seller, { reel: reel(id), type: "sellerSaveReel" }, { now: NOW, plan, verifiedStudent: true });
    expect(save("free", "rl-new")).toBe(seller);
    expect(liveReelCount(save("plus", "rl-new").reels)).toBe(4);
    const four = save("plus", "rl-a");
    const five = sellerReduce(four, { reel: reel("rl-b"), type: "sellerSaveReel" }, { now: NOW, plan: "plus", verifiedStudent: true });
    expect(liveReelCount(five.reels)).toBe(5);
    expect(sellerReduce(five, { reel: reel("rl-c"), type: "sellerSaveReel" }, { now: NOW, plan: "plus", verifiedStudent: true })).toBe(five);
    expect(liveReelCount(sellerReduce(five, { reel: reel("rl-c"), type: "sellerSaveReel" }, { now: NOW, plan: "pro", verifiedStudent: true }).reels)).toBe(6);
    // hiding one makes room, and republishing past the limit is refused
    const hidden = sellerReduce(five, { id: "rl-ti30", status: "hidden", type: "sellerSetReelStatus" }, { now: NOW, plan: "plus", verifiedStudent: true });
    expect(liveReelCount(hidden.reels)).toBe(4);
    expect(sellerReduce(hidden, { id: "rl-ti30", status: "published", type: "sellerSetReelStatus" }, { now: NOW, plan: "plus", verifiedStudent: true }).reels.find((item) => item.id === "rl-ti30")?.status).toBe("published");
    expect(sellerReduce(createSellerState(NOW), { id: "rl-hoodie", status: "published", type: "sellerSetReelStatus" }, { now: NOW, plan: "free", verifiedStudent: true }).reels.find((item) => item.id === "rl-hoodie")?.status).toBe("draft");
  });

  it("deletes a reel and only live reels gain views", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { id: "rl-lamp", type: "sellerDeleteReel" });
    expect(seller.reels.some((item) => item.id === "rl-lamp")).toBe(false);
    const ticked = sellerReduce(seller, { n: 1, type: "sellerReelTick" });
    expect(ticked.reels.find((item) => item.id === "rl-ti30")!.views).toBeGreaterThan(4820);
    expect(ticked.reels.find((item) => item.id === "rl-hoodie")!.views).toBe(0);
  });

  it("charges the fee of the plan the seller is on when an order arrives", () => {
    const seller = createSellerState(NOW);
    const arrive = (plan: "free" | "plus" | "pro") => sellerReduce(seller, { order: demoIncomingOrder(NOW, 1), type: "sellerReceiveOrder" }, { now: NOW, plan, verifiedStudent: true }).orders[0]!;
    const subtotal = arrive("free").subtotalCents;
    expect(arrive("free").feeCents).toBe(Math.round(subtotal * 0.05));
    expect(arrive("plus").feeCents).toBe(Math.round(subtotal * 0.03));
    expect(arrive("pro").feeCents).toBe(Math.round(subtotal * 0.02));
  });

  it("works out the plan from the subscriptions, and counts products against the limit", () => {
    const now = new Date(NOW);
    const sub = (planId: "seller-plus" | "seller-pro", cancelling = false) => ({ cancelling, planId, renewsAt: new Date(NOW + 20 * 86_400_000).toISOString(), since: new Date(NOW).toISOString() });
    expect(sellerPlanOf([], now)).toBe("free");
    expect(sellerPlanOf([sub("seller-plus")], now)).toBe("plus");
    expect(sellerPlanOf([sub("seller-plus"), sub("seller-pro")], now)).toBe("pro");
    expect(sellerPlanOf([{ ...sub("seller-pro"), renewsAt: new Date(NOW - 1000).toISOString() }], now)).toBe("free");
    expect(productCount(createSellerState(NOW).listings)).toBe(9);
  });
});

describe("promotions and support tickets", () => {
  const now = new Date(NOW);

  it("writes the offer line from the options, and works out where an offer is up to", () => {
    const seller = createSellerState(NOW);
    expect(seller.promotions[0]?.detail).toMatch(/10% off · first order · code VOSSIE10 · ends/);
    expect(promotionDetail({ ...seller.promotions[1]! })).toBe("Free delivery · over R150");
    expect(promotionDetail({ active: true, buyX: 3, detail: "", getY: 1, id: "x", kind: "buy-x-get-y", redemptions: 0, title: "t" })).toBe("Buy 3, get 1 free");
    expect(seller.promotions.map((item) => promotionState(item, now))).toEqual(["active", "active", "scheduled"]);
    expect(promotionState({ ...seller.promotions[0]!, endsAt: "2020-01-01" }, now)).toBe("ended");
    expect(promotionState({ ...seller.promotions[0]!, active: false }, now)).toBe("paused");
  });

  it("refuses an offer with no name, a bad code, a code in use, bad dates or a per-student limit above the total", () => {
    const seller = createSellerState(NOW);
    const base = { ...seller.promotions[0]!, id: "new" };
    expect(promotionProblems({ ...base, title: "x" }, seller.promotions).title).toBeTruthy();
    expect(promotionProblems({ ...base, code: "ab" }, seller.promotions).code).toMatch(/4 to 12/);
    expect(promotionProblems({ ...base, code: "VOSSIE10" }, seller.promotions).code).toMatch(/already/);
    expect(promotionProblems({ ...base, code: "FRESH10", endsAt: "2020-01-01", startsAt: "2026-01-01" }, seller.promotions).dates).toBeTruthy();
    expect(promotionProblems({ ...base, code: "FRESH10", maxUses: 2, perStudent: 3 }, seller.promotions).limit).toBeTruthy();
    expect(promotionProblems({ ...base, code: "FRESH10" }, seller.promotions)).toEqual({});
  });

  it("creates, changes and deletes a promotion", () => {
    let seller = createSellerState(NOW);
    const offer = { ...seller.promotions[0]!, id: "pr-new", title: "New one" };
    seller = sellerReduce(seller, { promotion: offer, type: "sellerCreatePromotion" });
    expect(seller.promotions[0]?.id).toBe("pr-new");
    seller = sellerReduce(seller, { promotion: { ...offer, title: "Renamed" }, type: "sellerUpdatePromotion" });
    expect(seller.promotions[0]?.title).toBe("Renamed");
    seller = sellerReduce(seller, { id: "pr-new", type: "sellerDeletePromotion" });
    expect(seller.promotions.some((item) => item.id === "pr-new")).toBe(false);
  });

  it("sends a ticket with a reference and an alert, and support answers it once", () => {
    let seller = createSellerState(NOW);
    const ticket = { attachments: [], bestTime: "evening" as const, contact: "phone" as const, createdAt: "", details: "My payout is late", id: "tk-new", messages: [], phone: "0825735164", ref: "", status: "open" as const, subject: "Late payout", topic: "payout" as const, urgency: "urgent" as const };
    seller = sellerReduce(seller, { ticket, type: "sellerCreateTicket" }, { now: NOW, verifiedStudent: true });
    expect(seller.tickets[0]).toMatchObject({ ref: "VS-1033", status: "open" });
    expect(seller.alerts[0]?.title).toBe("Support request sent");
    seller = sellerReduce(seller, { id: "tk-new", type: "sellerSupportReply" }, { now: NOW, verifiedStudent: true });
    expect(seller.tickets[0]?.status).toBe("in-progress");
    expect(seller.tickets[0]?.messages.at(-1)?.body).toMatch(/urgent.*call you this evening/);
    expect(sellerReduce(seller, { id: "tk-new", type: "sellerSupportReply" }, { now: NOW, verifiedStudent: true })).toBe(seller);
    seller = sellerReduce(seller, { body: "Thanks!", id: "tk-new", type: "sellerReplyTicket" }, { now: NOW, verifiedStudent: true });
    expect(seller.tickets[0]?.messages.at(-1)).toMatchObject({ body: "Thanks!", from: "you" });
    seller = sellerReduce(seller, { id: "tk-new", type: "sellerResolveTicket" });
    expect(seller.tickets[0]?.status).toBe("resolved");
    expect(sellerReduce(seller, { body: "More", id: "tk-new", type: "sellerReplyTicket" })).toBe(seller);
  });
});

describe("documents and places", () => {
  it("keeps the picked file, and takes it back until the documents are sent in", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { kind: "campus-business", type: "sellerSetKind" }, { now: NOW, verifiedStudent: true });
    seller = sellerReduce(seller, { fileKind: "pdf", fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument", uri: "file:///bill.pdf" });
    expect(seller.documents.find((doc) => doc.kind === "address")).toMatchObject({ fileKind: "pdf", status: "uploaded", uri: "file:///bill.pdf" });
    const removed = sellerReduce(seller, { kind: "address", type: "sellerRemoveDocument" });
    expect(removed.documents.find((doc) => doc.kind === "address")).toEqual({ kind: "address", status: "required" });
    expect(sellerReduce({ ...seller, status: "pending" }, { kind: "address", type: "sellerRemoveDocument" }).documents.find((doc) => doc.kind === "address")?.status).toBe("uploaded");
  });

  it("works out names and addresses from OpenStreetMap results, and starts from real hubs", () => {
    const place = placeFromHit({ display_name: "Mooirivier Mall, Nelson Mandela Drive, Grimbeekpark, Potchefstroom, North West, 2550", lat: "-26.7128591", lon: "27.1044191", name: "Mooirivier Mall", place_id: 1 });
    expect(place).toMatchObject({ address: "Nelson Mandela Drive, Grimbeekpark, Potchefstroom, North West", id: "osm-1", name: "Mooirivier Mall" });
    expect(CAMPUS_HUBS.map((hub) => hub.name)).toEqual(["Eduvos Potchefstroom campus", "Mooirivier Mall"]);
    const location = locationFromPlace(CAMPUS_HUBS[1]!, "hub");
    expect(locationLine(location)).toBe("Mooirivier Mall, Nelson Mandela Drive");
  });

  it("saves the place and the banner with the store", () => {
    const seller = sellerReduce(createSellerState(NOW), { patch: { bannerUri: "file:///b.jpg", place: locationFromPlace(CAMPUS_HUBS[0]!, "hub") }, type: "sellerSaveStore" });
    expect(seller.profile.bannerUri).toBe("file:///b.jpg");
    expect(seller.profile.place?.name).toBe("Eduvos Potchefstroom campus");
  });
});

describe("distance and time on the order map", () => {
  it("works out minutes at campus speed and offsets the demo courier", () => {
    expect(minutesFor(0.2)).toBe(1);
    expect(minutesFor(1.4)).toBe(7);
    const from = { latitude: -26.694, longitude: 27.094 };
    const moved = offsetPoint(from, 800);
    expect(distanceKm(from, moved)).toBeGreaterThan(0.4);
    expect(distanceKm(from, moved)).toBeLessThan(1.2);
  });
});

describe("analytics series and insights", () => {
  it("builds a line for each day and the stretch before it, and groups 90 days", () => {
    const seller = createSellerState(NOW);
    const week = revenueSeries(seller.ledger, 7, NOW);
    expect(week.points).toHaveLength(7);
    expect(week.points.reduce((sum, point) => sum + point.cents, 0)).toBe(124_500);
    expect(week.previous.reduce((sum, point) => sum + point.cents, 0)).toBe(111_100);
    expect(revenueSeries(seller.ledger, 90, NOW).points).toHaveLength(30);
  });

  it("splits buyers, deliveries and categories, and finds the busy times", () => {
    const seller = createSellerState(NOW);
    const data = insights(seller, 30, NOW);
    expect(data.delivery + data.collection).toBe(data.orders);
    expect(data.returningBuyers).toBeGreaterThanOrEqual(1);
    expect(data.newBuyers + data.returningBuyers).toBeGreaterThan(0);
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.heat).toHaveLength(7);
    expect(data.heat.flat().reduce((a, b) => a + b, 0)).toBe(seller.ledger.filter((entry) => entry.kind === "sale").length);
    expect(data.feesCents).toBeGreaterThan(0);
    expect(data.netCents).toBe(data.revenueCents - data.refundCents);
  });
});

describe("updating a verified document", () => {
  it("sends it back for checking without losing the approval, then verifies it again and says so", () => {
    let seller = createSellerState(NOW);
    seller = sellerReduce(seller, { kind: "student", type: "sellerSetKind" }, { now: NOW, verifiedStudent: true });
    seller = { ...seller, documents: seller.documents.map((doc) => ({ ...doc, status: "verified" as const, verifiedAt: "2026-10-01T10:00:00.000Z" })), status: "approved" };
    seller = sellerReduce(seller, { fileKind: "image", fileName: "new-id.jpg", kind: "id", type: "sellerReplaceDocument", uri: "file:///new.jpg" });
    expect(seller.status).toBe("approved");
    expect(seller.documents.find((doc) => doc.kind === "id")).toMatchObject({ fileName: "new-id.jpg", status: "in-review", uri: "file:///new.jpg" });
    expect(sellerReduce(seller, { fileName: "again.jpg", kind: "id", type: "sellerReplaceDocument" })).toBe(seller);
    seller = sellerReduce(seller, { type: "sellerReviewTick" }, { now: NOW, verifiedStudent: true });
    expect(seller.documents.find((doc) => doc.kind === "id")?.status).toBe("verified");
    expect(seller.documents.find((doc) => doc.kind === "id")?.verifiedAt).toBeTruthy();
    expect(seller.alerts[0]?.title).toBe("Document verified");
    expect(seller.status).toBe("approved");
  });
});
