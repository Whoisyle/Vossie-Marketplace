import type { EarningEntry, Vehicle } from "./types";

/**
 * What a campus delivery costs the buyer and pays the courier (owner decision, 2026-10-21): a base plus a rate for every
 * kilometre, capped. The courier gets the whole fee and any tip. These are demo values until the real rates are set.
 */
export const COURIER_BASE_CENTS = 2000;
export const COURIER_PER_KM_CENTS = 600;
export const COURIER_CAP_CENTS = 6000;

/** The delivery fee for a trip of this many kilometres, to the nearest rand. */
export function courierFeeCents(km: number): number {
  const raw = COURIER_BASE_CENTS + Math.max(0, km) * COURIER_PER_KM_CENTS;
  return Math.min(COURIER_CAP_CENTS, Math.round(raw / 100) * 100);
}

/** The part of a fee that comes from the distance, shown as "Incl. R 8 distance bonus". */
export function distanceBonusCents(feeCents: number): number {
  return Math.max(0, feeCents - COURIER_BASE_CENTS);
}

const MINUTES_PER_KM: Record<Vehicle, number> = { bicycle: 5, car: 2.5, scooter: 3, walking: 12 };

/** About how long the trip takes with this vehicle, never under 3 minutes. */
export function tripMinutes(km: number, vehicle: Vehicle): number {
  return Math.max(3, Math.round(km * MINUTES_PER_KM[vehicle] + 2));
}

/** "R 38" for the job cards, whole rands when there are no cents. */
export function rand(cents: number): string {
  const value = cents / 100;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `R ${text.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

/** Money earned in the seven days from `weekStart`, Monday first. */
export function dailyEarnings(entries: EarningEntry[], weekStart: Date): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0];
  const start = weekStart.getTime();
  for (const entry of entries) {
    const index = Math.floor((new Date(entry.at).getTime() - start) / 86_400_000);
    if (index >= 0 && index < 7) days[index]! += entry.cents;
  }
  return days;
}

/** The Monday at the start of the week that holds `date`, at midnight. */
export function mondayOf(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const back = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - back);
  return copy;
}
