import type { CampusId } from "@/data/types";
import type { BankAccount } from "@/seller/types";

import type { CourierSchedule } from "./schedule";

/** Where the courier is on the road to being allowed to deliver. */
export type CourierStatus = "none" | "setup" | "pending" | "approved" | "rejected";

export type Vehicle = "walking" | "bicycle" | "scooter" | "car";

export type CourierDocKind = "id" | "selfie" | "licence" | "background";

export type CourierDocStatus = "missing" | "uploaded" | "in-review" | "verified" | "rejected";

export type CourierDoc = {
  kind: CourierDocKind;
  status: CourierDocStatus;
  fileName?: string;
  /** Picture of the document or selfie, when one was taken or picked. */
  uri?: string;
  /** When the document stops being valid, as 2027-03-01. For the driving licence; the courier is reminded before it runs out. */
  expiresAt?: string;
};

/** The car or scooter a courier delivers on. The number plate is what the buyer sees, so they know what is arriving. */
export type VehicleInfo = { make: string; model: string; colour: string; plate: string };

export type CourierProfile = {
  fullName: string;
  phone: string;
  campusId: CampusId;
  vehicle: Vehicle;
  vehicleInfo: VehicleInfo;
  /** The number on the driving licence, for a car or scooter. */
  licenceNumber: string;
};

/** A place the courier takes jobs from. Offers whose pickup is more than about a kilometre from every zone that is on are not shown. */
export type CourierZone = { id: string; name: string; detail: string; latitude: number; longitude: number; on: boolean; /** Added by the courier, by searching for a place. */ custom?: boolean };

/** One thing the courier can be told: a job offer, a ready parcel, a payout, a rating, a document running out. */
export type CourierAlertKind = "offer" | "order" | "money" | "rating" | "document" | "system";

