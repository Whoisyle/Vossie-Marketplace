import { getCampusName } from "@/data/repository";

import { ACTIVE_JOB, type CourierAction, type CourierAlert, type CourierDoc, type CourierDocKind, type CourierJob, type CourierState, type EarningEntry, type FailedAttempt } from "./types";

/** How long an offer stays on the Jobs list while the courier is online. */
export const OFFER_MS = 5 * 60_000;
/** How long the courier has to wait at a door before reporting the buyer unreachable. The demo shortens this; the real one is 10 minutes. */
export const WAIT_MS = 10 * 60_000;
export const DEMO_WAIT_MS = 20_000;
/** The least that can be cashed out at once. */
export const MIN_CASH_OUT_CENTS = 2000;
/** Two tries at the door, then the parcel goes back. */
export const MAX_ATTEMPTS = 2;

let counter = 0;
export function courierId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Four digits that are the same for the same seed, so a code can be shown in two places. */
export function fourDigits(seed: string, salt: string): string {
  let hash = 7;
  for (const char of `${seed}:${salt}`) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return String(1000 + (hash % 9000));
}

const DOC_ORDER: CourierDocKind[] = ["id", "selfie", "vehicle", "background"];

export function emptyDocuments(): CourierDoc[] {
  return DOC_ORDER.map((kind) => ({ kind, status: "missing" as const }));
}

export function zonesFor(campusId: CourierState["profile"]["campusId"]): CourierState["zones"] {
  const name = getCampusName(campusId).replace(/\s*\(.*\)/, "");
  return [
    { id: "campus", name: `Eduvos ${name} campus`, on: true },
    { id: "town", name: `${name} town centre`, on: true },
    { id: "mall", name: "Nearby mall", on: false },
  ];
}

export function emptyCourierState(): CourierState {
  return {
    alerts: [],
    approvalSeen: false,
    bank: "",
    cases: [],
    documents: emptyDocuments(),
    earnings: [],
    hours: { days: ["mon", "tue", "wed", "thu", "fri"], from: "08:00", to: "17:00" },
    jobAlerts: true,
    jobs: [],
    offersAccepted: 0,
    offersSeen: 0,
    online: false,
    payouts: [],
    profile: { campusId: "potchefstroom", fullName: "", phone: "", vehicle: "bicycle" },
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
      const profile = { ...state.profile, ...action.patch };
      return { ...state, profile, zones: action.patch.campusId && action.patch.campusId !== state.profile.campusId ? zonesFor(action.patch.campusId) : state.zones };
    }
    case "courierUploadDocument":
      return { ...state, documents: state.documents.map((doc) => (doc.kind === action.kind ? { ...doc, fileName: action.fileName, status: "uploaded", uri: action.uri } : doc)) };
    case "courierSubmitVerification": {
      const have = (kind: CourierDocKind) => state.documents.find((doc) => doc.kind === kind)?.status !== "missing";
      if (!have("id") || !have("selfie")) return state;
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
      return { ...state, documents, status: done && state.status === "pending" ? "approved" : state.status };
    }
    case "courierApprovalSeen":
      return state.approvalSeen ? state : { ...state, approvalSeen: true };
    case "courierSetOnline": {
      if (state.status !== "approved") return state;
      if (!action.online) return { ...state, jobs: state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: null } : job)), online: false };
      // the countdowns start when the courier can see the offers
      const jobs = state.jobs.map((job) => (job.status === "offered" ? { ...job, expiresAt: new Date(now + OFFER_MS).toISOString() } : job));
      return { ...state, jobs, online: true };
    }
    case "courierSetHours":
      return { ...state, hours: { ...state.hours, ...action.patch } };
    case "courierToggleDay":
      return { ...state, hours: { ...state.hours, days: state.hours.days.includes(action.day) ? state.hours.days.filter((day) => day !== action.day) : [...state.hours.days, action.day] } };
    case "courierToggleZone":
      return { ...state, zones: state.zones.map((zone) => (zone.id === action.id ? { ...zone, on: !zone.on } : zone)) };
    case "courierSetJobAlerts":
      return { ...state, jobAlerts: action.on };
    case "courierSetBank":
      return { ...state, bank: action.bank.trim() };
    case "courierReceiveJob": {
      if (state.jobs.some((job) => job.id === action.job.id)) return state;
      const job: CourierJob = { ...action.job, expiresAt: state.online ? new Date(now + OFFER_MS).toISOString() : null };
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
      return {
        ...state,
        alerts: addAlert(state, { body: `${rand(job.payoutCents)} is on its way to your earnings.`, href: "/courier/earnings", kind: "money", title: `${job.number} delivered` }, now),
        earnings: [earn(job, "delivery", job.payoutCents, now), ...state.earnings],
        jobs: patchJob(state, action.id, { deliveredAt: new Date(now).toISOString(), note: action.note?.trim() || undefined, proof: action.proof, proofUri: action.photoUri, status: "delivered" }),
      };
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
    case "courierCashOut": {
      const balance = balanceCents(state);
      if (balance < MIN_CASH_OUT_CENTS) return state;
      return {
        ...state,
        alerts: addAlert(state, { body: `${rand(balance)} is on its way to ${state.bank || "your bank"}.`, href: "/courier/earnings", kind: "money", title: "Cash out started" }, now),
        payouts: [{ cents: balance, id: courierId("cp"), label: "Cash out", on: new Date(now).toISOString(), status: "paid" }, ...state.payouts],
      };
    }
    case "courierReadAlerts":
      return { ...state, alerts: state.alerts.map((alert) => (!action.ids || action.ids.includes(alert.id) ? { ...alert, read: true } : alert)) };
    case "courierOpenCase":
      return { ...state, cases: [{ createdAt: new Date(now).toISOString(), detail: action.detail, id: courierId("cc"), jobNumber: action.jobNumber, sos: action.sos, status: "open", title: action.title }, ...state.cases] };
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
