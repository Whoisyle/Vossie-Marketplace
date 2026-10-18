import { rpc, supabase, unwrap } from "./client";
import type {
  CartQuote, CodeCheck, HandoffCode, PlaceOrderResult, SellerOrderRow,
} from "./types";

export type Fulfilment = "campus_handoff" | "vossie_delivery";
export type PayWith = "wallet" | "card" | "apple_pay" | "google_pay";

export type CartLineRow = {
  id: string;
  quantity: number;
  slot_id: string | null;
  listing: { id: string; title: string; type: "goods" | "service"; seller_id: string };
  option: { id: string; label: string; price_cents: number };
};

export async function getCart(): Promise<CartLineRow[]> {
  const rows = unwrap(
    await supabase
      .from("cart_items")
      .select("id, quantity, slot_id, listing:listings(id, title, type, seller_id), option:listing_options(id, label, price_cents)")
      .order("created_at"),
  );
  return rows as unknown as CartLineRow[];
}

export const addToCart = (optionId: string, quantity = 1, slotId?: string) =>
  rpc<string>("cart_add", { p_option_id: optionId, p_quantity: quantity, p_slot_id: slotId ?? null });
export const setCartQuantity = (itemId: string, quantity: number) => rpc("cart_set_quantity", { p_item_id: itemId, p_quantity: quantity });
export const clearCart = () => rpc("cart_clear");

/** Price preview for checkout. The real price is computed again when the order is placed. */
export const quoteCart = (fulfilment: Fulfilment, voucher?: string) =>
  rpc<CartQuote>("quote_cart", { p_fulfilment: fulfilment, p_voucher_code: voucher || null });

/** A fresh key per checkout attempt; reuse it when retrying the same attempt so it can't double-charge. */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function placeOrder(input: {
  fulfilment: Fulfilment;
  method: PayWith;
  idempotencyKey: string;
  address?: string;
  instructions?: string;
  voucher?: string;
  paymentMethodId?: string;
}): Promise<PlaceOrderResult> {
  const result = await rpc<PlaceOrderResult>("place_order", {
    p_fulfilment: input.fulfilment,
    p_method: input.method,
    p_idempotency_key: input.idempotencyKey,
    p_address: input.address ?? null,
    p_instructions: input.instructions ?? "",
    p_voucher_code: input.voucher || null,
    p_payment_method_id: input.paymentMethodId ?? null,
  });
  if (result.status === "pending_payment" && result.payment_intent_id) {
    // Card, Apple Pay and Google Pay are completed by the provider; the webhook marks the order paid.
    await supabase.functions.invoke("payments-create", { body: { intent_id: result.payment_intent_id } });
  }
  return result;
}

const ORDER_SELECT =
  "id, order_id, number, seller_id, seller_user_id, buyer_id, status, fulfilment, has_goods, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, refunded_cents, accept_by, issue_window_ends_at, created_at, order_items(id, listing_id, type, title, option_label, unit_price_cents, quantity, line_total_cents)";

/** Orders where I am the buyer. */
export async function listMyOrders(): Promise<SellerOrderRow[]> {
  const rows = unwrap(await supabase.from("seller_orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(100));
  return rows as unknown as SellerOrderRow[];
}

export async function getOrder(id: string) {
  const [order, events, courier, bookings] = await Promise.all([
    supabase.from("seller_orders").select(ORDER_SELECT).eq("id", id).maybeSingle(),
    supabase.from("order_events").select("to_status, note, created_at").eq("seller_order_id", id).order("id"),
    supabase.from("delivery_courier_cards").select("job_id, status, courier_name, vehicle, rating_avg").eq("seller_order_id", id).maybeSingle(),
    supabase.from("bookings").select("id, starts_at, ends_at, status, cancel_cutoff_at").eq("seller_order_id", id),
  ]);
  return {
    order: unwrap(order) as unknown as SellerOrderRow | null,
    events: unwrap(events),
    courier: unwrap(courier),
    bookings: unwrap(bookings),
  };
}

export const cancelOrder = (sellerOrderId: string) => rpc("buyer_cancel_order", { p_seller_order_id: sellerOrderId });
export const confirmReceived = (sellerOrderId: string) => rpc("buyer_confirm_received", { p_seller_order_id: sellerOrderId });
export const openIssue = (sellerOrderId: string, kind: "order_issue" | "dispute" | "handoff_issue" | "no_show", reason: string) =>
  rpc<string>("open_order_issue", { p_seller_order_id: sellerOrderId, p_kind: kind, p_reason: reason });
export const revealCode = (sellerOrderId: string, kind: "pickup" | "dropoff" | "campus_handoff") =>
  rpc<HandoffCode>("reveal_handoff_code", { p_seller_order_id: sellerOrderId, p_kind: kind });
export const leaveReview = (sellerOrderId: string, listingId: string, rating: number, body = "") =>
  rpc("leave_review", { p_seller_order_id: sellerOrderId, p_listing_id: listingId, p_rating: rating, p_body: body });

export type { CodeCheck };
