import { getCampusName } from "@/data/repository";
import { MIN_WITHDRAW_CENTS } from "@/data/wallet";

import { fourDigits as codeDigits } from "./codes";
import { demoHistory } from "./jobs";
import { expiryProblem, normalisePlate, validLicenceNumber } from "./validate";
import { COLOURS, makesFor, modelsFor } from "./vehicles";

import { defaultSchedule, receiving, withinHours, zoneSeeds } from "./schedule";
import { dateKey, weekKey } from "@/seller/schedule";

import { ACTIVE_JOB, type CourierAction, type CourierAlert, type CourierDoc, type CourierDocKind, type CourierJob, type CourierProfile, type CourierState, type EarningEntry, type FailedAttempt, type Vehicle, type VehicleInfo } from "./types";

/** How long an offer stays on the Jobs list while the courier is online. */
export const OFFER_MS = 5 * 60_000;
/** How long the courier has to wait at a door before reporting the buyer unreachable. The demo shortens this; the real one is 10 minutes. */
export const WAIT_MS = 10 * 60_000;
export const DEMO_WAIT_MS = 20_000;
/** The least that can be withdrawn at once. */
export const MIN_CASH_OUT_CENTS = MIN_WITHDRAW_CENTS;
/** Two tries at the door, then the parcel goes back. */
export const MAX_ATTEMPTS = 2;

let counter = 0;
export function courierId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Four digits that are the same for the same seed, so a code can be shown in two places. */
export const fourDigits = codeDigits;

const DOC_ORDER: CourierDocKind[] = ["id", "selfie", "licence", "background"];

export function emptyDocuments(): CourierDoc[] {
  return DOC_ORDER.map((kind) => ({ kind, status: "missing" as const }));
}

/** The zones a courier on this campus starts with: the campus and the town centre on, the shopping centre off. They differ on every campus. */
export function zonesFor(campusId: CourierState["profile"]["campusId"]): CourierState["zones"] {
  const name = getCampusName(campusId).replace(/\s*\(.*\)/, "");
  return zoneSeeds(campusId, name).map((seed, index) => ({ detail: seed.detail, id: seed.id, latitude: seed.point.latitude, longitude: seed.point.longitude, name: seed.name, on: seed.detail !== "Shopping centre" || index === 0 }));
}

export function emptyCourierState(): CourierState {
  return {
    alerts: [],
    approvalSeen: false,
    cases: [],
    documents: emptyDocuments(),
    earnings: [],
    goal: { weeklyCents: null },
    maxKm: 5,
    schedule: defaultSchedule(),
    jobAlerts: true,
    jobs: [],
    offersAccepted: 0,
    offersSeen: 0,
    online: false,
    payouts: [],
    profile: { campusId: "potchefstroom", fullName: "", phone: "", vehicle: "bicycle", vehicleInfo: { colour: "", make: "", model: "", plate: "" }, licenceNumber: "" },
    status: "none",
    zones: zonesFor("potchefstroom"),
  };
}

export const createCourierState = emptyCourierState;

/** The courier's money still to be paid out: everything earned less what was already cashed out. */
export function balanceCents(state: Pick<CourierState, "earnings" | "payouts">): number {
  const earned = state.earnings.reduce((sum, entry) => sum + entry.cents, 0);
  const paid = state.payouts.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.cents, 0);
  return earned - paid;
}

/** A car or a scooter needs a driving licence and vehicle details; a bicycle or walking does not. */
export function needsLicence(vehicle: Vehicle): boolean {
  return vehicle === "car" || vehicle === "scooter";
}

/** Whether the vehicle details are real: a make and model from the lists, a colour from the list and a number plate in a South African form. */
export function vehicleComplete(info: VehicleInfo, vehicle: Vehicle = "car"): boolean {
  return makesFor(vehicle).includes(info.make) && modelsFor(vehicle, info.make).includes(info.model) && (COLOURS as readonly string[]).includes(info.colour) && normalisePlate(info.plate) !== null;
}

/** "2027-03-01" to a date at the start of that day, or null when it is not a real date. */
export function parseExpiry(value: string | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : null;
}

/** Whole days from now until a licence runs out (zero or less once it has). */
export function daysLeft(expiresAt: string | undefined, now: number): number | null {
  const date = parseExpiry(expiresAt);
  return date ? Math.ceil((date.getTime() - now) / 86_400_000) : null;
}

export type LicenceProblem = "missing" | "details" | "expired";

