import { unitOf } from "./codes";
import { receiving, zoneCovers } from "./schedule";
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

export type CourierLevel = { key: "new" | "rider" | "trusted" | "top"; label: string; next: string | null; progress: number; need: string };

/** The courier's level, from real deliveries and the rating buyers gave: New, Rider, Trusted and Top-rated. Nothing is invented. */
export function courierLevel(courier: CourierState): CourierLevel {
  const stats = performance(courier);
  const rating = stats.rating ?? 0;
  if (stats.deliveries >= 100 && rating >= 4.8) return { key: "top", label: "Top-rated", need: "You are at the top", next: null, progress: 1 };
  if (stats.deliveries >= 25 && rating >= 4.5) return { key: "trusted", label: "Trusted", need: `${Math.max(0, 100 - stats.deliveries)} more deliveries and a 4.8 rating`, next: "Top-rated", progress: Math.min(1, stats.deliveries / 100) };
  if (stats.deliveries >= 1) return { key: "rider", label: "Rider", need: `${Math.max(0, 25 - stats.deliveries)} more deliveries and a 4.5 rating`, next: "Trusted", progress: Math.min(1, stats.deliveries / 25) };
  return { key: "new", label: "New", need: "Finish your first delivery", next: "Rider", progress: 0 };
}

export type CourierBadge = { key: string; label: string; icon: string; earned: boolean; hint: string };

/** What the courier has earned so far, each from something that really happened. */
export function courierBadges(courier: CourierState): CourierBadge[] {
  const delivered = courier.jobs.filter((job) => job.status === "delivered");
  const stats = performance(courier);
  return [
    { earned: delivered.length >= 1, hint: "Finish a delivery", icon: "award", key: "first", label: "First delivery" },
    { earned: delivered.length >= 10, hint: "Finish 10 deliveries", icon: "zap", key: "ten", label: "10 deliveries" },
    { earned: delivered.some((job) => job.rating === 5), hint: "Get a five-star rating", icon: "star", key: "five", label: "Five stars" },
    { earned: delivered.some((job) => (job.tipCents ?? 0) > 0), hint: "Get a tip", icon: "gift", key: "tip", label: "Tipped" },
    { earned: delivered.length >= 3 && stats.onTime === 100, hint: "Three on time in a row", icon: "clock", key: "ontime", label: "Always on time" },
  ];
}

export function offeredJobs(courier: CourierState): CourierJob[] {
  return courier.jobs.filter((job) => job.status === "offered");
}

function inZones(courier: CourierState, job: CourierJob): boolean {
  return zoneCovers(courier.zones, { latitude: job.pickup.latitude, longitude: job.pickup.longitude }) && job.distanceKm <= courier.maxKm;
}

/** The offers the courier can see right now: they are receiving (online, not on a break, inside their hours) and the pickup is in one of their zones within the longest trip they take. */
export function visibleOffers(courier: CourierState, now: Date = new Date()): CourierJob[] {
  if (!receiving(courier.schedule, courier.online, now)) return [];
  return offeredJobs(courier).filter((job) => inZones(courier, job));
}

