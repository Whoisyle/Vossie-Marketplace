import type { Seller } from "./types";

/**
 * Small rules for the Phase 4 features. Pure functions so they can be tested; the demo store and, later, the
 * backend apply the same rules.
 */

// ---- referrals ---------------------------------------------------------------------------------------------

/** Wallet credit each side gets once the invited friend places their first order. */
export const REFERRAL_REWARD_CENTS = 3000;

/** "Vumisa" with student number 2023 09530 becomes VUMI-9530. */
export function referralCodeFor(name: string, studentNumber?: string): string {
  const letters = (name.match(/[A-Za-z]/g) ?? []).join("").toUpperCase().slice(0, 4).padEnd(4, "X");
  const digits = (studentNumber ?? "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `${letters}-${digits}`;
}

export function validateReferralCode(input: string, own: string): string | null {
  const code = input.trim().toUpperCase();
  if (!/^[A-Z]{4}-\d{4}$/.test(code)) return "Codes look like VUMI-9530.";
  if (code === own.toUpperCase()) return "That's your own code. Share it with a friend instead.";
  return null;
}

export type InvitedFriend = { id: string; name: string; status: "joined" | "ordered" | "rewarded" };

export const invitedSeed: InvitedFriend[] = [
  { id: "inv-1", name: "Lerato M.", status: "rewarded" },
  { id: "inv-2", name: "Kamo D.", status: "ordered" },
  { id: "inv-3", name: "Thabo N.", status: "joined" },
];

export const inviteStatusLabel: Record<InvitedFriend["status"], string> = {
  joined: "Joined, waiting for their first order",
  ordered: "First order placed, credit on its way",
  rewarded: "You both got R30",
};

// ---- vouchers ----------------------------------------------------------------------------------------------

export type UserVoucher = { code: string; label: string; detail: string; expiresAt: string; minSpendCents: number };

/** Why a voucher cannot be used right now, or null when it can. */
export function voucherProblem(
  voucher: Pick<UserVoucher, "expiresAt" | "minSpendCents"> | undefined,
  subtotalCents: number,
  now: Date = new Date(),
): string | null {
  if (!voucher) return null;
  if (new Date(voucher.expiresAt).getTime() < now.getTime()) return "This voucher has expired.";
  if (subtotalCents < voucher.minSpendCents) {
    return `Spend R ${Math.ceil((voucher.minSpendCents - subtotalCents) / 100)} more to use this voucher.`;
  }
  return null;
}

// ---- order for later ---------------------------------------------------------------------------------------

export type Slot = { iso: string; label: string; day: string };

const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;
const LEAD_MINUTES = 45;
const STEP_MINUTES = 30;

/**
 * Time slots a student can choose: at least 45 minutes from now, every 30 minutes between 08:00 and 20:00,
 * today and tomorrow. The seller gets a prep reminder before the slot (backend, later).
 */
export function scheduleSlots(now: Date = new Date()): Slot[] {
  const slots: Slot[] = [];
  const earliest = now.getTime() + LEAD_MINUTES * 60_000;
  for (const dayOffset of [0, 1]) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    for (let minutes = OPEN_HOUR * 60; minutes <= CLOSE_HOUR * 60; minutes += STEP_MINUTES) {
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes);
      if (at.getTime() < earliest) continue;
      const hh = String(at.getHours()).padStart(2, "0");
      const mm = String(at.getMinutes()).padStart(2, "0");
      slots.push({ day: dayOffset === 0 ? "Today" : "Tomorrow", iso: at.toISOString(), label: `${hh}:${mm}` });
    }
  }
  return slots;
}

// ---- sellers and stock -------------------------------------------------------------------------------------

/** A seller is "verified" once they have a strong rating over enough reviews. A staff check comes later. */
export function isVerifiedSeller(seller: Pick<Seller, "rating" | "ratingCount">): boolean {
  return seller.rating >= 4.7 && seller.ratingCount >= 50;
}

/** Demo stock: these listings are sold out, so shoppers can ask to be told when they are back. */
export const soldOutIds: string[] = ["tablet-desk", "casio-calculator"];

export function isSoldOut(listingId: string): boolean {
  return soldOutIds.includes(listingId);
}

// ---- alerts ------------------------------------------------------------------------------------------------

export type AlertKind = "price-drop" | "back-in-stock";
export type PriceAlert = { listingId: string; kind: AlertKind; setAt: string; priceCents: number };

// ---- tips and courier rating -------------------------------------------------------------------------------

export const TIP_PRESETS_CENTS = [500, 1000, 2000];
export const MAX_TIP_CENTS = 50_000;

/** Parses "15" or "15.50" into cents; null when it is not a sensible tip. */
export function parseTip(input: string): number | null {
  const clean = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 && cents <= MAX_TIP_CENTS ? cents : null;
}

// ---- block and report --------------------------------------------------------------------------------------

/** Listings from sellers the student has blocked are left out. Blocked sellers are stored as `seller-<id>`. */
export function hideBlocked<T extends { sellerId: string }>(listings: T[], blocked: { id: string }[]): T[] {
  if (blocked.length === 0) return listings;
  const ids = new Set(blocked.map((item) => item.id));
  return listings.filter((listing) => !ids.has(`seller-${listing.sellerId}`));
}
