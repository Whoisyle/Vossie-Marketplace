import { registerOwnStore } from "@/data/repository";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { courierFeeCents, distanceBonusCents, tripMinutes } from "./pay";
import { courierBadges, courierLevel, demand, earningsFor, goalProgress, hiddenOffers, performance, statements, streak, todayStats, visibleOffers } from "./selectors";
import { applyPreset, defaultSchedule, receiving, workStatus } from "./schedule";
import { balanceCents, courierReduce, daysLeft, emptyCourierState, licenceProblem, needsLicence, parseExpiry, vehicleLabel, WAIT_MS, zonesFor } from "./state";
import type { CourierAction, CourierState } from "./types";
import { expiryProblem, normalisePlate, validLicenceNumber } from "./validate";
import { COLOURS, makesFor, modelsFor } from "./vehicles";
import { deliveryCodeFor, returnCodeFor } from "./jobs";

/** A licence date a little over a year away, so it is valid and inside the five years a licence lasts. */
const SOON_ISO = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

/** A student who has been through the courier setup and been approved, and is online. */
function onlineCourier(options: { history?: boolean } = {}): DemoState {
  let state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164", vehicle: "bicycle" }, type: "courierSetProfile" });
  state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" }, { type: "courierSubmitVerification" });
  for (let n = 0; n < 4; n += 1) state = run(state, { type: "courierReviewTick" });
  // approval gives an experienced demo courier's past; most tests want a brand new courier, so it is cleared unless asked for
  if (!options.history) state = { ...state, courier: { ...state.courier, earnings: [], jobs: [], offersAccepted: 0, offersSeen: 0, payouts: [] } };
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

  it("withdraws to the saved bank account once there is enough, and not before or without one", () => {
    let state = onlineCourier();
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { code: job.deliveryCode, id: job.id, proof: "otp", type: "courierConfirmDelivery" });
    // a few rand is under the smallest withdrawal, and there is no bank account yet
    expect(run(state, { amountCents: job.payoutCents, type: "courierWithdraw" }).courier.payouts).toHaveLength(0);
    state = run(state, { bank: { accountHolder: "Vumisa Malindi", bankName: "FNB", last4: "1234" }, type: "courierSaveBank" });
    expect(run(state, { amountCents: job.payoutCents, type: "courierWithdraw" }).courier.payouts).toHaveLength(0);
    // with enough earned, the whole amount can go and the balance drops
    const rich = { ...state, courier: { ...state.courier, earnings: [{ at: new Date().toISOString(), cents: 30000, id: "e1", jobId: job.id, kind: "tip" as const, number: job.number }, ...state.courier.earnings] } };
    const paid = run(rich, { amountCents: 20000, type: "courierWithdraw" });
    expect(paid.courier.payouts[0]).toMatchObject({ cents: 20000, label: "Payout to FNB", status: "paid" });
    expect(balanceCents(paid.courier)).toBe(balanceCents(rich.courier) - 20000);
    // more than the balance is refused
    expect(run(rich, { amountCents: 99999999, type: "courierWithdraw" }).courier.payouts).toHaveLength(0);
  });
});

