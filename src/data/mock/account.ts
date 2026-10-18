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
  { brand: "visa", expiry: "08/28", holder: "Vumisa", id: "card-demo-visa", isDefault: true, last4: "4242" },
  { brand: "mastercard", expiry: "03/27", holder: "Vumisa", id: "card-demo-mc", isDefault: false, last4: "5555" },
];

export const loginEventsSeed: LoginEvent[] = [
  { id: "login-1", device: "iPhone · Vossie app", location: "Potchefstroom, ZA", at: hoursAgo(0), current: true },
  { id: "login-2", device: "Chrome on Windows", location: "Potchefstroom, ZA", at: daysAgo(2), current: false },
  { id: "login-3", device: "iPhone · Vossie app", location: "Johannesburg, ZA", at: daysAgo(9), current: false },
];

export const vouchers: Record<string, { label: string; percentOff?: number; centsOff?: number }> = {
  VOSSIE10: { label: "10% off", percentOff: 10 },
  WELCOME20: { label: "R20 off", centsOff: 2000 },
};

export const deliveryFeeCents = 1500;
export const subscriberDiscountCents = 400;
