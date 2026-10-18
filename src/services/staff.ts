import { rpc, supabase, unwrap } from "./client";

/** Operations, support and finance calls. The database checks the role on every one of them. */

export const reviewSeller = (sellerId: string, decision: "approved" | "rejected" | "suspended", note?: string) =>
  rpc("review_seller", { p_seller_id: sellerId, p_decision: decision, p_note: note ?? null });
export const reviewListing = (listingId: string, decision: "approved" | "rejected" | "changes_requested", note?: string) =>
  rpc("review_listing", { p_listing_id: listingId, p_decision: decision, p_note: note ?? null });

export async function listOpenCases() {
  return unwrap(
    await supabase
      .from("cases")
      .select("id, kind, status, seller_order_id, campus_id, reason, created_at, assigned_to")
      .in("status", ["open", "in_review"])
      .order("created_at"),
  );
}
export const claimCase = (caseId: string) => rpc("claim_case", { p_case_id: caseId });
export const addCaseNote = (caseId: string, body: string, internal = false, evidencePath?: string) =>
  rpc<string>("add_case_note", { p_case_id: caseId, p_body: body, p_internal: internal, p_evidence_path: evidencePath ?? null });
export const resolveCase = (
  caseId: string,
  outcome: "refund_full" | "refund_partial" | "release_payout" | "return" | "deny" | "other",
  amountCents?: number,
  note?: string,
) => rpc("staff_resolve_case", { p_case_id: caseId, p_outcome: outcome, p_amount_cents: amountCents ?? null, p_note: note ?? null });
export const assignCourier = (jobId: string, courierId: string) => rpc("assign_courier", { p_job_id: jobId, p_courier_id: courierId });
export const inviteStaff = (email: string, role: "courier" | "support" | "operations" | "finance" | "admin", campusId?: string) =>
  rpc<string>("invite_staff", { p_email: email, p_role: role, p_campus_id: campusId ?? null });
export const setMembershipState = (userId: string, role: string, state: "active" | "suspended" | "revoked") =>
  rpc("set_membership_state", { p_user: userId, p_role: role, p_state: state });
export const setPayoutStatus = (payoutId: string, status: "approved" | "processing" | "paid" | "failed" | "cancelled", providerRef?: string, failure?: string) =>
  rpc("finance_set_payout", { p_payout_id: payoutId, p_status: status, p_provider_ref: providerRef ?? null, p_failure: failure ?? null });
export const setFeePolicy = (bps: number, note: string, activate = false) => rpc<string>("finance_set_fee_policy", { p_bps: bps, p_note: note, p_activate: activate });
export const reconcile = (provider: string, from: string, to: string, providerTotalCents: number) =>
  rpc<string>("finance_reconcile", { p_provider: provider, p_from: from, p_to: to, p_provider_total_cents: providerTotalCents });
