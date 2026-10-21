import { campusCenter, distanceKm, type LatLng } from "@/data/geo";
import type { CampusId } from "@/data/types";
import { dateKey, dayKeyOf, fromMin, toMin } from "@/seller/schedule";
import { DAY_KEYS, DAY_LABELS, type DayHours, type DayKey } from "@/seller/types";

/**
 * When a courier works. The same shape of week as the seller's operating times: each day on or off with its own start and end,
 * and the courier can finish for today or take a break. `autoOffline` stops offers when the hours end.
 */
export type CourierSchedule = {
  hours: Record<DayKey, DayHours>;
  /** Stop receiving offers when the day's hours end. */
  autoOffline: boolean;
  /** "2026-10-21": the courier finished for the day, so no offers until tomorrow. */
  finishedOn?: string;
  /** Offers are paused until this moment. */
  breakUntil?: string;
  /** "2026-10-21": the courier started outside their hours on purpose, so the day is not cut off. */
  overrideOn?: string;
  preset: "weekdays" | "every-day" | "custom";
};

const OFF: DayHours = { from: "08:00", open: false, to: "17:00" };

function week(days: DayKey[], from: string, to: string): Record<DayKey, DayHours> {
  const out = {} as Record<DayKey, DayHours>;
  for (const day of DAY_KEYS) out[day] = days.includes(day) ? { from, open: true, to } : { ...OFF };
  return out;
}

const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

export function defaultSchedule(): CourierSchedule {
  return { autoOffline: true, hours: week(WEEKDAYS, "08:00", "17:00"), preset: "weekdays" };
}

/** Monday to Friday, or every day, from the first open day's times. */
export function applyPreset(schedule: CourierSchedule, preset: "weekdays" | "every-day"): CourierSchedule {
  const first = DAY_KEYS.map((day) => schedule.hours[day]).find((item) => item.open) ?? { from: "08:00", open: true, to: "17:00" };
  return { ...schedule, hours: week(preset === "every-day" ? [...DAY_KEYS] : WEEKDAYS, first.from, first.to), preset };
}

export type WorkStatus = { working: boolean; label: string; reason: "hours" | "break" | "finished" | "off-day" | "after" | "before" };

/** Whether the courier's hours cover this moment, and a short line to say so: "On duty · until 17:00", "On a break until 14:30". */
export function workStatus(schedule: CourierSchedule, now: Date): WorkStatus {
  const today = dateKey(now);
  if (schedule.breakUntil && new Date(schedule.breakUntil).getTime() > now.getTime()) {
    const until = new Date(schedule.breakUntil);
    return { label: `On a break until ${fromMin(until.getHours() * 60 + until.getMinutes())}`, reason: "break", working: false };
  }
  if (schedule.finishedOn === today) return { label: "Finished for today · back tomorrow", reason: "finished", working: false };
  const hours = schedule.hours[dayKeyOf(now)];
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (!hours.open) return { label: "Not on duty today", reason: "off-day", working: false };
  if (minutes < toMin(hours.from)) return { label: `Starts at ${hours.from}`, reason: "before", working: false };
  if (minutes >= toMin(hours.to)) return { label: "Hours ended for today", reason: "after", working: false };
  return { label: `On duty · until ${hours.to}`, reason: "hours", working: true };
}

/** Whether the hours alone cover this moment (a break or finishing early does not change that). */
export function withinHours(schedule: CourierSchedule, now: Date): boolean {
  const hours = schedule.hours[dayKeyOf(now)];
  const minutes = now.getHours() * 60 + now.getMinutes();
  return hours.open && minutes >= toMin(hours.from) && minutes < toMin(hours.to);
}

/** Whether offers should reach the courier at this moment: online, not on a break, not finished, and inside the hours unless they started on purpose outside them. */
export function receiving(schedule: CourierSchedule, online: boolean, now: Date): boolean {
  if (!online) return false;
  if (schedule.breakUntil && new Date(schedule.breakUntil).getTime() > now.getTime()) return false;
  if (schedule.finishedOn === dateKey(now)) return false;
  return withinHours(schedule, now) || schedule.overrideOn === dateKey(now) || !schedule.autoOffline;
}

export { DAY_KEYS, DAY_LABELS, dateKey };

