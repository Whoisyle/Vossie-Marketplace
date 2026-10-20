import type { UserVoucher } from "../phase4";
import type {
  LoginEvent,
  Profile,
  SavedCard,
  WalletTransaction,
} from "../types";
import { daysAgo, hoursAgo } from "./time";

/** Demo accounts that skip profile setup. Any other email is a new user. */
export const returningProfiles: Profile[] = [
  {
    id: "user-vumisa",
    fullName: "Vumisa",
    email: "eduv230953@vossie.net",
    phone: "+27 71 234 5678",
    campusId: "potchefstroom",
    isVerifiedStudent: true,
    role: "buyer",
  },
];

export const walletSeed = {
  balanceCents: 24500,
  transactions: [
    { id: "tx-4", label: "Refund – Campus Notes", amountCents: 4500, createdAt: daysAgo(6) },
    { id: "tx-3", label: "Purchase – Study Desk", amountCents: -18000, createdAt: daysAgo(10) },
    { id: "tx-2", label: "Top up via EFT", amountCents: 30000, createdAt: daysAgo(15) },
    { id: "tx-1", label: "Purchase – Tutoring session", amountCents: -12000, createdAt: daysAgo(20) },
  ] satisfies WalletTransaction[],
};

export const savedCardsSeed: SavedCard[] = [
  { brand: "visa", expiry: "08/28", holder: "Vumisa", id: "card-demo-visa", isDefault: true, issuer: "nedbank", last4: "4242" },
  { brand: "mastercard", expiry: "03/27", holder: "Vumisa", id: "card-demo-mc", isDefault: false, issuer: "fnb", last4: "5555" },
];

export const loginEventsSeed: LoginEvent[] = [
  { id: "login-1", device: "iPhone · Vossie app", location: "Potchefstroom, ZA", at: hoursAgo(0), current: true },
  { id: "login-2", device: "Chrome on Windows", location: "Potchefstroom, ZA", at: daysAgo(2), current: false },
  { id: "login-3", device: "iPhone · Vossie app", location: "Johannesburg, ZA", at: daysAgo(9), current: false },
];

export const vouchers: Record<string, { label: string; percentOff?: number; centsOff?: number }> = {
  COFFEE5: { centsOff: 500, label: "R5 off" },
  EXAM15: { label: "15% off", percentOff: 15 },
  VOSSIE10: { label: "10% off", percentOff: 10 },
  WELCOME20: { label: "R20 off", centsOff: 2000 },
};

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** The student's voucher wallet (demo). One has already expired, to show how that looks. */
export const userVouchersSeed: UserVoucher[] = [
  { code: "WELCOME20", detail: "On any order", expiresAt: inDays(30), label: "R20 off your order", minSpendCents: 0 },
  { code: "VOSSIE10", detail: "On orders over R50", expiresAt: inDays(14), label: "10% off", minSpendCents: 5000 },
  { code: "EXAM15", detail: "Books, stationery and tutors over R100", expiresAt: inDays(21), label: "15% off", minSpendCents: 10000 },
  { code: "COFFEE5", detail: "On any coffee order", expiresAt: inDays(-3), label: "R5 off", minSpendCents: 0 },
];

export const deliveryFeeCents = 1500;
export const subscriberDiscountCents = 400;