/** The things a courier must have right before they can be sent for review. Null when everything checks out. */
export function setupProblem(state: Pick<CourierState, "documents" | "profile">, now: number): string | null {
  if (needsLicence(state.profile.vehicle)) {
    if (!vehicleComplete(state.profile.vehicleInfo, state.profile.vehicle)) return "Choose the make, model and colour and enter a South African number plate.";
    if (!validLicenceNumber(state.profile.licenceNumber)) return "Enter your driving licence number as printed on the card.";
    const licence = state.documents.find((doc) => doc.kind === "licence");
    if (!licence || licence.status === "missing") return "Add your driving licence.";
    const problem = expiryProblem(licence.expiresAt, now);
    if (problem === "past") return "The licence expiry date must be in the future.";
    if (problem === "far") return "A licence lasts five years, so that date is too far away.";
  }
  return null;
}

/** Why a courier on a car or scooter cannot deliver yet: no licence, no vehicle details, or a licence that has run out. Null when all is well. */
export function licenceProblem(state: Pick<CourierState, "documents" | "profile">, now: number): LicenceProblem | null {
  if (!needsLicence(state.profile.vehicle)) return null;
  const licence = state.documents.find((doc) => doc.kind === "licence");
  if (!licence || licence.status === "missing" || !licence.expiresAt) return "missing";
  if (!vehicleComplete(state.profile.vehicleInfo, state.profile.vehicle)) return "details";
  const left = daysLeft(licence.expiresAt, now);
  return left === null || left <= 0 ? "expired" : null;
}

/** The vehicle as the buyer sees it: "Bicycle", or "White Toyota Corolla · CA 123 456". */
export function vehicleLabel(profile: CourierProfile): string {
  if (!needsLicence(profile.vehicle)) return profile.vehicle === "walking" ? "On foot" : "Bicycle";
  const { colour, make, model, plate } = profile.vehicleInfo;
  return `${colour} ${make} ${model} · ${plate.toUpperCase()}`.replace(/\s+/g, " ").trim();
}

export function activeJobs(state: Pick<CourierState, "jobs">): CourierJob[] {
  return state.jobs.filter((job) => ACTIVE_JOB.includes(job.status));
}

export function openOffers(state: Pick<CourierState, "jobs">): CourierJob[] {
  return state.jobs.filter((job) => job.status === "offered");
}

function addAlert(state: CourierState, alert: Omit<CourierAlert, "createdAt" | "id" | "read">, now: number): CourierAlert[] {
  return [{ ...alert, createdAt: new Date(now).toISOString(), id: courierId("ca"), read: false }, ...state.alerts].slice(0, 60);
}

function patchJob(state: CourierState, id: string, patch: Partial<CourierJob>): CourierJob[] {
  return state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
}

/** After money comes in: if it took the week past the goal for the first time this week, say so once. */
function withGoal(state: CourierState, now: number): CourierState {
  const target = state.goal.weeklyCents;
  if (!target) return state;
  const week = weekKey(new Date(now));
  if (state.goalReachedWeek === week) return state;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const earned = state.earnings.filter((entry) => new Date(entry.at).getTime() >= monday.getTime()).reduce((sum, entry) => sum + entry.cents, 0);
  if (earned < target) return state;
  return { ...state, alerts: addAlert(state, { body: `You earned ${rand(earned)} this week and reached your goal of ${rand(target)}.`, href: "/courier/home", kind: "money", title: "Weekly goal reached" }, now), goalReachedWeek: week };
}

function earn(job: CourierJob, kind: EarningEntry["kind"], cents: number, now: number): EarningEntry {
  return { at: new Date(now).toISOString(), cents, id: courierId("ce"), jobId: job.id, kind, number: job.number };
}

/** Whether the courier has waited long enough at this door to report the buyer unreachable. */
export function waitedLongEnough(job: Pick<CourierJob, "waitingSince">, now: number, waitMs: number): boolean {
  return job.waitingSince !== undefined && now - new Date(job.waitingSince).getTime() >= waitMs;
}

export type CourierContext = { now?: number; waitMs?: number };

/**
 * The courier's side of the app: becoming a courier, going online, taking a job, collecting it with the seller's code,
 * delivering it with the buyer's code, failing it and bringing it back, and the money that follows. Pure; the demo store
 * calls it and `bridge.ts` carries what happens here across to the buyer and the seller.
 */
