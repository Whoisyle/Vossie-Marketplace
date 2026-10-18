// DEVELOPMENT ONLY. Lets a signed-in buyer "pay" their own mock intent so card, Apple Pay and Google Pay
// flows can be exercised before a real provider exists. It refuses to run unless ALLOW_MOCK_PAYMENTS=true,
// which must never be set on a project that handles real money.
import { adminClient, corsHeaders, json, userClient } from "../_shared/clients.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (Deno.env.get("ALLOW_MOCK_PAYMENTS") !== "true") return json({ error: "disabled" }, 403);

  const { data: auth } = await userClient(request).auth.getUser();
  if (!auth.user) return json({ error: "not_authenticated" }, 401);
  const { intent_id: intentId, outcome = "captured" } = await request.json().catch(() => ({}));
  if (typeof intentId !== "string") return json({ error: "intent_id_required" }, 400);

  const admin = adminClient();
  const { data: intent } = await admin
    .from("payment_intents")
    .select("id, buyer_id, amount_cents, provider")
    .eq("id", intentId)
    .maybeSingle();
  if (!intent || intent.buyer_id !== auth.user.id || intent.provider !== "mock") return json({ error: "not_found" }, 404);

  const { data, error } = await admin.rpc("apply_payment_event", {
    p_provider: "mock",
    p_event_id: crypto.randomUUID(),
    p_intent_id: intent.id,
    p_type: outcome === "failed" ? "payment.failed" : "payment.captured",
    p_payload: { amount_cents: intent.amount_cents, reason: "mock outcome" },
    p_signature_valid: true,
  });
  return error ? json({ error: error.message }, 500) : json({ status: data });
});
