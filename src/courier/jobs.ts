import { campusCenter, distanceKm, storeLocation, type LatLng } from "@/data/geo";
import type { CampusId, Order } from "@/data/types";
import type { SellerOrder } from "@/seller/types";

import { courierFeeCents, distanceBonusCents, tripMinutes } from "./pay";
import { fourDigits, unitOf } from "./codes";
import type { CourierJob, CourierPayout, EarningEntry, JobItem, Vehicle } from "./types";

/** The delivery code a buyer reads out at the door: the same four digits for the same order wherever it is asked. */
export function deliveryCodeFor(orderId: string): string {
  return fourDigits(orderId, "deliver");
}

export function returnCodeFor(orderId: string): string {
  return fourDigits(orderId, "return");
}

/** Things that break or are worth a lot, so the courier is told to be careful. */
const FRAGILE = /calculator|laptop|tablet|phone|headphone|lamp|glass|hub|monitor|speaker|camera/i;

function offsetPoint(from: LatLng, northMetres: number, eastMetres: number): LatLng {
  return { latitude: from.latitude + northMetres / 111_320, longitude: from.longitude + eastMetres / (111_320 * Math.cos((from.latitude * Math.PI) / 180)) };
}

function parcelLabel(size: SellerOrder["parcelSize"], itemCount: number): string {
  const label = size === "large" ? "Large · 6 kg" : size === "medium" ? "Medium · 3 kg" : "Small · 1.2 kg";
  return itemCount > 1 && !size ? "Medium · 3 kg" : label;
}

function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0] ?? "Student";
}

/**
 * A real delivery job from a buyer's order the seller has marked ready. The courier's pay is the delivery fee the buyer paid
 * (or the distance fee when the buyer got free delivery), and the codes are the ones the seller and the buyer already have.
 */
export function jobFromOrder(input: { seller: SellerOrder; buyer: Order; pickup: { name: string; detail: string; point: LatLng; phone?: string }; campusId: CampusId; vehicle: Vehicle; now: number; buyerName: string; buyerPhone?: string }): CourierJob {
  const { buyer, pickup, seller } = input;
  const drop = buyer.destination ?? offsetPoint(campusCenter[input.campusId], -280, 340);
  const km = Math.max(0.4, Math.round(distanceKm(pickup.point, drop) * 10) / 10);
  const payout = buyer.deliveryFeeCents > 0 ? buyer.deliveryFeeCents : courierFeeCents(km);
  const items: JobItem[] = seller.lines.map((line) => ({ fragile: FRAGILE.test(line.title), quantity: line.quantity, title: line.title }));
  const fragile = items.filter((item) => item.fragile);
  return {
    attempts: [],
    bonusCents: distanceBonusCents(payout),
    buyerName: firstName(input.buyerName),
    buyerOrderId: buyer.id,
    buyerPhone: input.buyerPhone,
    deliveryCode: deliveryCodeFor(buyer.id),
    demoCodes: false,
    distanceKm: km,
    dropoff: { detail: buyer.address, latitude: drop.latitude, longitude: drop.longitude, name: firstName(input.buyerName) },
    expiresAt: null,
    handling: fragile.length > 0 ? `Fragile (${fragile.map((item) => item.title.split(" ")[0]!.toLowerCase()).join(", ")})` : "Standard",
    id: `job-${seller.id}`,
    instructions: seller.courierNote,
    items,
    leaveAtDoor: buyer.leaveAtDoor === true,
    minutes: tripMinutes(km, input.vehicle),
    number: `#VM-${buyer.number.replace(/\D/g, "").slice(-4)}`,
    offeredAt: new Date(input.now).toISOString(),
    parcel: parcelLabel(seller.parcelSize, items.length),
    payment: "Paid in app · no cash",
    payoutCents: payout,
    pickup: { detail: pickup.detail, latitude: pickup.point.latitude, longitude: pickup.point.longitude, name: pickup.name, phone: pickup.phone },
    pickupCode: seller.courierCode,
    progress: 0,
    returnCode: returnCodeFor(buyer.id),
    sellerOrderId: seller.id,
    source: "order",
    status: "offered",
    storeName: pickup.name,
  };
}

type Template = { store: string; pickup: string; buyer: string; drop: string; north: number; east: number; items: JobItem[]; handling: string; instructions?: string; parcel: string };

