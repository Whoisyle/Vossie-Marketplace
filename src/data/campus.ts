import { daysAgo, hoursAgo } from "./mock/time";

/**
 * Student marketplace extras (demo data): textbook swap, lost and found, and the split-the-bill helper.
 * Posts are local to this device until the backend has tables for them.
 */
export type SwapPost = { id: string; author: string; have: string; want: string; createdAt: string; mine: boolean };

export const swapsSeed: SwapPost[] = [
  { author: "Thabo N.", createdAt: hoursAgo(5), have: "Economics 101 (2024 edition)", id: "swap-1", mine: false, want: "Introduction to Statistics" },
  { author: "Lerato M.", createdAt: daysAgo(1), have: "Python for Beginners", id: "swap-2", mine: false, want: "Networking Fundamentals" },
  { author: "Kamo D.", createdAt: daysAgo(2), have: "Business Law notes (bound)", id: "swap-3", mine: false, want: "Accounting 1 textbook" },
];

export type LostFoundKind = "lost" | "found";
export type LostFoundPost = { id: string; kind: LostFoundKind; title: string; place: string; author: string; createdAt: string; resolved: boolean; mine: boolean };

export const lostFoundSeed: LostFoundPost[] = [
  { author: "Sipho K.", createdAt: hoursAgo(3), id: "lf-1", kind: "found", mine: false, place: "Library, level 2", resolved: false, title: "Black calculator (Casio fx-991)" },
  { author: "Naledi M.", createdAt: hoursAgo(20), id: "lf-2", kind: "lost", mine: false, place: "Student centre", resolved: false, title: "Student card in a green holder" },
  { author: "Aiden P.", createdAt: daysAgo(2), id: "lf-3", kind: "found", mine: false, place: "Sports centre", resolved: false, title: "Grey hoodie" },
];

export type SplitMember = { id: string; name: string; shareCents: number; status: "pending" | "paid" };
export type Split = { id: string; orderId: string; totalCents: number; members: SplitMember[]; createdAt: string };

/**
 * Splits a bill equally between you and your friends. Cents that do not divide evenly go to the first person
 * (you), so the shares always add up to the total.
 */
export function splitShares(totalCents: number, people: number): number[] {
  if (people < 1) return [];
  const base = Math.floor(totalCents / people);
  const remainder = totalCents - base * people;
  return Array.from({ length: people }, (_, index) => (index === 0 ? base + remainder : base));
}

export type WishCollection = { id: string; name: string; listingIds: string[] };
export type SavedSearch = { id: string; query: string; createdAt: string };

/** Hourly tutor slots from 10:00 to 19:00 on each of the next three days. */
export function tutorSlots(now: Date = new Date()): { iso: string; day: string; label: string }[] {
  const slots: { iso: string; day: string; label: string }[] = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    for (let hour = 10; hour <= 19; hour += 1) {
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour);
      if (at.getTime() < now.getTime() + 60 * 60_000) continue;
      slots.push({
        day: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : at.toLocaleDateString("en-ZA", { day: "numeric", month: "short", weekday: "short" }),
        iso: at.toISOString(),
        label: `${String(hour).padStart(2, "0")}:00`,
      });
    }
  }
  return slots;
}