export type CourierAlert = {
  id: string;
  kind: CourierAlertKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

/**
 * Where a delivery job is in its life:
 *  offered   → on the Jobs list with a countdown
 *  accepted  → the courier is heading to the seller to collect it
 *  on-the-way → collected, heading to the buyer (the seller was handed over and paid)
 *  arrived   → at the buyer's door, waiting for the delivery code
 *  returning → both attempts failed, taking the parcel back to the seller
 *  delivered / returned / declined / expired / cancelled end it
 */
export type JobStatus = "offered" | "accepted" | "on-the-way" | "arrived" | "delivered" | "returning" | "returned" | "declined" | "expired" | "cancelled";

export const ACTIVE_JOB: JobStatus[] = ["accepted", "on-the-way", "arrived", "returning"];

export type JobPlace = { name: string; detail: string; latitude: number; longitude: number; phone?: string };

export type JobItem = { title: string; quantity: number; artId?: string; fragile: boolean };

export type FailReason = "unreachable" | "address" | "refused" | "unsafe";

export type FailedAttempt = { at: string; reason: FailReason; photoUri?: string };

export type ProofKind = "otp" | "signature" | "photo";

export type CourierJob = {
  id: string;
  /** The order number the courier and the buyer both see, like #VM-2041. */
  number: string;
  /** A real order from a buyer, or a labelled demo job so the list is never empty. */
  source: "order" | "demo";
  sellerOrderId?: string;
  buyerOrderId?: string;
  storeName: string;
  pickup: JobPlace;
  dropoff: JobPlace;
  buyerName: string;
  buyerPhone?: string;
  items: JobItem[];
  /** "Small · 1.2 kg". */
  parcel: string;
  handling: string;
  payment: string;
  distanceKm: number;
  minutes: number;
  /** What the courier earns for the trip: the buyer's delivery fee. */
  payoutCents: number;
  /** The distance part of the payout, shown as "Incl. R 8 distance bonus". */
  bonusCents: number;
  status: JobStatus;
  offeredAt: string;
  /** Counts down while the courier is online. null while offline or once taken. */
  expiresAt: string | null;
  acceptedAt?: string;
  pickedUpAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  /** Planned for later, from the Upcoming tab. */
  scheduledFor?: string;
  /** What the courier types at the seller. Real jobs: only the seller can read it out. */
  pickupCode: string;
  /** What the buyer reads out at the door. Real jobs: only the buyer can see it. */
  deliveryCode: string;
  /** What the seller types when the parcel is brought back. */
  returnCode: string;
  /** Demo jobs show both codes so they can be walked through without a seller or buyer app. */
  demoCodes: boolean;
  instructions?: string;
  /** The buyer allowed the parcel to be left at the door, which unlocks photo proof. */
  leaveAtDoor: boolean;
  pickupPhotoUri?: string;
  proof?: ProofKind;
  proofUri?: string;
  note?: string;
  attempts: FailedAttempt[];
  /** When the courier started waiting at the door; the wait has to pass before it can be reported. */
  waitingSince?: string;
  /** 0 to 1 along the road to the buyer; the buyer's tracking reads the same number. */
  progress: number;
  /** A bonus on top of the pay, for a busy area. Already counted in the payout. */
  boostCents?: number;
  /** The student's rating and tip after delivery, copied from the buyer's order. */
  rating?: number;
  tipCents?: number;
  feedback?: string;
};

export type EarningKind = "delivery" | "tip" | "return-trip";

export type EarningEntry = { id: string; jobId: string; number: string; kind: EarningKind; cents: number; at: string };

export type PayoutStatus = "scheduled" | "paid";

export type CourierPayout = { id: string; label: string; cents: number; status: PayoutStatus; on: string };

export type CourierCase = { id: string; title: string; detail: string; status: "open" | "in-review" | "resolved"; createdAt: string; jobNumber?: string; sos?: boolean };

export type CourierState = {
  status: CourierStatus;
  /** The student has seen the "You're verified" screen. */
  approvalSeen: boolean;
  profile: CourierProfile;
  documents: CourierDoc[];
  online: boolean;
  schedule: CourierSchedule;
  zones: CourierZone[];
  /** The longest delivery the courier will take, in kilometres. */
  maxKm: number;
  jobAlerts: boolean;
  jobs: CourierJob[];
  earnings: EarningEntry[];
  payouts: CourierPayout[];
  alerts: CourierAlert[];
  cases: CourierCase[];
  /** Where payouts go. Saved the first time the courier withdraws. */
  bank?: BankAccount;
  /** For the acceptance rate: offers the courier saw and what they did with them. */
  offersSeen: number;
  offersAccepted: number;
  /** The reason the last review failed, when it did. */
  rejectedReason?: string;
  /** What the courier wants to earn in a week, and the week a goal was last reached in so it is celebrated once. */
  goal: { weeklyCents: number | null };
  goalReachedWeek?: string;
  /** The licence reminder that was already sent (expiry date and how near), so it is sent once. */
  licenceNotice?: string;
};

export type CourierAction =
  | { type: "courierStart" }
  | { type: "courierSetProfile"; patch: Partial<Omit<CourierProfile, "vehicleInfo">> & { vehicleInfo?: Partial<VehicleInfo> } }
  | { type: "courierUploadDocument"; kind: CourierDocKind; fileName: string; uri?: string; expiresAt?: string }
  | { type: "courierSetLicenceExpiry"; expiresAt: string }
  | { type: "courierCheckDocuments" }
  | { type: "courierSubmitVerification" }
  | { type: "courierReviewTick" }
  | { type: "courierApprovalSeen" }
  | { type: "courierSetOnline"; online: boolean }
  | { type: "courierSetSchedule"; schedule: CourierSchedule }
  | { type: "courierStartBreak"; minutes: number }
  | { type: "courierEndBreak" }
  | { type: "courierFinishToday" }
  | { type: "courierAutoOffline" }
  | { type: "courierToggleZone"; id: string }
  | { type: "courierAddZone"; name: string; detail: string; latitude: number; longitude: number }
  | { type: "courierRemoveZone"; id: string }
  | { type: "courierSetMaxKm"; km: number }
  | { type: "courierSetJobAlerts"; on: boolean }
  | { type: "courierSaveBank"; bank: BankAccount }
  | { type: "courierReceiveJob"; job: CourierJob }
  | { type: "courierSeedDemoJobs" }
  | { type: "courierExpireJobs" }
  | { type: "courierAcceptJob"; id: string }
  | { type: "courierDeclineJob"; id: string }
  | { type: "courierConfirmPickup"; id: string; code: string; photoUri?: string }
  | { type: "courierProgress"; id: string; progress: number }
  | { type: "courierArrive"; id: string }
  | { type: "courierConfirmDelivery"; id: string; proof: ProofKind; code?: string; signatureDone?: boolean; photoUri?: string; note?: string }
  | { type: "courierFailAttempt"; id: string; reason: FailReason; photoUri?: string }
  | { type: "courierConfirmReturn"; id: string; code: string }
  | { type: "courierRated"; id: string; rating: number; tipCents: number; feedback?: string }
  | { type: "courierWithdraw"; amountCents: number }
  | { type: "courierReadAlerts"; ids?: string[] }
  | { type: "courierOpenCase"; title: string; detail: string; jobNumber?: string; sos?: boolean }
  | { type: "courierSetStatus"; status: CourierStatus }
  | { type: "courierSetGoal"; weeklyCents: number | null }
  | { type: "courierSendMessage"; id: string; body: string; to?: "buyer" | "seller" };
