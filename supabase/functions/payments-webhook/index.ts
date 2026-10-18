// Receives provider callbacks. Authenticated by HMAC signature, not by a user session.
// Every event, valid or not, is recorded; only verified events change money state, and replays are ignored.
import { adminClient, json } from "../_shared/clients.ts";
import { verifySignature } from "../_shared/signature.ts";

type ProviderEvent = {
  id: string;
  type: "payment.captured" | "payment.failed" | "refund.succeeded" | "refund.failed";
  intent_id?: string;
  refund_id?: string;
  amount_cents?: number;
  reason?: string;
  reference?: string;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const provider = new URL(request.url).searchParams.get("provider") ?? "mock";
  const secret = Deno.env.get(`PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`) ?? "";
  const raw = await request.text();
  const valid = await verifySignature(secret, raw, request.headers.get("x-vossie-signature"));

  let event: ProviderEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!event.id || !event.type) return json({ error: "invalid_event" }, 400);

  const admin = adminClient();
  if (event.type.startsWith("refund.")) {
    if (!valid || !event.refund_id) return json({ error: "invalid_signature" }, 401);
    const { error } = await admin.rpc("settle_provider_refund", {
      p_refund_id: event.refund_id,
      p_success: event.type === "refund.succeeded",
      p_provider_ref: event.reference ?? null,
    });
    return error ? json({ error: error.message }, 500) : json({ status: "processed" });
  }

  if (!event.intent_id) return json({ error: "intent_id_required" }, 400);
  const { data, error } = await admin.rpc("apply_payment_event", {
    p_provider: provider,
    p_event_id: event.id,
    p_intent_id: event.intent_id,
    p_type: event.type,
    p_payload: { amount_cents: event.amount_cents, reason: event.reason },
    p_signature_valid: valid,
  });
  if (error) return json({ error: error.message }, 500);
  // The provider should retry only on server errors; a bad signature is a client error.
  return json({ status: data }, valid ? 200 : 401);
});