describe("a car or a scooter", () => {
  function motor(vehicle: "car" | "scooter") {
    let state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164", vehicle }, type: "courierSetProfile" });
    state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" });
    return state;
  }

  it("cannot be sent for review without the licence, its date and the vehicle details", () => {
    let state = motor("car");
    expect(run(state, { type: "courierSubmitVerification" }).courier.status).toBe("setup");
    state = run(state, { fileName: "licence.jpg", kind: "licence", type: "courierUploadDocument" });
    // still no expiry date or vehicle
    expect(run(state, { type: "courierSubmitVerification" }).courier.status).toBe("setup");
    state = run(state, { expiresAt: SOON_ISO, type: "courierSetLicenceExpiry" });
    expect(run(state, { type: "courierSubmitVerification" }).courier.status).toBe("setup");
    state = run(state, { patch: { vehicleInfo: { colour: "White", make: "Toyota", model: "Corolla", plate: "ca 123 456" } }, type: "courierSetProfile" });
    // still no licence number
    expect(run(state, { type: "courierSubmitVerification" }).courier.status).toBe("setup");
    state = run(state, { patch: { licenceNumber: "ZA12345678AB" }, type: "courierSetProfile" });
    expect(run(state, { type: "courierSubmitVerification" }).courier.status).toBe("pending");
    expect(licenceProblem(state.courier, Date.now())).toBeNull();
    expect(vehicleLabel({ ...state.courier.profile, vehicleInfo: { ...state.courier.profile.vehicleInfo, plate: normalisePlate(state.courier.profile.vehicleInfo.plate)! } })).toBe("White Toyota Corolla · CA 123-456");
  });

  it("is not asked for a licence on a bicycle or on foot, and a licence that has expired is refused", () => {
    const bike = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { type: "courierStart" });
    expect(needsLicence("bicycle")).toBe(false);
    expect(licenceProblem(bike.courier, Date.now())).toBeNull();
    let state = motor("scooter");
    state = run(state, { expiresAt: SOON_ISO, fileName: "licence.jpg", kind: "licence", type: "courierUploadDocument" }, { patch: { vehicleInfo: { colour: "Red", make: "Vespa", model: "Primavera", plate: "ABC 123 GP" } }, type: "courierSetProfile" });
    expect(daysLeft("2099-12-31", Date.now())).toBeGreaterThan(1000);
    expect(licenceProblem(state.courier, new Date("2100-02-01").getTime())).toBe("expired");
    expect(parseExpiry("2026-02-30")).toBeNull();
  });

  it("is told when the licence is about to run out, once, and cannot go online after it has", () => {
    let courier = courierReduce(emptyCourierState(), { patch: { vehicle: "car", vehicleInfo: { colour: "White", make: "Toyota", model: "Corolla", plate: "CA 123-456" } }, type: "courierSetProfile" });
    courier = courierReduce(courier, { fileName: "l.jpg", kind: "licence", type: "courierUploadDocument", expiresAt: "2026-11-10" });
    courier = { ...courier, status: "approved" };
    const near = new Date("2026-10-27T10:00:00").getTime();
    const first = courierReduce(courier, { type: "courierCheckDocuments" }, { now: near });
    expect(first.alerts[0]).toMatchObject({ kind: "document", title: "Document expiring soon" });
    expect(first.alerts[0]!.body).toContain("Update your licence in 14 days");
    expect(courierReduce(first, { type: "courierCheckDocuments" }, { now: near })).toBe(first);
    const over = new Date("2026-11-11T10:00:00").getTime();
    const expired = courierReduce({ ...first, online: true }, { type: "courierCheckDocuments" }, { now: over });
    expect(expired.alerts[0]!.title).toBe("Your licence has expired");
    expect(expired.online).toBe(false);
    expect(courierReduce(expired, { online: true, type: "courierSetOnline" }, { now: over }).online).toBe(false);
  });
});

