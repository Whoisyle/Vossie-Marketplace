import { liveBackend } from "@/backend/mode";
import type { NotificationItem, Order } from "@/data/types";
import { applySellerAction } from "@/seller/bridge";
import { DEMO_STORE_ID, sellerId } from "@/seller/state";
import type { DemoAction, DemoState } from "@/state/demoReducer";

import { demoJobs, jobFromOrder, storePoint } from "./jobs";
import { courierReduce, DEMO_WAIT_MS, OFFER_MS, WAIT_MS } from "./state";
import type { CourierAction, CourierJob, FailReason, Vehicle } from "./types";

type Reduce = (state: DemoState, action: DemoAction) => DemoState;

const VEHICLE_LABEL: Record<Vehicle, string> = { bicycle: "Bicycle", car: "Car", scooter: "Scooter", walking: "On foot" };

export const REASON_LABEL: Record<FailReason, string> = {
  address: "the address was wrong or incomplete",
  refused: "the parcel was refused",
  unreachable: "you could not be reached",
  unsafe: "the drop-off spot was not safe",
};

function note(title: string, body: string, orderId: string): NotificationItem {
  return { body, createdAt: new Date().toISOString(), href: `/activity/order/${orderId}`, id: sellerId("n"), read: false, title };
}

/** The average of the ratings buyers gave, or 5 for a courier nobody has rated yet, which is what a new courier shows. */
export function courierRating(jobs: CourierJob[]): number {
  const rated = jobs.filter((job) => job.rating !== undefined);
  return rated.length === 0 ? 5 : Math.round((rated.reduce((sum, job) => sum + (job.rating ?? 0), 0) / rated.length) * 10) / 10;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0] || "Your courier";
}

/**
 * A courier action changes the courier's own state and, for a real job, the buyer's order and the seller's order behind it:
 * taking the job tells both, collecting it pays the seller and puts the buyer's order on the road, arriving tells the buyer to
 * read out their code, delivering finishes the buyer's order, and a failed delivery tells everyone what happened.
 */
export function applyCourierAction(state: DemoState, action: CourierAction, reduce: Reduce): DemoState {
  if (action.type === "courierSendMessage") return sendToBuyer(state, action.id, action.body);
  let courier = courierReduce(state.courier, action, { waitMs: liveBackend ? WAIT_MS : DEMO_WAIT_MS });
  if (courier === state.courier) return state;
  // a new courier going online for the first time is shown a few demo jobs, marked as demo, so the list is never empty
  if (action.type === "courierSetOnline" && action.online && !courier.jobs.some((job) => job.source === "demo")) {
    const now = Date.now();
    const seeds = demoJobs(now, courier.profile.campusId, courier.profile.vehicle).map((job, index) => ({ ...job, expiresAt: new Date(now + OFFER_MS - index * 100_000).toISOString() }));
    courier = { ...courier, jobs: [...courier.jobs, ...seeds], offersSeen: courier.offersSeen + seeds.length };
  }
  let next: DemoState = { ...state, courier };
  const id = "id" in action ? action.id : undefined;
  const before = id ? state.courier.jobs.find((job) => job.id === id) : undefined;
  const job = id ? courier.jobs.find((item) => item.id === id) : undefined;
  if (!job || !before || job.source !== "order" || !job.buyerOrderId || !job.sellerOrderId) return next;
  const buyer = next.orders.find((order) => order.id === job.buyerOrderId);
  const patchBuyer = (patch: Partial<Order>): DemoState => ({ ...next, orders: next.orders.map((order) => (order.id === job.buyerOrderId ? { ...order, ...patch } : order)) });
  const tell = (title: string, body: string): DemoState => ({ ...next, notifications: [note(title, body, job.buyerOrderId!), ...next.notifications] });

  switch (action.type) {
    case "courierAcceptJob": {
      const rating = courierRating(courier.jobs);
      next = applySellerAction(next, { courier: { arrivesInMin: Math.max(2, Math.round(job.minutes / 2)), name: shortName(courier.profile.fullName), rating, vehicle: VEHICLE_LABEL[courier.profile.vehicle] }, id: job.sellerOrderId!, type: "sellerCourierTaken" }, reduce);
      next = { ...next, orders: next.orders.map((order) => (order.id === job.buyerOrderId ? { ...order, courier: { name: shortName(courier.profile.fullName), phone: courier.profile.phone, rating, vehicle: VEHICLE_LABEL[courier.profile.vehicle] } } : order)) };
      next = { ...next, notifications: [note("A courier has your order", `${shortName(courier.profile.fullName)} is on the way to collect ${job.number} from the seller.`, job.buyerOrderId!), ...next.notifications] };
      break;
    }
    case "courierConfirmPickup": {
      // the seller is paid and the order is on its way: the same steps as the seller handing it over by scan
      next = applySellerAction(next, { id: job.sellerOrderId!, type: "sellerHandToCourier" }, reduce);
      break;
    }
    case "courierArrive": {
      next = tell("Your courier has arrived", `Give ${shortName(courier.profile.fullName)} your delivery code ${job.deliveryCode} to get your order.`);
      break;
    }
    case "courierConfirmDelivery": {
      next = patchBuyer({ deliveredAt: new Date().toISOString(), status: "delivered" });
      next = { ...next, notifications: [note("Order delivered", `Your order ${job.number} was handed over. Rate your courier from the order.`, job.buyerOrderId!), ...next.notifications] };
      break;
    }
    case "courierFailAttempt": {
      const returning = job.status === "returning";
      const why = REASON_LABEL[action.reason];
      next = tell(returning ? "We could not deliver your order" : "Your courier could not reach you", returning ? `After two tries (${why}), ${job.number} is going back to the seller. You will be refunded the items and the delivery fee is kept.` : `Your courier tried but ${why}. They will try once more.`);
      if (returning) next = applySellerAction(next, { code: job.returnCode, id: job.sellerOrderId!, type: "sellerCourierReturning" }, reduce);
      break;
    }
    default:
      break;
  }
  void buyer;
  return next;
}