const TEMPLATES: Template[] = [
  { buyer: "Thabo M.", drop: "Res Block D, room 214", east: 320, handling: "Fragile (calculator)", instructions: "Call on arrival. Gate code needed.", items: [{ artId: "casio-calculator", fragile: true, quantity: 1, title: "Scientific calculator" }], north: -520, parcel: "Small · 1.2 kg", pickup: "Res Block B", store: "Vumisa's Thrift" },
  { buyer: "Lerato S.", drop: "Potch CBD, Lekwa Street", east: 1380, handling: "Standard", items: [{ artId: "textbook-econ", fragile: false, quantity: 1, title: "Economics textbook" }, { artId: "green-folders", fragile: false, quantity: 1, title: "Folders (10 pack)" }], north: 1810, parcel: "Medium · 3 kg", pickup: "Library", store: "Campus Books" },
  { buyer: "Sipho K.", drop: "Res Block A, front gate", east: -150, handling: "Standard", items: [{ artId: "kota-special", fragile: false, quantity: 2, title: "Kota special" }], north: 280, parcel: "Small · 1.2 kg", pickup: "Canteen window", store: "Campus Eats" },
  { buyer: "Naledi P.", drop: "Mooirivier Mall, main entrance", east: 2500, handling: "Fragile (headphones)", items: [{ artId: "headphones", fragile: true, quantity: 1, title: "Wireless headphones" }], north: -900, parcel: "Small · 1.2 kg", pickup: "IT lab 2", store: "TechSwap Potch" },
];

/**
 * Jobs to show when a new courier first goes online, so the Jobs list is never empty. They are labelled demo jobs, and because
 * there is no seller or buyer app behind them, they show both codes.
 */
export function demoJobs(now: number, campusId: CampusId, vehicle: Vehicle, count = 3): CourierJob[] {
  const centre = campusCenter[campusId];
  return TEMPLATES.slice(0, count).map((template, index) => {
    const pickup = offsetPoint(centre, 40 * (index + 1), 60 * (index + 1));
    const drop = offsetPoint(pickup, template.north, template.east);
    const km = Math.max(0.4, Math.round(distanceKm(pickup, drop) * 10) / 10);
    const boost = index === 1 ? 800 : 0;
    const payout = courierFeeCents(km) + boost;
    const id = `demo-job-${index + 1}`;
    return {
      attempts: [],
      bonusCents: distanceBonusCents(payout - boost),
      boostCents: boost || undefined,
      buyerName: template.buyer,
      deliveryCode: fourDigits(id, "deliver"),
      demoCodes: true,
      distanceKm: km,
      dropoff: { detail: template.drop, latitude: drop.latitude, longitude: drop.longitude, name: template.buyer },
      expiresAt: null,
      handling: template.handling,
      id,
      instructions: template.instructions,
      items: template.items,
      leaveAtDoor: index === 2,
      minutes: tripMinutes(km, vehicle),
      number: `#VM-${2100 + index * 7 + 1}`,
      offeredAt: new Date(now - index * 20_000).toISOString(),
      parcel: template.parcel,
      payment: "Paid in app · no cash",
      payoutCents: payout,
      pickup: { detail: template.pickup, latitude: pickup.latitude, longitude: pickup.longitude, name: template.store },
      pickupCode: fourDigits(id, "pickup"),
      progress: 0,
      returnCode: fourDigits(id, "return"),
      source: "demo" as const,
      status: "offered" as const,
      storeName: template.store,
    };
  });
}

/** The seller's pickup point for an order: their own place when they set one, else the demo store on campus. */
export function storePoint(sellerId: string, campusId: CampusId): LatLng {
  return storeLocation(sellerId, campusId);
}

const FEEDBACK = [
  "Fast, polite and kept me updated all the way.",
  "Arrived early and the parcel was spotless.",
  "Great communication, came straight to my door.",
  "Super quick, thank you!",
  "Called when he was close, very helpful.",
  "Perfect. Exactly on time.",
  "Friendly and careful with my calculator.",
  "Handled the gate code without any fuss.",
];
const BUYERS = ["Lerato S.", "Thabo M.", "Naledi P.", "Sipho K.", "Chloe R.", "Aiden P.", "Zinhle K.", "Kamo D.", "Palesa S.", "Mpho L."];

/**
 * An experienced courier's past, so every page has something to show (owner request, 2026-10-21): 86 deliveries over the last month with
 * a 4.9 rating, tips, the odd offer turned down, one cancelled by a buyer, the weekly payouts that have gone out, and what is left to
 * be paid this week. It is demo data; the deliveries the app makes add to it.
 */
