import { DAY_KEYS, DAY_LABELS, type Closure, type DayHours, type DayKey, type Lecture, type SellerProfile, type SellerSchedule } from "./types";

/** "08:30" to 510. Anything that is not a time gives NaN. */
export function toMin(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 510 to "08:30". Clamped to the day. */
export function fromMin(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Moves a time by a number of minutes, staying inside the day. */
export function shiftTime(time: string, delta: number): string {
  const base = toMin(time);
  return fromMin((Number.isNaN(base) ? 8 * 60 : base) + delta);
}

const CLOSED: DayHours = { from: "08:00", open: false, to: "17:00" };

function emptyHours(): Record<DayKey, DayHours> {
  return { fri: { ...CLOSED }, mon: { ...CLOSED }, sat: { ...CLOSED }, sun: { ...CLOSED }, thu: { ...CLOSED }, tue: { ...CLOSED }, wed: { ...CLOSED } };
}

/** The hours the seller chose in setup, as a schedule: the same hours on each open day. */
export function scheduleFromProfile(profile: Pick<SellerProfile, "days" | "opens" | "closes">): SellerSchedule {
  const hours = emptyHours();
  for (const day of DAY_KEYS) hours[day] = { from: profile.opens, open: profile.days.includes(day), to: profile.closes };
  return { autoPause: true, closedNow: false, closures: [], cutoffMinutes: 30, hours, lectures: [], preset: "custom", slotMinutes: 30 };
}

const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

/** Everyone's usual hours: Monday to Friday, or every day, from the times the seller has now. */
export function applyPreset(schedule: SellerSchedule, preset: "weekdays" | "every-day"): SellerSchedule {
  const first = DAY_KEYS.map((day) => schedule.hours[day]).find((item) => item.open) ?? CLOSED;
  const hours = emptyHours();
  for (const day of DAY_KEYS) hours[day] = { from: first.from, open: preset === "every-day" || WEEKDAYS.includes(day), to: first.to };
  return { ...schedule, hours, preset };
}

/** The longest stretch of the window that no lecture covers, or null when there is less than `minimum` minutes free. */
export function freeWindow(lectures: Lecture[], window: { from: string; to: string }, minimum = 60): { from: string; to: string } | null {
  const start = toMin(window.from);
  const end = toMin(window.to);
  const busy = lectures
    .map((lecture) => [toMin(lecture.from), toMin(lecture.to)] as const)
    .filter(([a, b]) => !Number.isNaN(a) && !Number.isNaN(b) && b > a)
    .sort((a, b) => a[0] - b[0]);
  let best: [number, number] | null = null;
  let cursor = start;
  const consider = (a: number, b: number) => {
    if (b - a >= minimum && (!best || b - a > best[1] - best[0])) best = [a, b];
  };
  for (const [a, b] of busy) {
    if (a > cursor) consider(cursor, Math.min(a, end));
    cursor = Math.max(cursor, b);
  }
  if (cursor < end) consider(cursor, end);
  return best ? { from: fromMin(best[0]), to: fromMin(best[1]) } : null;
}

/**
 * Sets the whole week from the seller's lectures: on a day with lectures the store opens in the longest gap between
 * them, on a weekday without lectures it keeps the usual hours, and a day with no gap of an hour stays closed. Weekends
 * stay as they were. The seller can still change any day afterwards.
 */
export function applyTimetable(schedule: SellerSchedule, lectures: Lecture[]): SellerSchedule {
  const usual = schedule.hours.mon.open ? schedule.hours.mon : { from: "08:00", open: true, to: "17:00" };
  const hours = { ...schedule.hours };
  for (const day of DAY_KEYS) {
    const mine = lectures.filter((lecture) => lecture.day === day);
    if (mine.length === 0) {
      hours[day] = WEEKDAYS.includes(day) ? { from: usual.from, open: true, to: usual.to } : schedule.hours[day];
      continue;
    }
    const gap = freeWindow(mine, usual);
    hours[day] = gap ? { ...gap, open: true } : { ...schedule.hours[day], open: false };
  }
  return { ...schedule, hours, lectures, preset: "timetable" };
}

/** The earliest opening, the latest closing and the open days, for the single range the database holds today. */
export function summaryRange(schedule: SellerSchedule): { days: DayKey[]; opens: string; closes: string } {
  const open = DAY_KEYS.filter((day) => schedule.hours[day].open);
  if (open.length === 0) return { closes: "17:00", days: [], opens: "08:00" };
  return {
    closes: fromMin(Math.max(...open.map((day) => toMin(schedule.hours[day].to)))),
    days: open,
    opens: fromMin(Math.min(...open.map((day) => toMin(schedule.hours[day].from)))),
  };
}

const KEY_BY_INDEX: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayKeyOf(date: Date): DayKey {
  return KEY_BY_INDEX[date.getDay()]!;
}

/** "2026-11-04" in the phone's own time zone. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The closure (exam week, holiday) that covers a date, if any. */
export function closureOn(schedule: SellerSchedule, date: Date): Closure | undefined {
  const key = dateKey(date);
  return schedule.closures.find((item) => item.from <= key && key <= item.to);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "4 Nov" from "2026-11-04". */
export function shortDay(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(day)} ${SHORT_MONTHS[Number(month) - 1] ?? ""}`.trim();
}

export type StoreStatus = { open: boolean; label: string; reason: "open" | "hours" | "closure" | "manual" };

/** Whether the store is taking orders at a moment, and a short line to say so: "Open now · until 17:00", "Closed · opens Tue 08:00", "Closed · back on 4 Nov". */
export function storeStatus(schedule: SellerSchedule, now: Date): StoreStatus {
  if (schedule.closedNow) return { label: "Closed by you", open: false, reason: "manual" };
  const closure = closureOn(schedule, now);
  if (closure) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let back = next;
    for (let guard = 0; guard < 400 && closureOn(schedule, back); guard += 1) back = new Date(back.getFullYear(), back.getMonth(), back.getDate() + 1);
    return { label: `Closed · back on ${shortDay(dateKey(back))}`, open: false, reason: "closure" };
  }
  const today = schedule.hours[dayKeyOf(now)];
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (today.open && minutes >= toMin(today.from) && minutes < toMin(today.to)) return { label: `Open now · until ${today.to}`, open: true, reason: "open" };
  // find the next opening within a week
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const hours = schedule.hours[dayKeyOf(day)];
    if (!hours.open || closureOn(schedule, day)) continue;
    if (offset === 0 && minutes >= toMin(hours.from)) continue;
    return { label: `Closed · opens ${offset === 0 ? "today" : offset === 1 ? "tomorrow" : DAY_LABELS[dayKeyOf(day)]} ${hours.from}`, open: false, reason: "hours" };
  }
  return { label: "Closed", open: false, reason: "hours" };
}

/**
 * The pickup times buyers can choose today: from the later of opening and now plus the cut-off, up to an hour
 * before closing is not needed, so up to closing, in steps of the slot length. Empty when closed.
 */
export function pickupSlots(schedule: SellerSchedule, now: Date): string[] {
  if (schedule.closedNow || closureOn(schedule, now)) return [];
  const today = schedule.hours[dayKeyOf(now)];
  if (!today.open) return [];
  const step = schedule.slotMinutes;
  const earliest = Math.max(toMin(today.from), now.getHours() * 60 + now.getMinutes() + schedule.cutoffMinutes);
  const first = Math.ceil(earliest / step) * step;
  const slots: string[] = [];
  for (let at = first; at + step <= toMin(today.to); at += step) slots.push(fromMin(at));
  return slots;
}
