import { getListing } from "@/data/repository";
import type { Order, NotificationItem } from "@/data/types";
import type { DemoAction, DemoState } from "@/state/demoReducer";

import { sellerPlanOf } from "./plan";
import { courierCodeFor, DEMO_STORE_ID, handoffCodeFor, platformFeeCents, sellerId, sellerReduce } from "./state";
import type { SellerAction, SellerOrder } from "./types";

/** Runs the reducer for everything that is not a seller action. Passed in by `demoReducer` so the two files do not import each other. */
type Reduce = (state: DemoState, action: DemoAction) => DemoState;

function note(title: string, body: string, orderId: string): NotificationItem {
  return { body, createdAt: new Date().toISOString(), href: `/activity/order/${orderId}`, id: sellerId("n"), read: false, title, };
}

/**
 * Seller actions touch two places in the demo: the seller's own state and, when the order came from a buyer in this
 * app, that buyer's order. The seller accepting, preparing, readying or completing an order moves the buyer's order
 * the same way, with the same notifications the buyer would get from a real seller.
 */
export function applySellerAction(state: DemoState, action: SellerAction, reduce: Reduce): DemoState {
  const seller = sellerReduce(state.seller, action, { plan: sellerPlanOf(state.subscriptions), verifiedStudent: state.profile?.isVerifiedStudent ?? false });
  if (seller === state.seller) return state;
  let next: DemoState = { ...state, seller };

  const linked = (id: string): { order: SellerOrder; buyer: Order } | null => {
    const order = seller.orders.find((item) => item.id === id);
    const buyer = order?.buyerOrderId ? next.orders.find((item) => item.id === order.buyerOrderId) : undefined;
    return order && buyer ? { buyer, order } : null;
  };

  switch (action.type) {
    case "sellerRespondOrder": {
      const pair = linked(action.id);
      if (!pair) break;
      if (action.accept) {
        next = reduce(next, { orderId: pair.buyer.id, status: "accepted", type: "advanceOrder" });
      } else {
        const name = getListing(pair.buyer.lines[0]?.listingId ?? "")?.title ?? "your order";
        next = {
          ...next,
          notifications: [note("Order declined", `The seller could not take ${pair.buyer.number} (${name}). ${action.reason ?? ""}`.trim(), pair.buyer.id), ...next.notifications],
          orders: next.orders.map((item) => (item.id === pair.buyer.id ? { ...item, status: "cancelled" } : item)),
        };
      }
      break;
    }
    case "sellerBulkAccept": {
      // every order that was waiting is now accepted, and so is the buyer's order behind each one
      for (const item of seller.orders) {
        const was = state.seller.orders.find((old) => old.id === item.id);
        if (was?.status !== "new" || item.status !== "accepted") continue;
        const pair = linked(item.id);
        if (pair) next = reduce(next, { orderId: pair.buyer.id, status: "accepted", type: "advanceOrder" });
      }
      break;
    }
    case "sellerAdvanceOrder": {
      const pair = linked(action.id);
      if (pair) next = reduce(next, { orderId: pair.buyer.id, status: action.to, type: "advanceOrder" });
      break;
    }
    case "sellerHandToCourier":
    case "sellerCompleteOrder": {
      const pair = linked(action.id);
      if (!pair || pair.buyer.status === "delivered") break;
      const at = new Date().toISOString();
      next = {
        ...next,
        notifications: [action.type === "sellerHandToCourier" ? note("Your order is on its way", `A courier has collected ${pair.buyer.number} from the seller.`, pair.buyer.id) : note("Order collected", `Order ${pair.buyer.number} was handed over. Enjoy!`, pair.buyer.id), ...next.notifications],
        orders: next.orders.map((item) => (item.id === pair.buyer.id ? { ...item, deliveredAt: at, status: "delivered" } : item)),
      };
      break;
    }
    default:
      break;
  }
  return next;
}

/**
 * When a buyer in this app orders from the store the seller runs, the order lands in the seller's Orders as New.
 * Only once the seller is approved; before that there is nobody to take it.
 */
export function routeNewOrdersToSeller(before: DemoState, after: DemoState): DemoState {
  if (after.seller.status !== "approved") return after;
  const fresh = after.orders.filter((order) => order.sellerId === DEMO_STORE_ID && !before.orders.some((previous) => previous.id === order.id));
  if (fresh.length === 0) return after;
  let seller = after.seller;
  let orders = after.orders;
  for (const order of fresh) {
    const subtotal = order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const incoming: SellerOrder = {
      buyerName: after.profile?.fullName.split(" ").map((part, i) => (i === 0 ? part : `${part[0]}.`)).join(" ") ?? "A student",
      buyerOrderId: order.id,
      buyerVerified: after.profile?.isVerifiedStudent ?? false,
      courierCode: courierCodeFor(order.id),
      deliveryFeeCents: 0,
      feeCents: platformFeeCents(subtotal, sellerPlanOf(after.subscriptions)),
      fulfilment: order.fulfilment,
      fulfilmentLabel: order.fulfilment === "delivery" ? "Delivery" : "Campus collection",
      handoffCode: handoffCodeFor(order.id),
      id: sellerId("so"),
      lines: order.lines.map((line) => ({ optionLabel: line.optionLabel, quantity: line.quantity, title: line.title, unitPriceCents: line.unitPriceCents })),
      number: `#${order.number.replace(/\D/g, "").slice(-4)}`,
      paymentLabel: order.paymentMethod === "wallet" ? "Paid from wallet" : "Paid in app",
      place: order.address,
      placedAt: order.placedAt,
      status: "new",
      subtotalCents: subtotal,
      totalCents: subtotal,
    };
    seller = sellerReduce(seller, { order: incoming, type: "sellerReceiveOrder" }, { plan: sellerPlanOf(after.subscriptions), verifiedStudent: after.profile?.isVerifiedStudent ?? false });
    // an order the auto-accept rule took is accepted for the buyer too
    if (seller.orders.find((item) => item.id === incoming.id)?.status === "accepted") {
      orders = orders.map((item) => (item.id === order.id ? { ...item, status: "accepted" as const } : item));
    }
  }
  return { ...after, orders, seller };
}
