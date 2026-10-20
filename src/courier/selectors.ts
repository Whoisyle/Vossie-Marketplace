import { balanceCents } from "./state";
import { dailyEarnings, mondayOf } from "./pay";
import { ACTIVE_JOB, type CourierJob, type CourierState } from "./types";

const DAY = 86_400_000;

function sameDay(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  const when = new Date(iso);
  return when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth() && when.getDate() === now.getDate();
}

/** Today's earnings, deliveries done today and the rating so far, for the Home tiles. */
export function todayStats(courier: CourierState, now: Date = new Date()) {
  const cents = courier.earnings.filter((entry) => sameDay(entry.at, now)).reduce((sum, entry) => sum + entry.cents, 0);
  const done = courier.jobs.filter((job) => job.status === "delivered" && sameDay(job.deliveredAt, now)).length;
  return { cents, done, rating: ratingOf(courier.jobs) };
}

/** The average rating buyers gave, or null while nobody has rated yet. */
export function ratingOf(jobs: CourierJob[]): number | null {
  const rated = jobs.filter((job) => job.rating !== undefined);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((sum, job) => sum + (job.rating ?? 0), 0) / rated.length) * 10) / 10;
}

/** What the Performance page shows: the score and the three rates, each as a percentage. */
export function performance(courier: CourierState) {
  const jobs = courier.jobs;
  const delivered = jobs.filter((job) => job.status === "delivered");
  const decided = jobs.filter((job) => job.status !== "offered");
  const accepted = decided.filter((job) => job.status !== "declined" && job.status !== "expired");
  const finished = jobs.filter((job) => job.status === "delivered" || job.status === "returned" || job.status === "cancelled");
  const onTime = delivered.filter((job) => {
    if (!job.acceptedAt || !job.deliveredAt) return true;
    const took = (new Date(job.deliveredAt).getTime() - new Date(job.acceptedAt).getTime()) / 60_000;
    return took <= job.minutes + 25;
  });
  const percent = (part: number, whole: number): number => (whole === 0 ? 0 : Math.round((part / whole) * 100));
  return {
    acceptance: percent(accepted.length, decided.length),
    completion: percent(delivered.length, finished.length),
    deliveries: delivered.length,
    onTime: percent(onTime.length, delivered.length),
    rating: ratingOf(jobs),
  };
}

export function offeredJobs(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => job.status === "offered");
}

export type JobSort = "nearby" | "pay" | "quick";

/** The Jobs list in the order the chip asks for. */
export function sortOffers(jobs: CourierJob[], sort: JobSort): CourierJob[] {
  const copy = [...jobs];
  if (sort === "pay") return copy.sort((a, b) => b.payoutCents - a.payoutCents);
  if (sort === "quick") return copy.sort((a, b) => a.minutes - b.minutes);
  return copy.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function activeNow(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => ACTIVE_JOB.includes(job.status) && !job.scheduledFor);
}

export function upcoming(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => job.status === "accepted" && Boolean(job.scheduledFor)).sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
}

export function doneJobs(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => job.status === "delivered" || job.status === "returned").sort((a, b) => (b.deliveredAt ?? b.acceptedAt ?? "").localeCompare(a.deliveredAt ?? a.acceptedAt ?? ""));
}

export function cancelledJobs(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => job.status === "cancelled");
}

export type HistoryRange = "all" | "week" | "month";

/** Finished deliveries, newest first, for the History page. */
export function history(courier: CourierState, range: HistoryRange, now: Date = new Date()): CourierJob[] {
  const finished = courier.jobs.filter((job) => job.status === "delivered" || job.status === "returned" || job.status === "cancelled");
  const since = range === "week" ? now.getTime() - 7 * DAY : range === "month" ? now.getTime() - 30 * DAY : 0;
  return finished.filter((job) => new Date(job.deliveredAt ?? job.acceptedAt ?? job.offeredAt).getTime() >= since).sort((a, b) => (b.deliveredAt ?? b.acceptedAt ?? b.offeredAt).localeCompare(a.deliveredAt ?? a.acceptedAt ?? a.offeredAt));
}

export type EarningsRange = "week" | "month" | "year";

/** The money earned in a range, how many deliveries made it, the tips, and the bars of the chart. */
export function earningsFor(courier: CourierState, range: EarningsRange, now: Date = new Date()) {
  const since = range === "week" ? mondayOf(now).getTime() : range === "month" ? new Date(now.getFullYear(), now.getMonth(), 1).getTime() : new Date(now.getFullYear(), 0, 1).getTime();
  const inRange = courier.earnings.filter((entry) => new Date(entry.at).getTime() >= since);
  const total = inRange.reduce((sum, entry) => sum + entry.cents, 0);
  const tips = inRange.filter((entry) => entry.kind === "tip").reduce((sum, entry) => sum + entry.cents, 0);
  const deliveries = inRange.filter((entry) => entry.kind !== "tip").length;
  const bars = range === "week" ? dailyEarnings(courier.earnings, mondayOf(now)) : range === "month" ? weeklyBars(courier, now) : monthlyBars(courier, now);
  return { bars, deliveries, tips, total };
}

function weeklyBars(courier: CourierState, now: Date): number[] {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const bars = [0, 0, 0, 0, 0];
  for (const entry of courier.earnings) {
    const index = Math.floor((new Date(entry.at).getTime() - start) / (7 * DAY));
    if (index >= 0 && index < 5) bars[index]! += entry.cents;
  }
  return bars;
}

function monthlyBars(courier: CourierState, now: Date): number[] {
  const bars = new Array<number>(12).fill(0);
  for (const entry of courier.earnings) {
    const when = new Date(entry.at);
    if (when.getFullYear() === now.getFullYear()) bars[when.getMonth()]! += entry.cents;
  }
  return bars;
}

/** When the next weekly payout goes: the coming Friday (today, if it is one and it is early). */
export function nextPayoutDate(now: Date = new Date()): Date {
  const day = now.getDay();
  const ahead = (5 - day + 7) % 7;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (ahead === 0 && now.getHours() >= 12 ? 7 : ahead));
  return date;
}

export { balanceCents };
