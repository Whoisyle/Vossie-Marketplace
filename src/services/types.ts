/** Row shapes the client reads. Money is integer ZAR cents; timestamps are ISO strings (UTC). */

export type CampusRow = { id: string; name: string; sort_order: number };
export type CategoryRow = { id: string; name: string; icon: string | null; kind: "goods" | "service" };

export type ProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  preferred_campus_id: string | null;
  workspace: "buyer" | "seller" | "service_provider";
  student_status: "demo_unverified" | "verified" | "expired";
  onboarded_at: string | null;
};

export type ListingCardRow = {
  id: string;
  type: "goods" | "service";
  title: string;
  category_id: string;
  campus_id: string;
  seller_id: string;
  seller_name: string;
  location: string;
  price_cents: number;
  cover_path: string | null;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  published_at: string | null;
};

export type ListingOptionRow = {
  id: string;
  label: string;
  price_cents: number;
  on_hand: number;
  reserved: number;
  unlimited: boolean;
  sort_order: number;
};

export type ServiceSlotRow = { id: string; starts_at: string; ends_at: string; capacity: number; reserved: number };

export type ListingDetail = {
  id: string;
  type: "goods" | "service";
  title: string;
  description: string;
  category_id: string;
  campus_id: string;
  base_price_cents: number;
  open_hours: string;
  pickup_note: string;
  prep_minutes_min: number | null;
  prep_minutes_max: number | null;
  duration_minutes: number | null;
  cancel_cutoff_hours: number;
  rating_avg: number;
  rating_count: number;
  seller: { id: string; display_name: string; location_text: string; rating_avg: number; rating_count: number; follower_count: number };
  options: ListingOptionRow[];
  media: { storage_path: string; alt: string }[];
  slots: ServiceSlotRow[];
};

export type SellerOrderStatus =
  | "awaiting_payment" | "awaiting_seller" | "accepted" | "preparing" | "ready" | "in_fulfilment" | "delivered"
  | "issue_window" | "completed" | "rejected" | "timed_out" | "cancelled" | "disputed" | "refunded";

export type OrderItemRow = {
  id: string;
  listing_id: string;
  type: "goods" | "service";
  title: string;
  option_label: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type SellerOrderRow = {
  id: string;
  order_id: string;
  number: string;
  seller_id: string;
  seller_user_id: string;
  buyer_id: string;
  status: SellerOrderStatus;
  fulfilment: "campus_handoff" | "vossie_delivery";
  has_goods: boolean;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  refunded_cents: number;
  accept_by: string | null;
  issue_window_ends_at: string | null;
  created_at: string;
  order_items?: OrderItemRow[];
};

export type PlaceOrderResult = {
  order_id: string;
  number: string;
  status: "pending_payment" | "paid" | "cancelled" | "expired" | "payment_failed";
  total_cents: number;
  payment_intent_id?: string;
  payment_method?: string;
  replayed: boolean;
};

export type CartQuote = {
  valid_voucher: boolean;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
};

export type HandoffCode = { code: string; expires_at: string };
export type CodeCheck = { ok: true } | { ok: false; error: "wrong_code" | "locked" | "expired" | "no_code" };

export type Balances = {
  wallet_cents: number;
  seller_available_cents: number;
  courier_available_cents: number;
  held_cents: number;
};

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type ConversationRow = { id: string; kind: "order" | "support" | "direct"; title: string; seller_order_id: string | null; last_message_at: string | null };
export type MessageRow = { id: string; conversation_id: string; sender_id: string | null; body: string; system: boolean; created_at: string };

export type CourierPoolJob = { id: string; campus_id: string; pickup_text: string; courier_fee_cents: number; created_at: string };
export type DeliveryJobRow = {
  id: string;
  seller_order_id: string;
  campus_id: string;
  status: "pending_assignment" | "assigned" | "picked_up" | "in_transit" | "arrived" | "delivered" | "exception" | "cancelled";
  pickup_text: string;
  dropoff_text: string;
  courier_fee_cents: number;
};
