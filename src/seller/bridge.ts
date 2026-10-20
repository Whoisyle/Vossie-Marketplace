import { getListing } from "@/data/repository";
import type { Order, NotificationItem } from "@/data/types";
import type { DemoAction, DemoState } from "@/state/demoReducer";

import { DEMO_STORE_ID, handoffCodeFor, sellerId, sellerReduce } from "./state";
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
  const seller = sellerReduce(state.seller, action, { verifiedStudent: state.profile?.isVerifiedStudent ?? false });
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
    case "sellerAdvanceOrder": {
      const pair = linked(action.id);
      if (pair) next = reduce(next, { orderId: pair.buyer.id, status: action.to, type: "advanceOrder" });
      break;
    }
    case "sellerCompleteOrder": {
      const pair = linked(action.id);
      if (!pair || pair.buyer.status === "delivered") break;
      const at = new Date().toISOString();
      next = {
        ...next,
        notifications: [note("Order collected", `Order ${pair.buyer.number} was handed over. Enjoy!`, pair.buyer.id), ...next.notifications],
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
  for (const order of fresh) {
    const subtotal = order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
    const incoming: SellerOrder = {
      buyerName: after.profile?.fullName.split(" ").map((part, i) => (i === 0 ? part : `${part[0]}.`)).join(" ") ?? "A student",
      buyerOrderId: order.id,
      buyerVerified: after.profile?.isVerifiedStudent ?? false,
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
    seller = sellerReduce(seller, { order: incoming, type: "sellerReceiveOrder" });
  }
  return { ...after, seller };
}