/** Offers that are waiting but outside the zones or the longest trip, so the courier can be told they exist. */
export function hiddenOffers(courier: CourierState, now: Date = new Date()): CourierJob[] {
  if (!receiving(courier.schedule, courier.online, now)) return [];
  return offeredJobs(courier).filter((job) => !inZones(courier, job));
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

/** What the courier has earned since Monday, with tips, against the weekly goal they set. Null when there is no goal. */
export function goalProgress(courier: CourierState, now: Date = new Date()): { earnedCents: number; targetCents: number; percent: number; remainingCents: number; reached: boolean } | null {
  const target = courier.goal.weeklyCents;
  if (!target) return null;
  const since = mondayOf(now).getTime();
  const earned = courier.earnings.filter((entry) => new Date(entry.at).getTime() >= since).reduce((sum, entry) => sum + entry.cents, 0);
  return { earnedCents: earned, percent: Math.min(100, Math.round((earned / target) * 100)), reached: earned >= target, remainingCents: Math.max(0, target - earned), targetCents: target };
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Days in a row with at least one delivery, counting back from today (or from yesterday if nothing yet today), and the best run ever. */
export function streak(courier: CourierState, now: Date = new Date()): { current: number; best: number } {
  const days = new Set(courier.jobs.filter((job) => job.status === "delivered" && job.deliveredAt).map((job) => dayKey(new Date(job.deliveredAt!))));
  let current = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sorted = [...courier.jobs.filter((job) => job.status === "delivered" && job.deliveredAt)].map((job) => new Date(job.deliveredAt!)).map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime());
  const unique = [...new Set(sorted)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let index = 0; index < unique.length; index += 1) {
    run = index > 0 && Math.round((unique[index]! - unique[index - 1]!) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { best: Math.max(best, current), current };
}

export type Statement = { key: string; label: string; from: Date; deliveries: number; earnedCents: number; tipsCents: number; jobs: CourierJob[] };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The courier's statements, newest first: each week (Monday to Sunday) or month with what was delivered, earned and tipped. Only periods with something in them. */
export function statements(courier: CourierState, kind: "week" | "month", now: Date = new Date(), count = 8): Statement[] {
  const out: Statement[] = [];
  for (let back = 0; back < count; back += 1) {
    const from = kind === "week" ? new Date(mondayOf(now).getTime() - back * 7 * DAY) : new Date(now.getFullYear(), now.getMonth() - back, 1);
    const to = kind === "week" ? new Date(from.getTime() + 7 * DAY) : new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const entries = courier.earnings.filter((entry) => {
      const at = new Date(entry.at).getTime();
      return at >= from.getTime() && at < to.getTime();
    });
    if (entries.length === 0) continue;
    const jobs = courier.jobs.filter((job) => job.status === "delivered" && job.deliveredAt && new Date(job.deliveredAt).getTime() >= from.getTime() && new Date(job.deliveredAt).getTime() < to.getTime());
    const end = new Date(to.getTime() - DAY);
    const label = kind === "week" ? `${from.getDate()} ${MONTH_NAMES[from.getMonth()]!.slice(0, 3)} to ${end.getDate()} ${MONTH_NAMES[end.getMonth()]!.slice(0, 3)}` : `${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`;
    out.push({ deliveries: jobs.length, earnedCents: entries.reduce((sum, entry) => sum + entry.cents, 0), from, jobs, key: `${kind}-${from.getTime()}`, label, tipsCents: entries.filter((entry) => entry.kind === "tip").reduce((sum, entry) => sum + entry.cents, 0) });
  }
  return out;
}

export type Demand = { id: string; name: string; level: "quiet" | "busy" | "high"; bonusCents: number };

/**
 * How busy each of the courier's zones is right now, for the Busy areas card. It follows the day (lunch and supper are busiest, late
 * nights quietest) with each zone a little different, and a high demand zone adds a bonus to its offers. Demo numbers: the real ones
 * come from the orders being placed.
 */
export function demand(courier: CourierState, now: Date = new Date()): Demand[] {
  const hour = now.getHours();
  const base = (hour >= 11 && hour < 14) || (hour >= 17 && hour < 20) ? 2 : hour >= 7 && hour < 22 ? 1 : 0;
  return courier.zones
    .filter((zone) => zone.on)
    .map((zone) => {
      const bump = unitOf(`${zone.id}-${hour}`) > 0.55 ? 1 : 0;
      const level = Math.max(0, Math.min(2, base - 1 + bump + (zone.id === "campus" ? 1 : 0)));
      return { bonusCents: level === 2 ? 600 : 0, id: zone.id, level: level === 2 ? ("high" as const) : level === 1 ? ("busy" as const) : ("quiet" as const), name: zone.name };
    })
    .sort((a, b) => b.bonusCents - a.bonusCents);
}