/**
 * When the seller marks a delivery order ready and a courier is approved on this phone, the order becomes a job offer for them.
 * Without an approved courier the demo's own courier takes it, as before.
 */
export function routeReadyToCourier(before: DemoState, after: DemoState): DemoState {
  if (after.courier.status !== "approved") return after;
  let courier = after.courier;
  for (const order of after.seller.orders) {
    const was = before.seller.orders.find((item) => item.id === order.id);
    if (order.status !== "ready" || was?.status === "ready" || order.fulfilment !== "delivery" || !order.buyerOrderId) continue;
    if (courier.jobs.some((job) => job.sellerOrderId === order.id)) continue;
    const buyer = after.orders.find((item) => item.id === order.buyerOrderId);
    if (!buyer || (buyer.deliveryMode ?? "campus-courier") !== "campus-courier") continue;
    const campusId = after.profile?.campusId ?? courier.profile.campusId;
    const place = after.seller.profile.place;
    const job = jobFromOrder({
      buyer,
      buyerName: after.profile?.fullName ?? order.buyerName,
      buyerPhone: after.profile?.phone,
      campusId,
      now: Date.now(),
      pickup: place ? { detail: place.address.split(",")[0] ?? place.name, name: after.seller.profile.storeName || place.name, phone: after.seller.profile.phone, point: { latitude: place.latitude, longitude: place.longitude } } : { detail: after.seller.profile.location || "Campus", name: after.seller.profile.storeName || "Your store", phone: after.seller.profile.phone, point: storePoint(DEMO_STORE_ID, campusId) },
      seller: order,
      vehicle: courier.profile.vehicle,
    });
    courier = courierReduce(courier, { job, type: "courierReceiveJob" });
  }
  return courier === after.courier ? after : { ...after, courier };
}

/** A buyer's rating of the courier becomes part of the courier's score and may carry a tip. */
export function routeRatingToCourier(before: DemoState, after: DemoState, action: DemoAction): DemoState {
  if (action.type !== "rateCourier" || after.orders === before.orders) return after;
  const job = after.courier.jobs.find((item) => item.buyerOrderId === action.orderId);
  if (!job) return after;
  const courier = courierReduce(after.courier, { feedback: action.comment, id: job.id, rating: action.rating, tipCents: action.tipCents, type: "courierRated" });
  return courier === after.courier ? after : { ...after, courier };
}

/** The courier writes to the buyer: the message lands in the buyer's thread for that order, and the buyer is told. */
function sendToBuyer(state: DemoState, jobId: string, body: string): DemoState {
  const job = state.courier.jobs.find((item) => item.id === jobId);
  const text = body.trim();
  if (!job || !job.buyerOrderId || !text) return state;
  const conversationId = `courier-${job.buyerOrderId}`;
  const message = { body: text, fromMe: false, id: sellerId("m"), sentAt: new Date().toISOString() };
  const exists = state.conversations.some((item) => item.id === conversationId);
  const name = shortName(state.courier.profile.fullName);
  const conversations = exists
    ? state.conversations.map((item) => (item.id === conversationId ? { ...item, messages: [...item.messages, message], unread: true } : item))
    : [{ id: conversationId, kind: "courier" as const, messages: [message], name, orderId: job.buyerOrderId, unread: true }, ...state.conversations];
  return { ...state, conversations, notifications: [{ body: text, createdAt: message.sentAt, href: `/account/inbox/${conversationId}`, id: sellerId("n"), read: false, title: `${name} (courier)` }, ...state.notifications] };
}
