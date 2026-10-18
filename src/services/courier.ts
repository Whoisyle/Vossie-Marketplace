import { rpc, supabase, unwrap } from "./client";
import type { CodeCheck, CourierPoolJob, DeliveryJobRow } from "./types";

/** Open jobs on my campuses. The buyer's address is hidden until I claim a job. */
export async function listJobPool(): Promise<CourierPoolJob[]> {
  return unwrap(await supabase.from("courier_job_pool").select("id, campus_id, pickup_text, courier_fee_cents, created_at").order("created_at"));
}

export async function listMyJobs(): Promise<DeliveryJobRow[]> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  return unwrap(
    await supabase
      .from("delivery_jobs")
      .select("id, seller_order_id, campus_id, status, pickup_text, dropoff_text, courier_fee_cents")
      .eq("courier_id", me ?? "")
      .in("status", ["assigned", "picked_up", "in_transit", "arrived", "exception"])
      .order("created_at"),
  );
}

export const setOnline = (online: boolean) => rpc("set_courier_online", { p_online: online });
export const claimJob = (jobId: string) => rpc("courier_claim_job", { p_job_id: jobId });
export const releaseJob = (jobId: string) => rpc("courier_release_job", { p_job_id: jobId });
export const confirmPickup = (jobId: string, code: string, evidencePath?: string) =>
  rpc<CodeCheck>("courier_confirm_pickup", { p_job_id: jobId, p_code: code, p_evidence_path: evidencePath ?? null });
export const confirmDelivery = (jobId: string, code: string, evidencePath?: string) =>
  rpc<CodeCheck>("courier_confirm_delivery", { p_job_id: jobId, p_code: code, p_evidence_path: evidencePath ?? null });
export const updateJobStatus = (jobId: string, status: "in_transit" | "arrived", position?: { lat: number; lng: number }, note?: string) =>
  rpc("courier_update_status", { p_job_id: jobId, p_status: status, p_lat: position?.lat ?? null, p_lng: position?.lng ?? null, p_note: note ?? null });
export const reportException = (
  jobId: string,
  kind: "buyer_unavailable" | "seller_not_ready" | "item_damaged" | "wrong_address" | "safety" | "other",
  notes: string,
  evidencePath?: string,
) => rpc<string>("courier_report_exception", { p_job_id: jobId, p_kind: kind, p_notes: notes, p_evidence_path: evidencePath ?? null });