describe("hours, breaks and finishing for today", () => {
  const monday10 = new Date("2026-10-19T10:00:00");
  const monday20 = new Date("2026-10-19T20:00:00");
  const sunday = new Date("2026-10-18T10:00:00");

  it("says whether the courier is on duty from the week they set", () => {
    const schedule = defaultSchedule();
    expect(workStatus(schedule, monday10)).toMatchObject({ reason: "hours", working: true });
    expect(workStatus(schedule, monday20)).toMatchObject({ reason: "after", working: false });
    expect(workStatus(schedule, sunday)).toMatchObject({ reason: "off-day", working: false });
    expect(applyPreset(schedule, "every-day").hours.sun.open).toBe(true);
    expect(receiving(schedule, true, monday10)).toBe(true);
    expect(receiving(schedule, true, monday20)).toBe(false);
    expect(receiving(schedule, false, monday10)).toBe(false);
    expect(receiving({ ...schedule, autoOffline: false }, true, monday20)).toBe(true);
  });

  it("lets the courier start outside their hours on purpose, and that day is then not cut off", () => {
    let courier: CourierState = { ...emptyCourierState(), status: "approved" };
    courier = courierReduce(courier, { online: true, type: "courierSetOnline" }, { now: monday20.getTime() });
    expect(courier.online).toBe(true);
    expect(courier.schedule.overrideOn).toBe("2026-10-19");
    expect(receiving(courier.schedule, true, monday20)).toBe(true);
    expect(receiving(courier.schedule, true, new Date("2026-10-20T20:00:00"))).toBe(false);
  });

  it("pauses offers on a break and brings them back, and stops them for the day when the courier finishes", () => {
    let courier: CourierState = { ...emptyCourierState(), online: true, status: "approved" };
    courier = courierReduce(courier, { minutes: 30, type: "courierStartBreak" }, { now: monday10.getTime() });
    expect(workStatus(courier.schedule, monday10)).toMatchObject({ reason: "break" });
    expect(workStatus(courier.schedule, monday10).label).toContain("break until 10:30");
    expect(receiving(courier.schedule, courier.online, monday10)).toBe(false);
    courier = courierReduce(courier, { type: "courierEndBreak" }, { now: monday10.getTime() + 60_000 });
    expect(receiving(courier.schedule, courier.online, new Date(monday10.getTime() + 60_000))).toBe(true);
    courier = courierReduce(courier, { type: "courierFinishToday" }, { now: monday10.getTime() });
    expect(courier.online).toBe(false);
    expect(workStatus(courier.schedule, monday10)).toMatchObject({ reason: "finished" });
    // tomorrow the day is clear again
    expect(workStatus(courier.schedule, new Date("2026-10-20T10:00:00")).reason).toBe("hours");
  });

  it("goes offline when the hours end, with a notice", () => {
    const courier = courierReduce({ ...emptyCourierState(), online: true, status: "approved" }, { type: "courierAutoOffline" }, { now: monday20.getTime() });
    expect(courier.online).toBe(false);
    expect(courier.alerts[0]).toMatchObject({ kind: "system", title: "You are offline" });
  });
});

describe("zones differ on every campus and decide which offers are shown", () => {
  it("starts a courier on each campus with that campus's own places", () => {
    const potch = zonesFor("potchefstroom").map((zone) => zone.name);
    const midrand = zonesFor("midrand-head-office").map((zone) => zone.name);
    expect(potch).toContain("Mooirivier Mall");
    expect(midrand).toContain("Mall of Africa");
    expect(potch).not.toContain("Mall of Africa");
    expect(zonesFor("durban-umhlanga").map((zone) => zone.name)).toContain("Umhlanga Promenade");
    // changing campus changes the zones
    const moved = courierReduce(emptyCourierState(), { patch: { campusId: "bloemfontein" }, type: "courierSetProfile" });
    expect(moved.zones.map((zone) => zone.name)).toContain("Mimosa Mall");
  });

  it("shows only offers picked up inside a zone that is on and within the longest trip, and counts the rest as hidden", () => {
    let state = onlineCourier();
    expect(visibleOffers(state.courier).length).toBe(3);
    // narrow the longest trip: the long ones go
    state = run(state, { km: 1, type: "courierSetMaxKm" });
    const near = visibleOffers(state.courier);
    expect(near.every((job) => job.distanceKm <= 1)).toBe(true);
    expect(hiddenOffers(state.courier).length).toBe(3 - near.length);
    // all zones off: nothing is shown
    state = run(state, { km: 10, type: "courierSetMaxKm" });
    for (const zone of state.courier.zones.filter((item) => item.on)) state = run(state, { id: zone.id, type: "courierToggleZone" });
    expect(visibleOffers(state.courier)).toHaveLength(0);
    expect(hiddenOffers(state.courier)).toHaveLength(3);
  });

  it("lets a courier add a zone by place and remove it, but not remove the campus's own", () => {
    let state = onlineCourier();
    state = run(state, { detail: "Potchefstroom", latitude: -26.7, longitude: 27.1, name: "Ikageng", type: "courierAddZone" });
    const added = state.courier.zones.find((zone) => zone.name === "Ikageng")!;
    expect(added).toMatchObject({ custom: true, on: true });
    expect(run(state, { detail: "x", latitude: 0, longitude: 0, name: "ikageng", type: "courierAddZone" }).courier.zones.filter((zone) => zone.name.toLowerCase() === "ikageng")).toHaveLength(1);
    expect(run(state, { id: "campus", type: "courierRemoveZone" }).courier.zones.some((zone) => zone.id === "campus")).toBe(true);
    expect(run(state, { id: added.id, type: "courierRemoveZone" }).courier.zones.some((zone) => zone.id === added.id)).toBe(false);
  });
});

