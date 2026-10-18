import { rpc, supabase, unwrap } from "./client";

/**
 * Phase 4 calls: courier ratings and tips, Vossie Points, referrals, the voucher wallet, order for later,
 * shared tracking, alerts and reorder. The screens still run on the demo store until they are switched over.
 */

/** Rates a delivered job from 1 to 5. A tip comes out of the student's wallet. */
export const rateCourier = (jobId: string, rating: 1 | 2 | 3 | 4 | 5, tipCents = 0) =>
  rpc<string>("rate_courier", { p_job_id: jobId, p_rating: rating, p_tip_cents: tipCents });

export type PointsSummary = { points: number; value_cents: number; tier: "bronze" | "silver" | "gold" };
export const getMyPoints = () => rpc<PointsSummary>("my_points");

/** Redeems in steps of 100 points (R10 each). Returns the new wallet balance in cents. */
export const redeemPoints = (points: number, idempotencyKey: string) =>
  rpc<number>("redeem_points", { p_points: points, p_idempotency_key: idempotencyKey });

export async function listPointsHistory(limit = 50) {
  return unwrap(
    await supabase.from("points_ledger").select("id, points, kind, label, created_at").order("created_at", { ascending: false }).limit(limit),
  );
}

export const getMyReferralCode = () => rpc<string>("my_referral_code");
export const applyReferralCode = (code: string) => rpc("apply_referral_code", { p_code: code });
export async function listMyReferrals() {
  return unwrap(await supabase.from("referrals").select("id, status, created_at, rewarded_at").order("created_at", { ascending: false }));
}

export type MyVoucher = {
  code: string;
  description: string;
  percent_off: number | null;
  cents_off: number | null;
  min_subtotal_cents: number;
  ends_at: string | null;
  expired: boolean;
  used: boolean;
};
export async function listMyVouchers() {
  return unwrap(await supabase.rpc("my_vouchers")) as MyVoucher[];
}

/** Order for later: a half-hour slot between 08:00 and 20:00 SAST, 45 minutes to 2 days ahead. */
export const scheduleSellerOrder = (sellerOrderId: string, when: Date) =>
  rpc("schedule_seller_order", { p_seller_order_id: sellerOrderId, p_when: when.toISOString() });

export async function listMeetupPoints(campusId: string) {
  return unwrap(await supabase.from("meetup_points").select("id, name, detail").eq("campus_id", campusId).order("sort_order"));
}

/** A link token that shows order status only, valid for 24 hours. */
export const createTrackingShare = (sellerOrderId: string) => rpc<string>("create_tracking_share", { p_seller_order_id: sellerOrderId });
export const revokeTrackingShare = (token: string) => rpc("revoke_tracking_share", { p_token: token });
export const getSharedTracking = (token: string) => rpc<Record<string, unknown> | null>("shared_tracking", { p_token: token });

/** Switches an alert on (true) or off (false). */
export const toggleAlert = (listingId: string, kind: "price-drop" | "back-in-stock") =>
  rpc<boolean>("toggle_alert", { p_listing_id: listingId, p_kind: kind });

export const isVerifiedSeller = (sellerId: string) => rpc<boolean>("is_verified_seller", { p_seller: sellerId });

/** Puts the available items from a past order back in the cart; returns how many lines were added. */
export const reorderToCart = (sellerOrderId: string) => rpc<number>("reorder_to_cart", { p_seller_order_id: sellerOrderId });

// ---- subscriptions, safety and withdrawals ------------------------------------------------------------------

/** Plans are paid monthly from the wallet. The perks are applied by the app for now (see backend.md). */
export const subscribePlan = (planId: "plus" | "seller-pro" | "study-pass") => rpc<string>("subscribe_plan", { p_plan_id: planId });
export const cancelSubscription = (planId: string) => rpc("cancel_subscription", { p_plan_id: planId });
export const resumeSubscription = (planId: string) => rpc("resume_subscription", { p_plan_id: planId });
export async function listPlans() {
  return unwrap(await supabase.from("subscription_plans").select("id, name, price_cents, audience, perks").order("price_cents"));
}
export async function listMySubscriptions() {
  return unwrap(await supabase.from("subscriptions").select("id, plan_id, status, cancel_at_period_end, started_at, current_period_end"));
}

export const addEmergencyContact = (name: string, phone: string, relationship = "") =>
  rpc<string>("add_emergency_contact", { p_name: name, p_phone: phone, p_relationship: relationship });
export const removeEmergencyContact = (id: string) => rpc("remove_emergency_contact", { p_id: id });
export const setCampusSecurityNumber = (number: string) => rpc("set_campus_security_number", { p_number: number });
export const submitSafetyReport = (category: "User" | "Listing" | "Delivery or courier" | "Safety incident" | "Other", notes: string) =>
  rpc<string>("submit_safety_report", { p_category: category, p_notes: notes });

/** Withdraw wallet money (minimum R50) back to a saved card. The key makes a retry safe. */
export const requestCardWithdrawal = (amountCents: number, paymentMethodId: string, idempotencyKey: string) =>
  rpc<string>("request_card_withdrawal", { p_amount_cents: amountCents, p_payment_method_id: paymentMethodId, p_idempotency_key: idempotencyKey });
