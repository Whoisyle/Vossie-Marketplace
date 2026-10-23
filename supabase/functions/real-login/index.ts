// Signs in an allowlisted account without sending an email. The allowlist is the app_settings row
// `direct_login_emails` (a JSON array). The function hands back a one-time token hash that the app
// exchanges for a normal session; anyone who is not on the list gets 404 and uses the email code flow.
// Remove an address from the list to turn its direct login off.
import { adminClient, corsHeaders, json } from "../_shared/clients.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { email } = await request.json().catch(() => ({}));
  if (typeof email !== "string") return json({ error: "email_required" }, 400);
  const clean = email.trim().toLowerCase();

  const admin = adminClient();
  const { data: setting } = await admin.from("app_settings").select("value").eq("key", "direct_login_emails").maybeSingle();
  const allowed: string[] = Array.isArray(setting?.value) ? setting.value.map((item: unknown) => String(item).toLowerCase()) : [];
  if (!allowed.includes(clean)) return json({ error: "not_enabled" }, 404);

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: clean });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return json({ error: "link_failed" }, 500);
  return json({ token_hash: tokenHash });
});