describe("level and badges", () => {
  it("starts at New with nothing earned, and rises from real deliveries", () => {
    const fresh = onlineCourier().courier;
    expect(courierLevel(fresh)).toMatchObject({ key: "new", next: "Rider" });
    expect(courierBadges(fresh).every((badge) => !badge.earned)).toBe(true);
    let state = onlineCourier();
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { code: job.deliveryCode, id: job.id, proof: "otp", type: "courierConfirmDelivery" }, { feedback: "Great", id: job.id, rating: 5, tipCents: 500, type: "courierRated" } as never);
    expect(courierLevel(state.courier).key).toBe("rider");
    expect(courierBadges(state.courier).filter((badge) => badge.earned).map((badge) => badge.key)).toEqual(expect.arrayContaining(["first", "five", "tip"]));
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

describe("what a courier types has to be real", () => {
  it("accepts the number plates on South African roads, tidies them, and refuses the rest", () => {
    expect(normalisePlate("ca 123 456")).toBe("CA 123-456");
    expect(normalisePlate("CAA 12345")).toBe("CAA 12345");
    expect(normalisePlate("abc123gp")).toBe("ABC 123 GP");
    expect(normalisePlate("BX 12 KL GP")).toBe("BX 12 KL GP");
    expect(normalisePlate("nd 123-456")).toBe("ND 123-456");
    expect(normalisePlate("hello")).toBeNull();
    expect(normalisePlate("12")).toBeNull();
    expect(normalisePlate("")).toBeNull();
  });

  it("only takes licence numbers of the right length and licences that last at most five years", () => {
    expect(validLicenceNumber("ZA12345678AB")).toBe(true);
    expect(validLicenceNumber("123")).toBe(false);
    expect(validLicenceNumber("not a licence!!")).toBe(false);
    const now = new Date("2026-10-21").getTime();
    expect(expiryProblem("2026-10-01", now)).toBe("past");
    expect(expiryProblem("2031-12-31", now)).toBe("far");
    expect(expiryProblem("2028-05-01", now)).toBeNull();
  });

  it("only takes a make and model that exist, and a colour from the list", () => {
    expect(makesFor("car")).toContain("Toyota");
    expect(makesFor("scooter")).toContain("Vespa");
    expect(makesFor("scooter")).not.toContain("Toyota");
    expect(modelsFor("car", "Toyota")).toContain("Corolla");
    expect(modelsFor("car", "Toyota")).not.toContain("Primavera");
    expect(COLOURS).toContain("White");
  });
});

describe("an experienced demo courier", () => {
  it("has a month of deliveries, a high rating, tips, payouts, a saved bank and the level Trusted as soon as they are approved", () => {
    const { courier } = onlineCourier({ history: true });
    expect(courier.jobs.filter((job) => job.status === "delivered")).toHaveLength(86);
    expect(courier.jobs.some((job) => job.status === "declined")).toBe(true);
    expect(courier.jobs.some((job) => job.status === "cancelled")).toBe(true);
    const stats = performance(courier);
    expect(stats.rating).toBeGreaterThanOrEqual(4.8);
    expect(stats.deliveries).toBe(86);
    expect(stats.onTime).toBeGreaterThanOrEqual(95);
    expect(courierLevel(courier).key).toBe("trusted");
    expect(courierBadges(courier).filter((badge) => badge.earned).length).toBeGreaterThanOrEqual(4);
    expect(courier.bank?.bankName).toBe("FNB");
    expect(courier.payouts.length).toBeGreaterThanOrEqual(3);
    expect(courier.earnings.some((entry) => entry.kind === "tip")).toBe(true);
    // the demo offers still come first when they go online
    expect(courier.jobs[0]!.source).toBe("demo");
    expect(courier.jobs.filter((job) => job.status === "offered")).toHaveLength(3);
  });
});

describe("weekly goal, streak, statements and busy areas", () => {
  it("measures the week against the goal, celebrates once, and counts days in a row", () => {
    let state = onlineCourier();
    state = run(state, { type: "courierSetGoal", weeklyCents: 5000 });
    expect(goalProgress(state.courier)).toMatchObject({ earnedCents: 0, reached: false, targetCents: 5000 });
    const job = state.courier.jobs[0]!;
    state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { code: job.deliveryCode, id: job.id, proof: "otp", type: "courierConfirmDelivery" });
    expect(goalProgress(state.courier)!.earnedCents).toBe(job.payoutCents);
    expect(streak(state.courier).current).toBe(1);
    // a goal the earnings pass is reached, once
    const low = run(onlineCourier(), { type: "courierSetGoal", weeklyCents: 5000 });
    const rich = { ...low, courier: { ...low.courier, earnings: [{ at: new Date().toISOString(), cents: 9000, id: "e", jobId: "j", kind: "tip" as const, number: "#VM-1" }] } };
    const j = rich.courier.jobs[0]!;
    const done = run(rich, { id: j.id, type: "courierAcceptJob" }, { code: j.pickupCode, id: j.id, type: "courierConfirmPickup" }, { id: j.id, type: "courierArrive" }, { code: j.deliveryCode, id: j.id, proof: "otp", type: "courierConfirmDelivery" });
    expect(done.courier.alerts.filter((alert) => alert.title === "Weekly goal reached")).toHaveLength(1);
  });

  it("writes weekly and monthly statements from what was earned", () => {
    const { courier } = onlineCourier({ history: true });
    const weeks = statements(courier, "week");
    const months = statements(courier, "month");
    expect(weeks.length).toBeGreaterThanOrEqual(3);
    expect(months.length).toBeGreaterThanOrEqual(1);
    expect(weeks[0]!.earnedCents).toBeGreaterThan(0);
    expect(weeks.reduce((sum, week) => sum + week.deliveries, 0)).toBeGreaterThan(40);
  });

  it("shows how busy the zones are, with a bonus where it is high", () => {
    const { courier } = onlineCourier();
    const lunch = demand(courier, new Date("2026-10-21T12:30:00"));
    const night = demand(courier, new Date("2026-10-21T02:00:00"));
    expect(lunch.length).toBe(courier.zones.filter((zone) => zone.on).length);
    expect(lunch.some((area) => area.level === "high" && area.bonusCents > 0)).toBe(true);
    expect(night.every((area) => area.level !== "high")).toBe(true);
  });

  it("offers one demo job with a busy-area bonus on top of the pay", () => {
    const { courier } = onlineCourier();
    const boosted = courier.jobs.filter((job) => job.boostCents);
    expect(boosted).toHaveLength(1);
    expect(boosted[0]!.payoutCents).toBeGreaterThanOrEqual(boosted[0]!.boostCents!);
  });
});