export function courierReduce(state: CourierState, action: CourierAction, ctx: CourierContext = {}): CourierState {
  const now = ctx.now ?? Date.now();
  const waitMs = ctx.waitMs ?? WAIT_MS;
  switch (action.type) {
    case "courierStart":
      return state.status === "none" ? { ...state, status: "setup" } : state;
    case "courierSetStatus":
      return { ...state, status: action.status };
    case "courierSetProfile": {
      const { vehicleInfo, ...rest } = action.patch;
      const profile = { ...state.profile, ...rest, vehicleInfo: { ...state.profile.vehicleInfo, ...vehicleInfo } };
      return { ...state, profile, zones: action.patch.campusId && action.patch.campusId !== state.profile.campusId ? zonesFor(action.patch.campusId) : state.zones };
    }
    case "courierUploadDocument":
      return { ...state, documents: state.documents.map((doc) => (doc.kind === action.kind ? { ...doc, expiresAt: action.expiresAt ?? doc.expiresAt, fileName: action.fileName, status: "uploaded", uri: action.uri } : doc)) };
    case "courierSetLicenceExpiry":
      return parseExpiry(action.expiresAt) ? { ...state, documents: state.documents.map((doc) => (doc.kind === "licence" ? { ...doc, expiresAt: action.expiresAt } : doc)) } : state;
    case "courierSubmitVerification": {
      const have = (kind: CourierDocKind) => state.documents.find((doc) => doc.kind === kind)?.status !== "missing";
      if (!have("id") || !have("selfie")) return state;
      // for a car or a scooter the licence, its number and date, and the vehicle's details
      if (setupProblem(state, now) !== null) return state;
      return {
        ...state,
        documents: state.documents.map((doc) => (doc.status === "uploaded" || doc.kind === "background" ? { ...doc, status: "in-review" } : doc)),
        rejectedReason: undefined,
        status: "pending",
      };
    }
    case "courierReviewTick": {
      // Vossie Operations in the demo: one check at a time, in order, until the last one clears and the courier is approved
      const next = state.documents.find((doc) => doc.status === "in-review");
      if (!next) return state;
      const documents = state.documents.map((doc) => (doc.kind === next.kind ? { ...doc, status: "verified" as const } : doc));
      const done = !documents.some((doc) => doc.status === "in-review");
      const approved = done && state.status === "pending";
      // an experienced demo courier's past is there the first time they are approved, so every page has something to show
      if (approved && state.jobs.length === 0 && state.earnings.length === 0) {
        const past = demoHistory(now, state.profile.campusId, state.profile.vehicle, state.profile.fullName);
        return { ...state, bank: state.bank ?? past.bank, documents, earnings: past.earnings, jobs: past.jobs, offersAccepted: past.jobs.filter((job) => job.status === "delivered").length, offersSeen: past.jobs.length, payouts: past.payouts, status: "approved" };
      }
      return { ...state, documents, status: approved ? "approved" : state.status };
    }
    case "courierApprovalSeen":
      return state.approvalSeen ? state : { ...state, approvalSeen: true };
    case "courierSetOnline": {
      if (state.status !== "approved") return state;
      // a licence that has run out stops a car or scooter courier taking offers until a new one is sent
      if (action.online && licenceProblem(state, now) === "expired") return state;
      if (!action.online) return { ...state, jobs: state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: null } : job)), online: false };
      // starting outside the working hours is allowed, on purpose: the day is not cut off, and a break or an early finish ends
      const date = new Date(now);
      const schedule = { ...state.schedule, breakUntil: undefined, finishedOn: state.schedule.finishedOn === dateKey(date) ? undefined : state.schedule.finishedOn, overrideOn: withinHours(state.schedule, date) ? state.schedule.overrideOn : dateKey(date) };
      // the countdowns start when the courier can see the offers
      const jobs = state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: new Date(now + OFFER_MS).toISOString() } : job));
      return { ...state, jobs, online: true, schedule };
    }
    case "courierSetSchedule":
      return { ...state, schedule: action.schedule };
    case "courierStartBreak": {
      if (!state.online) return state;
      return { ...state, jobs: state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: null } : job)), schedule: { ...state.schedule, breakUntil: new Date(now + Math.max(1, action.minutes) * 60_000).toISOString() } };
    }
    case "courierEndBreak": {
      if (!state.schedule.breakUntil) return state;
      const jobs = state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: new Date(now + OFFER_MS).toISOString() } : job));
      return { ...state, alerts: addAlert(state, { body: "Offers are coming through again.", kind: "system", title: "Break over" }, now), jobs, schedule: { ...state.schedule, breakUntil: undefined } };
    }
    case "courierFinishToday": {
      if (!state.online) return state;
      return { ...state, jobs: state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: null } : job)), online: false, schedule: { ...state.schedule, breakUntil: undefined, finishedOn: dateKey(new Date(now)) } };
    }
    case "courierAutoOffline": {
      if (!state.online) return state;
      return { ...state, alerts: addAlert(state, { body: "Your working hours ended, so you are offline. Go online to carry on.", kind: "system", title: "You are offline" }, now), jobs: state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: null } : job)), online: false };
    }
    case "courierToggleZone":
      return { ...state, zones: state.zones.map((zone) => (zone.id === action.id ? { ...zone, on: !zone.on } : zone)) };
    case "courierAddZone": {
      const name = action.name.trim();
      if (!name || state.zones.some((zone) => zone.name.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, zones: [...state.zones, { custom: true, detail: action.detail, id: courierId("zone"), latitude: action.latitude, longitude: action.longitude, name, on: true }] };
    }
    case "courierRemoveZone":
      return { ...state, zones: state.zones.filter((zone) => !(zone.id === action.id && zone.custom)) };
    case "courierSetMaxKm":
      return { ...state, maxKm: Math.max(1, Math.min(15, Math.round(action.km))) };
    case "courierSetGoal":
      return { ...state, goal: { weeklyCents: action.weeklyCents === null ? null : Math.max(5000, Math.round(action.weeklyCents)) }, goalReachedWeek: undefined };
    case "courierSetJobAlerts":
      return { ...state, jobAlerts: action.on };
    case "courierSaveBank":
      return { ...state, bank: action.bank };
    case "courierReceiveJob": {
      if (state.jobs.some((job) => job.id === action.job.id)) return state;
      const job: CourierJob = { ...action.job, expiresAt: receiving(state.schedule, state.online, new Date(now)) ? new Date(now + OFFER_MS).toISOString() : null };
      return {
        ...state,
        alerts: state.jobAlerts ? addAlert(state, { body: `${job.pickup.name} to ${job.dropoff.name} · ${rand(job.payoutCents)}`, href: `/courier/jobs/${job.id}`, kind: "offer", title: "New delivery offer" }, now) : state.alerts,
        jobs: [job, ...state.jobs],
        offersSeen: state.offersSeen + 1,
      };
    }
    case "courierExpireJobs": {
      let changed = false;
      const jobs = state.jobs.map((job) => {
        if (job.status !== "offered" || !job.expiresAt || new Date(job.expiresAt).getTime() > now) return job;
        changed = true;
        // a real parcel is waiting for a courier, so it is offered again; a demo job just runs out
        return job.source === "order" ? { ...job, expiresAt: new Date(now + OFFER_MS).toISOString() } : { ...job, expiresAt: null, status: "expired" as const };
      });
      return changed ? { ...state, jobs } : state;
    }
    case "courierAcceptJob": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "offered" || state.status !== "approved") return state;
      return {
        ...state,
        alerts: addAlert(state, { body: `Collect from ${job.pickup.name}, ${job.pickup.detail}.`, href: `/courier/active/${job.id}`, kind: "order", title: `You took ${job.number}` }, now),
        jobs: patchJob(state, action.id, { acceptedAt: new Date(now).toISOString(), expiresAt: null, status: "accepted" }),
        offersAccepted: state.offersAccepted + 1,
      };
    }
    case "courierDeclineJob": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "offered") return state;
      return { ...state, jobs: patchJob(state, action.id, { expiresAt: null, status: "declined" }) };
    }
    case "courierConfirmPickup": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "accepted" || action.code.trim() !== job.pickupCode) return state;
      return { ...state, jobs: patchJob(state, action.id, { pickedUpAt: new Date(now).toISOString(), pickupPhotoUri: action.photoUri, progress: 0, status: "on-the-way" }) };
    }
    case "courierProgress": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || (job.status !== "on-the-way" && job.status !== "returning") || action.progress <= job.progress) return state;
      return { ...state, jobs: patchJob(state, action.id, { progress: Math.min(1, action.progress) }) };
    }
    case "courierArrive": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "on-the-way") return state;
      return { ...state, jobs: patchJob(state, action.id, { arrivedAt: new Date(now).toISOString(), progress: 1, status: "arrived", waitingSince: new Date(now).toISOString() }) };
    }
    case "courierConfirmDelivery": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "arrived") return state;
      if (action.proof === "otp" && action.code?.trim() !== job.deliveryCode) return state;
      if (action.proof === "signature" && !action.signatureDone) return state;
      if (action.proof === "photo" && (!job.leaveAtDoor || !action.photoUri)) return state;
      return withGoal({
        ...state,
        alerts: addAlert(state, { body: `${rand(job.payoutCents)} is on its way to your earnings.`, href: "/courier/earnings", kind: "money", title: `${job.number} delivered` }, now),
        earnings: [earn(job, "delivery", job.payoutCents, now), ...state.earnings],
        jobs: patchJob(state, action.id, { deliveredAt: new Date(now).toISOString(), note: action.note?.trim() || undefined, proof: action.proof, proofUri: action.photoUri, status: "delivered" }),
      }, now);
    }
    case "courierFailAttempt": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "arrived") return state;
      if (action.reason === "unreachable" && !waitedLongEnough(job, now, waitMs)) return state;
      const attempt: FailedAttempt = { at: new Date(now).toISOString(), photoUri: action.photoUri, reason: action.reason };
      const attempts = [...job.attempts, attempt];
      const again = attempts.length < MAX_ATTEMPTS;
      return {
        ...state,
        alerts: addAlert(state, again ? { body: "You can try once more. Arrive again to start the wait.", href: `/courier/active/${job.id}`, kind: "order", title: `${job.number}: attempt ${attempts.length} of ${MAX_ATTEMPTS} failed` } : { body: "Take the parcel back to the seller and read out the return code.", href: `/courier/active/${job.id}`, kind: "order", title: `${job.number}: return it to the seller` }, now),
        jobs: patchJob(state, action.id, { attempts, progress: again ? 0.9 : 0, status: again ? "on-the-way" : "returning", waitingSince: undefined }),
      };
    }
    case "courierConfirmReturn": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "returning" || action.code.trim() !== job.returnCode) return state;
      return {
        ...state,
        alerts: addAlert(state, { body: `You are paid ${rand(job.payoutCents)} for the trip.`, href: "/courier/earnings", kind: "money", title: `${job.number} returned` }, now),
        earnings: [earn(job, "return-trip", job.payoutCents, now), ...state.earnings],
        jobs: patchJob(state, action.id, { status: "returned" }),
      };
    }
    case "courierRated": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job || job.status !== "delivered" || job.rating !== undefined) return state;
      return {
        ...state,
        alerts: addAlert(state, { body: action.tipCents > 0 ? `${rand(action.tipCents)} tip added.` : "Thanks for a good delivery.", href: "/courier/active/performance", kind: "rating", title: `Rated ${action.rating} stars` }, now),
        earnings: action.tipCents > 0 ? [earn(job, "tip", action.tipCents, now), ...state.earnings] : state.earnings,
        jobs: patchJob(state, action.id, { feedback: action.feedback, rating: action.rating, tipCents: action.tipCents }),
      };
    }
    case "courierWithdraw": {
      const balance = balanceCents(state);
      if (!state.bank || action.amountCents < MIN_CASH_OUT_CENTS || action.amountCents > balance) return state;
      return {
        ...state,
        alerts: addAlert(state, { body: `${rand(action.amountCents)} is on its way to ${state.bank.bankName}.`, href: "/courier/account/wallet", kind: "money", title: "Withdrawal started" }, now),
        payouts: [{ cents: action.amountCents, id: courierId("cp"), label: `Payout to ${state.bank.bankName}`, on: new Date(now).toISOString(), status: "paid" }, ...state.payouts],
      };
    }
    case "courierReadAlerts":
      return { ...state, alerts: state.alerts.map((alert) => (!action.ids || action.ids.includes(alert.id) ? { ...alert, read: true } : alert)) };
    case "courierOpenCase":
      return { ...state, cases: [{ createdAt: new Date(now).toISOString(), detail: action.detail, id: courierId("cc"), jobNumber: action.jobNumber, sos: action.sos, status: "open", title: action.title }, ...state.cases] };
    case "courierCheckDocuments": {
      // a reminder when the licence is within 30 days of running out, again at 7 days, and once it has
      const licence = state.documents.find((doc) => doc.kind === "licence");
      const left = daysLeft(licence?.expiresAt, now);
      if (!licence || left === null || !needsLicence(state.profile.vehicle)) return state;
      const band = left <= 0 ? "expired" : left <= 7 ? "7" : left <= 30 ? "30" : null;
      if (!band || state.licenceNotice === `${licence.expiresAt}:${band}`) return state;
      const alert = left <= 0 ? { body: "Send a new licence in Documents to take offers again.", href: "/courier/account/documents", kind: "document" as const, title: "Your licence has expired" } : { body: `Update your licence in ${left} ${left === 1 ? "day" : "days"}.`, href: "/courier/account/documents", kind: "document" as const, title: "Document expiring soon" };
      return { ...state, alerts: addAlert(state, alert, now), licenceNotice: `${licence.expiresAt}:${band}`, online: left <= 0 ? false : state.online };
    }
    case "courierSeedDemoJobs":
      return state;
    default:
      return state;
  }
}

/** "R 38" for alert text. */
function rand(cents: number): string {
  const value = cents / 100;
  return `R ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}
