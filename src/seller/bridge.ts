import { getListing } from "@/data/repository";
import type { Order, NotificationItem } from "@/data/types";
import type { DemoAction, DemoState } from "@/state/demoReducer";

import { sellerPlanOf } from "./plan";
import { storeIsLive } from "./catalogue";
import { courierCodeFor, DEMO_STORE_ID, handoffCodeFor, orderNumberFrom, platformFeeCents, sellerId, sellerReduce, shortName } from "./state";
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
    case "sellerResolveCase": {
      const found = seller.cases.find((item) => item.id === action.id);
      const request = found ? next.returns.find((item) => item.id === found.id) : undefined;
      if (!found || !request || request.status !== "open") break;
      const money = (found.amountCents / 100).toFixed(2);
      const answer =
        action.decision === "approve"
          ? { response: `Refund approved. R ${money} is back in your wallet.`, status: "approved" as const }
          : action.decision === "decline"
            ? { response: action.text?.trim() || "The seller declined this return.", status: "declined" as const }
            : { response: action.text?.trim() || "The seller is looking into it and will reply.", status: "replied" as const };
      next = reduce(next, { id: found.id, refundCents: found.amountCents, type: "returnAnswered", ...answer });
      break;
    }
    case "sellerReplyReview": {
      // the reply shows under the buyer's own review on the store page, which reads it from the seller side
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
    // what the buyer ordered comes off the seller's stock
    seller = { ...seller, listings: seller.listings.map((listing) => {
      const bought = order.lines.filter((line) => line.listingId === listing.id).reduce((sum, line) => sum + line.quantity, 0);
      return bought > 0 && !listing.unlimited ? { ...listing, onHand: Math.max(0, listing.onHand - bought) } : listing;
    }) };
    // an order the auto-accept rule took is accepted for the buyer too
    if (seller.orders.find((item) => item.id === incoming.id)?.status === "accepted") {
      orders = orders.map((item) => (item.id === order.id ? { ...item, status: "accepted" as const } : item));
    }
  }
  return { ...after, orders, seller };
}

/**
 * What the buyer does that the seller who runs the store should see: a review, a return or reported problem, a follow and
 * a message. Called with the state before and after the buyer's action. It only does anything when the signed-in student runs
 * a live store and the action was about that store.
 */
export function routeBuyerActionToSeller(before: DemoState, after: DemoState, action: DemoAction): DemoState {
  if (!storeIsLive(after.seller)) return after;
  const storeId = after.seller.profile.storeId;
  const me = shortName(after.profile?.fullName ?? "A student");
  switch (action.type) {
    case "addReview": {
      const review = after.reviews.find((item) => !before.reviews.some((old) => old.id === item.id));
      if (!review || review.sellerId !== storeId) return after;
      return { ...after, seller: sellerReduce(after.seller, { review: { author: review.author, createdAt: review.createdAt, id: review.id, rating: review.rating, text: review.body }, type: "sellerReceiveReview" }) };
    }
    case "openReturn": {
      const request = after.returns.find((item) => !before.returns.some((old) => old.id === item.id));
      const order = request ? after.orders.find((item) => item.id === request.orderId) : undefined;
      if (!request || !order || order.sellerId !== storeId) return after;
      return {
        ...after,
        seller: sellerReduce(after.seller, {
          case: { amountCents: order.subtotalCents, buyerOrderId: order.id, createdAt: request.createdAt, id: request.id, kind: request.kind, orderNumber: order.number.startsWith("#VM") ? order.number : orderNumberFrom(order.number), photos: 0, reason: request.reason, status: "open", title: request.title },
          type: "sellerReceiveCase",
        }),
      };
    }
    case "toggleReelLike": {
      const reel = after.seller.reels.find((item) => item.id === action.reelId);
      if (!reel) return after;
      return { ...after, seller: sellerReduce(after.seller, { id: reel.id, likes: after.likedReels.includes(reel.id) ? 1 : -1, type: "sellerReelEvent" }) };
    }
    case "toggleFollow": {
      if (action.sellerId !== storeId || !after.following.includes(storeId) || before.following.includes(storeId)) return after;
      return { ...after, seller: sellerReduce(after.seller, { body: `${me} is now following ${after.seller.profile.storeName || "your store"}.`, href: "/seller/account/store-preview", kind: "account", title: "New follower", type: "sellerNote" }) };
    }
    case "sendMessage": {
      const bought = `seller-${storeId}`;
      const inbox = `inbox-${storeId}`;
      const at = new Date().toISOString();
      if (action.conversationId === bought) {
        // the buyer wrote to the store: it lands in the seller's Messages
        const sent = after.conversations.find((item) => item.id === bought)?.messages.at(-1);
        if (!sent) return after;
        const mirror = after.conversations.find((item) => item.id === inbox);
        const message = { body: sent.body, fromMe: false, id: sellerId("m"), sentAt: at };
        const conversations = mirror
          ? after.conversations.map((item) => (item.id === inbox ? { ...item, messages: [...item.messages, message], unread: true } : item))
          : [{ id: inbox, kind: "buyer" as const, messages: [message], name: me, unread: true }, ...after.conversations];
        return { ...after, conversations, seller: sellerReduce(after.seller, { body: `${me}: ${sent.body}`, href: `/seller/home/messages/${inbox}`, kind: "message", title: "New message", type: "sellerNote" }) };
      }
      if (action.conversationId === inbox) {
        // the seller answered: it lands in the buyer's inbox with a notification
        const sent = after.conversations.find((item) => item.id === inbox)?.messages.at(-1);
        if (!sent) return after;
        const theirs = after.conversations.find((item) => item.id === bought);
        const message = { body: sent.body, fromMe: false, id: sellerId("m"), sentAt: at };
        const name = after.seller.profile.storeName || "The store";
        const conversations = theirs
          ? after.conversations.map((item) => (item.id === bought ? { ...item, messages: [...item.messages, message], unread: true } : item))
          : [{ id: bought, kind: "seller" as const, messages: [message], name, unread: true }, ...after.conversations];
        return { ...after, conversations, notifications: [{ body: sent.body, createdAt: at, href: `/account/inbox/${bought}`, id: sellerId("n"), read: false, title: `${name} replied` }, ...after.notifications] };
      }
      return after;
    }
    default:
      return after;
  }
}
