import { campusCenter, distanceKm, storeLocation, type LatLng } from "@/data/geo";
import type { CampusId, Order } from "@/data/types";
import type { SellerOrder } from "@/seller/types";

import { courierFeeCents, distanceBonusCents, tripMinutes } from "./pay";
import { fourDigits } from "./state";
import type { CourierJob, JobItem, Vehicle } from "./types";

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
    const payout = courierFeeCents(km);
    const id = `demo-job-${index + 1}`;
    return {
      attempts: [],
      bonusCents: distanceBonusCents(payout),
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
