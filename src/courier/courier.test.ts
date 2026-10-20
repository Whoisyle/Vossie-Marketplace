import { registerOwnStore } from "@/data/repository";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { courierFeeCents, distanceBonusCents, tripMinutes } from "./pay";
import { earningsFor, performance, todayStats } from "./selectors";
import { balanceCents, courierReduce, emptyCourierState, WAIT_MS } from "./state";
import type { CourierAction } from "./types";
import { deliveryCodeFor, returnCodeFor } from "./jobs";

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

/** A student who has been through the courier setup and been approved, and is online. */
function onlineCourier(): DemoState {
  let state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164", vehicle: "bicycle" }, type: "courierSetProfile" });
  state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" }, { type: "courierSubmitVerification" });
  for (let n = 0; n < 4; n += 1) state = run(state, { type: "courierReviewTick" });
  return run(state, { type: "courierApprovalSeen" }, { online: true, type: "courierSetOnline" });
}

/** The student who runs the store too, with an approved shop and the courier above, and one delivery order that the seller has made ready. */
function readyDelivery(): DemoState {
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
  );
  state = { ...state, courier: onlineCourier().courier, orders: state.orders.filter((item) => item.sellerId !== "campusbites") };
  state = run(state, { role: "buyer", type: "switchRole" }, { listingId: "sl-calculus", quantity: 1, type: "addToCart" }, { type: "placeOrder" });
  const incoming = state.seller.orders.find((item) => item.buyerOrderId)!;
  return run(state, { accept: true, id: incoming.id, type: "sellerRespondOrder" }, { id: incoming.id, to: "preparing", type: "sellerAdvanceOrder" }, { id: incoming.id, to: "ready", type: "sellerAdvanceOrder" });
}

afterEach(() => registerOwnStore(null));

describe("what a delivery pays", () => {
  it("is a base plus a rate per kilometre, to the nearest rand, with a cap", () => {
    expect(courierFeeCents(0)).toBe(2000);
    expect(courierFeeCents(1.4)).toBe(2800);
    expect(courierFeeCents(3.2)).toBe(3900);
    expect(courierFeeCents(50)).toBe(6000);
    expect(distanceBonusCents(2800)).toBe(800);
    expect(distanceBonusCents(1500)).toBe(0);
  });

  it("takes longer on foot than by car, and never under three minutes", () => {
    expect(tripMinutes(2, "walking")).toBeGreaterThan(tripMinutes(2, "car"));
    expect(tripMinutes(0.1, "car")).toBe(3);
  });
});

