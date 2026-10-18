// Starts the provider side of a payment for an order the caller just placed.
// The provider is not chosen yet (plan.md section 8), so only the `mock` adapter exists. Add a real adapter
// behind the same interface once the provider capability proof is done; nothing else needs to change.
import { adminClient, corsHeaders, json, userClient } from "../_shared/clients.ts";

type Adapter = {
  name: string;
  createCheckout(input: { intentId: string; amountCents: number; orderNumber: string }): Promise<{ reference: string; checkoutUrl: string | null }>;
};

const mockAdapter: Adapter = {
  name: "mock",
  createCheckout: ({ intentId }) => Promise.resolve({ reference: `mock_${intentId}`, checkoutUrl: null }),
};

function pickAdapter(): Adapter | null {
  const configured = Deno.env.get("PAYMENT_PROVIDER") ?? "mock";
  if (configured === "mock" && Deno.env.get("ALLOW_MOCK_PAYMENTS") === "true") return mockAdapter;
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { data: auth } = await userClient(request).auth.getUser();
  if (!auth.user) return json({ error: "not_authenticated" }, 401);

  const { intent_id: intentId } = await request.json().catch(() => ({}));
  if (typeof intentId !== "string") return json({ error: "intent_id_required" }, 400);

  const admin = adminClient();
  const { data: intent } = await admin
    .from("payment_intents")
    .select("id, buyer_id, amount_cents, status, method, order_id, orders(number)")
    .eq("id", intentId)
    .maybeSingle();
  if (!intent || intent.buyer_id !== auth.user.id) return json({ error: "not_found" }, 404);
  if (intent.method === "wallet") return json({ error: "wallet_orders_are_paid_at_checkout" }, 409);
  if (intent.status !== "created") return json({ intent_id: intent.id, status: intent.status });

  const adapter = pickAdapter();
  if (!adapter) return json({ error: "payment_provider_not_configured" }, 503);

  const checkout = await adapter.createCheckout({
    intentId: intent.id,
    amountCents: intent.amount_cents,
    orderNumber: (intent.orders as { number?: string } | null)?.number ?? "",
  });
  const { error } = await admin.rpc("attach_provider_reference", {
    p_intent_id: intent.id,
    p_provider: adapter.name,
    p_reference: checkout.reference,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ intent_id: intent.id, status: "provider_pending", provider: adapter.name, checkout_url: checkout.checkoutUrl });
});