/** A place a courier takes jobs from, with how far from it a pickup can be. */
export type ZoneSeed = { id: string; name: string; detail: string; point: LatLng };

/** How far from the middle of a zone a pickup can be and still count as in it. */
export const ZONE_RADIUS_KM = 1.2;

/** Real-sounding areas near each campus besides the campus itself. Their positions are approximate until the real ones are surveyed. */
const AREAS: Record<CampusId, { name: string; detail: string; north: number; east: number }[]> = {
  bedfordview: [
    { detail: "Shopping centre", east: 2100, name: "Eastgate Shopping Centre", north: 1400 },
    { detail: "Town centre", east: -900, name: "Bedfordview town", north: 800 },
  ],
  bloemfontein: [
    { detail: "Shopping centre", east: -1900, name: "Mimosa Mall", north: -700 },
    { detail: "Town centre", east: 900, name: "Bloemfontein CBD", north: 1800 },
  ],
  "cape-town-mowbray": [
    { detail: "Shopping centre", east: 2800, name: "Cavendish Square", north: -900 },
    { detail: "Town centre", east: 700, name: "Mowbray town", north: 600 },
  ],
  "durban-umhlanga": [
    { detail: "Shopping centre", east: 1200, name: "Gateway Theatre of Shopping", north: 1500 },
    { detail: "Beachfront", east: 1700, name: "Umhlanga Promenade", north: -700 },
  ],
  "east-london": [
    { detail: "Shopping centre", east: -1500, name: "Hemingways Mall", north: 1100 },
    { detail: "Town centre", east: 1200, name: "East London CBD", north: -900 },
  ],
  "midrand-head-office": [
    { detail: "Shopping centre", east: -2600, name: "Mall of Africa", north: -1200 },
    { detail: "Town centre", east: 1300, name: "Midrand town centre", north: 1600 },
  ],
  "nelson-mandela-bay-gqeberha": [
    { detail: "Shopping centre", east: -2100, name: "Walmer Park", north: 800 },
    { detail: "Town centre", east: 1200, name: "Gqeberha CBD", north: -1100 },
  ],
  "nelspruit-mbombela": [
    { detail: "Shopping centre", east: -1700, name: "Riverside Mall", north: 1400 },
    { detail: "Town centre", east: 1300, name: "Mbombela CBD", north: -800 },
  ],
  potchefstroom: [
    { detail: "Shopping centre", east: 2200, name: "Mooirivier Mall", north: 1000 },
    { detail: "Town centre", east: 1500, name: "Potchefstroom CBD", north: -1100 },
  ],
  pretoria: [
    { detail: "Student area", east: -1800, name: "Hatfield Square", north: 1700 },
    { detail: "Town centre", east: 1600, name: "Pretoria CBD", north: -1300 },
  ],
  "tyger-valley-cape-town": [
    { detail: "Shopping centre", east: 1900, name: "Tyger Valley Centre", north: 700 },
    { detail: "Town centre", east: -1400, name: "Bellville CBD", north: -1200 },
  ],
  "vaal-vanderbijlpark": [
    { detail: "Shopping centre", east: 2100, name: "Vaal Mall", north: 900 },
    { detail: "Town centre", east: -1300, name: "Vanderbijlpark CBD", north: -1100 },
  ],
};

function nudge(from: LatLng, north: number, east: number): LatLng {
  return { latitude: from.latitude + north / 111_320, longitude: from.longitude + east / (111_320 * Math.cos((from.latitude * Math.PI) / 180)) };
}

/** The places a courier on this campus can choose to work: the campus itself and two areas nearby, different on every campus. */
export function zoneSeeds(campusId: CampusId, campusName: string): ZoneSeed[] {
  const centre = campusCenter[campusId];
  return [
    { detail: "Residences, library and the student centre", id: "campus", name: `${campusName} campus`, point: centre },
    ...AREAS[campusId].map((area, index) => ({ detail: area.detail, id: `area-${index + 1}`, name: area.name, point: nudge(centre, area.north, area.east) })),
  ];
}

/** Whether a point is inside any zone the courier has switched on. */
export function zoneCovers(zones: { on: boolean; latitude: number; longitude: number }[], point: LatLng): boolean {
  return zones.some((zone) => zone.on && distanceKm({ latitude: zone.latitude, longitude: zone.longitude }, point) <= ZONE_RADIUS_KM);
}