describe("becoming a courier", () => {
  it("needs the ID and the selfie before it can be sent in, then clears one check at a time", () => {
    let courier = courierReduce(emptyCourierState(), { type: "courierStart" });
    courier = courierReduce(courier, { type: "courierSubmitVerification" });
    expect(courier.status).toBe("setup");
    courier = courierReduce(courier, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" });
    courier = courierReduce(courier, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" });
    courier = courierReduce(courier, { type: "courierSubmitVerification" });
    expect(courier.status).toBe("pending");
    expect(courier.documents.map((doc) => doc.status)).toEqual(["in-review", "in-review", "missing", "in-review"]);
    for (let n = 0; n < 2; n += 1) courier = courierReduce(courier, { type: "courierReviewTick" });
    expect(courier.status).toBe("pending");
    courier = courierReduce(courier, { type: "courierReviewTick" });
    expect(courier.status).toBe("approved");
  });

  it("cannot go online until approved, and then is shown labelled demo jobs with countdowns", () => {
    const early = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { online: true, type: "courierSetOnline" });
    expect(early.courier.online).toBe(false);
    const state = onlineCourier();
    expect(state.courier.online).toBe(true);
    const offers = state.courier.jobs.filter((job) => job.status === "offered");
    expect(offers.length).toBe(3);
    expect(offers.every((job) => job.source === "demo" && job.demoCodes && job.expiresAt)).toBe(true);
    // going online again does not add more
    expect(run(state, { online: false, type: "courierSetOnline" }, { online: true, type: "courierSetOnline" }).courier.jobs).toHaveLength(3);
  });
});

describe("a demo job from offer to cash", () => {
  it("is collected with the seller's code and delivered with the buyer's, and pays the courier", () => {
    let state = onlineCourier();
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" });
    // the wrong code is refused, the right one lets it go
    expect(run(state, { code: "0000", id: job.id, type: "courierConfirmPickup" }).courier.jobs[0]!.status).toBe("accepted");
    state = run(state, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" });
    expect(state.courier.jobs.find((item) => item.id === job.id)!.status).toBe("on-the-way");
    state = run(state, { id: job.id, type: "courierArrive" });
    expect(run(state, { code: "0000", id: job.id, proof: "otp", type: "courierConfirmDelivery" }).courier.jobs.find((item) => item.id === job.id)!.status).toBe("arrived");
    state = run(state, { code: job.deliveryCode, id: job.id, note: "Handed over at the gate", proof: "otp", type: "courierConfirmDelivery" });
    const done = state.courier.jobs.find((item) => item.id === job.id)!;
    expect(done).toMatchObject({ note: "Handed over at the gate", proof: "otp", status: "delivered" });
    expect(balanceCents(state.courier)).toBe(job.payoutCents);
    expect(todayStats(state.courier)).toMatchObject({ cents: job.payoutCents, done: 1 });
    expect(earningsFor(state.courier, "week").total).toBe(job.payoutCents);
  });

  it("only takes a photo as proof when the buyer allowed leave-at-door, and a signature only once it is drawn", () => {
    let state = onlineCourier();
    const job = state.courier.jobs.find((item) => !item.leaveAtDoor)!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" });
    expect(run(state, { id: job.id, photoUri: "file:///door.jpg", proof: "photo", type: "courierConfirmDelivery" }).courier.jobs.find((item) => item.id === job.id)!.status).toBe("arrived");
    expect(run(state, { id: job.id, proof: "signature", type: "courierConfirmDelivery" }).courier.jobs.find((item) => item.id === job.id)!.status).toBe("arrived");
    expect(run(state, { id: job.id, proof: "signature", signatureDone: true, type: "courierConfirmDelivery" }).courier.jobs.find((item) => item.id === job.id)!.status).toBe("delivered");
  });

  it("makes an offer run out, and declining or accepting counts towards the acceptance rate", () => {
    let state = onlineCourier();
    const [first, second, third] = state.courier.jobs;
    state = run(state, { id: first!.id, type: "courierAcceptJob" }, { id: second!.id, type: "courierDeclineJob" });
    const late: CourierAction = { type: "courierExpireJobs" };
    const later = courierReduce(state.courier, late, { now: Date.now() + 10 * 60_000 });
    expect(later.jobs.find((item) => item.id === third!.id)!.status).toBe("expired");
    const stats = performance({ ...later });
    expect(stats.acceptance).toBe(33);
  });

  it("only lets a failure be reported after the wait at the door, and the second failed try sends the parcel back", () => {
    let state = onlineCourier();
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" });
    // too early: the wait has not passed (the courier reducer takes the wait from its context)
    expect(courierReduce(state.courier, { id: job.id, reason: "unreachable", type: "courierFailAttempt" }, { waitMs: WAIT_MS }).jobs[0]!.status).toBe("arrived");
    state = run(state, { id: job.id, reason: "unsafe", type: "courierFailAttempt" });
    expect(state.courier.jobs.find((item) => item.id === job.id)).toMatchObject({ status: "on-the-way" });
    state = run(state, { id: job.id, type: "courierArrive" }, { id: job.id, reason: "refused", type: "courierFailAttempt" });
    expect(state.courier.jobs.find((item) => item.id === job.id)).toMatchObject({ attempts: [expect.anything(), expect.anything()], status: "returning" });
    // the trip back is paid once the seller has the parcel
    const back = job.returnCode;
    state = run(state, { code: "0000", id: job.id, type: "courierConfirmReturn" });
    expect(state.courier.jobs.find((item) => item.id === job.id)!.status).toBe("returning");
    state = run(state, { code: back, id: job.id, type: "courierConfirmReturn" });
    expect(state.courier.jobs.find((item) => item.id === job.id)!.status).toBe("returned");
    expect(balanceCents(state.courier)).toBe(job.payoutCents);
  });

  it("cashes out what is available once there is enough, and not before", () => {
    let state = onlineCourier();
    state = run(state, { bank: "FNB 1234", type: "courierSetBank" });
    expect(run(state, { type: "courierCashOut" }).courier.payouts).toHaveLength(0);
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { code: job.deliveryCode, id: job.id, proof: "otp", type: "courierConfirmDelivery" }, { type: "courierCashOut" });
    expect(state.courier.payouts[0]).toMatchObject({ cents: job.payoutCents, status: "paid" });
    expect(balanceCents(state.courier)).toBe(0);
  });
});

describe("a real order from a buyer", () => {
  it("becomes a job when the seller marks it ready, with the seller's own code and the buyer's own code", () => {
    const state = readyDelivery();
    const sellerOrder = state.seller.orders.find((item) => item.buyerOrderId)!;
    const job = state.courier.jobs.find((item) => item.source === "order")!;
    expect(job).toMatchObject({ buyerOrderId: sellerOrder.buyerOrderId, pickupCode: sellerOrder.courierCode, sellerOrderId: sellerOrder.id, source: "order", status: "offered" });
    expect(job.demoCodes).toBe(false);
    expect(job.deliveryCode).toBe(deliveryCodeFor(sellerOrder.buyerOrderId!));
    expect(job.returnCode).toBe(returnCodeFor(sellerOrder.buyerOrderId!));
    expect(job.items.map((item) => item.title)).toContain("Calculus Textbook");
    // no demo courier takes it: the real courier does
    expect(state.seller.orders.find((item) => item.id === sellerOrder.id)!.courier).toBeUndefined();
  });

  it("carries the whole delivery across: courier taken, collected, delivered, each told to the seller and the buyer", () => {
    let state = readyDelivery();
    const job = state.courier.jobs.find((item) => item.source === "order")!;
    const sellerOrder = state.seller.orders.find((item) => item.id === job.sellerOrderId)!;
    state = run(state, { id: job.id, type: "courierAcceptJob" });
    expect(state.seller.orders.find((item) => item.id === sellerOrder.id)!.courier).toMatchObject({ name: "Vumisa M.", vehicle: "Bicycle" });
    expect(state.orders.find((item) => item.id === job.buyerOrderId)!.courier).toMatchObject({ name: "Vumisa M.", phone: "0825735164" });
    state = run(state, { code: sellerOrder.courierCode, id: job.id, type: "courierConfirmPickup" });
    expect(state.orders.find((item) => item.id === job.buyerOrderId)!.status).toBe("on-the-way");
    expect(state.seller.orders.find((item) => item.id === sellerOrder.id)!.status).toBe("done");
    expect(state.seller.ledger[0]).toMatchObject({ kind: "sale" });
    state = run(state, { id: job.id, type: "courierArrive" });
    expect(state.notifications[0]!.title).toBe("Your courier has arrived");
    expect(state.notifications[0]!.body).toContain(job.deliveryCode);
    state = run(state, { code: job.deliveryCode, id: job.id, proof: "otp", type: "courierConfirmDelivery" });
    expect(state.orders.find((item) => item.id === job.buyerOrderId)!.status).toBe("delivered");
    // the buyer rates the courier, which counts towards the courier's score and adds the tip
    state = run(state, { comment: "Fast and polite", orderId: job.buyerOrderId!, rating: 5, tipCents: 1000, type: "rateCourier" });
    const rated = state.courier.jobs.find((item) => item.id === job.id)!;
    expect(rated).toMatchObject({ feedback: "Fast and polite", rating: 5, tipCents: 1000 });
    expect(balanceCents(state.courier)).toBe(job.payoutCents + 1000);
    expect(performance(state.courier).rating).toBe(5);
  });

  it("brings a failed parcel back: the seller types the courier's code, the buyer is refunded the items and the delivery fee is kept", () => {
    let state = readyDelivery();
    const job = state.courier.jobs.find((item) => item.source === "order")!;
    const sellerOrder = state.seller.orders.find((item) => item.id === job.sellerOrderId)!;
    const buyerOrder = state.orders.find((item) => item.id === job.buyerOrderId)!;
    const stockBefore = state.seller.listings.find((item) => item.id === "sl-calculus")!.onHand;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: sellerOrder.courierCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { id: job.id, reason: "address", type: "courierFailAttempt" }, { id: job.id, type: "courierArrive" }, { id: job.id, reason: "refused", type: "courierFailAttempt" });
    expect(state.courier.jobs.find((item) => item.id === job.id)!.status).toBe("returning");
    expect(state.seller.orders.find((item) => item.id === sellerOrder.id)!.courierReturn).toEqual({ code: job.returnCode, state: "coming" });
    const wallet = state.wallet.balanceCents;
    // a wrong code does nothing
    expect(run(state, { code: "0000", id: sellerOrder.id, type: "sellerConfirmReturn" }).orders.find((item) => item.id === buyerOrder.id)!.status).toBe("on-the-way");
    state = run(state, { code: job.returnCode, id: sellerOrder.id, type: "sellerConfirmReturn" });
    expect(state.courier.jobs.find((item) => item.id === job.id)!.status).toBe("returned");
    expect(state.orders.find((item) => item.id === buyerOrder.id)!.status).toBe("cancelled");
    expect(state.wallet.balanceCents).toBe(wallet + buyerOrder.subtotalCents - buyerOrder.discountCents);
    expect(state.seller.listings.find((item) => item.id === "sl-calculus")!.onHand).toBe(stockBefore + 1);
    expect(state.seller.ledger[0]).toMatchObject({ kind: "refund" });
    expect(balanceCents(state.courier)).toBe(job.payoutCents);
  });

  it("lets the courier message the buyer, in the thread the buyer sees under the order", () => {
    let state = readyDelivery();
    const job = state.courier.jobs.find((item) => item.source === "order")!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { body: "I am five minutes away", id: job.id, type: "courierSendMessage" });
    const thread = state.conversations.find((item) => item.id === `courier-${job.buyerOrderId}`)!;
    expect(thread.messages.at(-1)).toMatchObject({ body: "I am five minutes away", fromMe: false });
    expect(thread.unread).toBe(true);
  });

  it("falls back to the demo courier when nobody is approved on this phone", () => {
    const state = readyDelivery();
    const without = { ...state, courier: emptyCourierState() };
    const next = run(without, { id: without.seller.orders.find((item) => item.buyerOrderId)!.id, type: "sellerAssignCourier" });
    expect(next.seller.orders.find((item) => item.buyerOrderId)!.courier?.name).toBe("Tebogo K.");
  });
});