export function demoHistory(now: number, campusId: CampusId, vehicle: Vehicle, name: string): { jobs: CourierJob[]; earnings: EarningEntry[]; payouts: CourierPayout[]; bank: { accountHolder: string; bankName: string; last4: string } } {
  const centre = campusCenter[campusId];
  const jobs: CourierJob[] = [];
  const earnings: EarningEntry[] = [];
  for (let index = 0; index < 86; index += 1) {
    const template = TEMPLATES[index % TEMPLATES.length]!;
    const km = Math.round((0.6 + unitOf(`km-${index}`) * 2.8) * 10) / 10;
    const payout = courierFeeCents(km);
    const deliveredAt = now - (index * 8.4 + 3 + unitOf(`t-${index}`) * 3) * 3_600_000;
    const minutes = tripMinutes(km, vehicle);
    const late = index % 29 === 7;
    const acceptedAt = deliveredAt - (late ? minutes + 40 : minutes + 6) * 60_000;
    const rated = index % 5 !== 3 || index % 10 === 3;
    const rating = rated ? (index % 10 === 6 ? 4 : 5) : undefined;
    const tip = index % 6 === 2 ? 500 + (index % 4) * 500 : 0;
    const pickup = offsetPoint(centre, 40 * ((index % 5) + 1), 60 * ((index % 4) + 1));
    const drop = offsetPoint(pickup, template.north * 0.6, template.east * 0.6);
    const id = `hist-${index}`;
    jobs.push({
      acceptedAt: new Date(acceptedAt).toISOString(),
      attempts: [],
      bonusCents: distanceBonusCents(payout),
      buyerName: BUYERS[index % BUYERS.length]!,
      deliveredAt: new Date(deliveredAt).toISOString(),
      deliveryCode: fourDigits(id, "deliver"),
      demoCodes: false,
      distanceKm: km,
      dropoff: { detail: template.drop, latitude: drop.latitude, longitude: drop.longitude, name: BUYERS[index % BUYERS.length]! },
      expiresAt: null,
      feedback: rating && index % 3 === 0 ? FEEDBACK[index % FEEDBACK.length] : undefined,
      handling: template.handling,
      id,
      items: template.items,
      leaveAtDoor: false,
      minutes,
      note: undefined,
      number: `#VM-${2000 + index * 3}`,
      offeredAt: new Date(acceptedAt - 60_000).toISOString(),
      parcel: template.parcel,
      payment: "Paid in app · no cash",
      payoutCents: payout,
      pickedUpAt: new Date(acceptedAt + 5 * 60_000).toISOString(),
      pickup: { detail: template.pickup, latitude: pickup.latitude, longitude: pickup.longitude, name: template.store },
      pickupCode: fourDigits(id, "pickup"),
      progress: 1,
      proof: "otp",
      rating,
      returnCode: fourDigits(id, "return"),
      source: "demo",
      status: "delivered",
      storeName: template.store,
      tipCents: tip || undefined,
    });
    earnings.push({ at: new Date(deliveredAt).toISOString(), cents: payout, id: `he-${index}`, jobId: id, kind: "delivery", number: `#VM-${2000 + index * 3}` });
    if (tip > 0) earnings.push({ at: new Date(deliveredAt + 60_000).toISOString(), cents: tip, id: `ht-${index}`, jobId: id, kind: "tip", number: `#VM-${2000 + index * 3}` });
  }
  // offers turned down or run out, and one the buyer cancelled
  for (let index = 0; index < 7; index += 1) {
    const base = jobs[index * 11]!;
    jobs.push({ ...base, acceptedAt: undefined, deliveredAt: undefined, feedback: undefined, id: `hist-skip-${index}`, number: `#VM-${1900 + index}`, pickedUpAt: undefined, proof: undefined, rating: undefined, status: index % 2 === 0 ? "declined" : "expired", tipCents: undefined });
  }
  jobs.push({ ...jobs[40]!, deliveredAt: undefined, feedback: undefined, id: "hist-cancel", number: "#VM-1899", pickedUpAt: undefined, proof: undefined, rating: undefined, status: "cancelled", tipCents: undefined });

  // the weekly payouts for the weeks before this one went out on Fridays; this week's money is still waiting
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = new Map<number, number>();
  for (const entry of earnings) {
    const at = new Date(entry.at).getTime();
    if (at >= monday.getTime()) continue;
    const start = new Date(at);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    weeks.set(start.getTime(), (weeks.get(start.getTime()) ?? 0) + entry.cents);
  }
  const payouts: CourierPayout[] = [...weeks.entries()].sort((a, b) => b[0] - a[0]).map(([start, cents]) => ({ cents, id: `hp-${start}`, label: "Weekly payout", on: new Date(start + 4 * 86_400_000 + 9 * 3_600_000).toISOString(), status: "paid" as const }));
  return { bank: { accountHolder: name, bankName: "FNB", last4: "1234" }, earnings: earnings.sort((a, b) => b.at.localeCompare(a.at)), jobs, payouts };
}
