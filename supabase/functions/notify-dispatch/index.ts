// Delivers pending notifications: push through Expo, and email for events marked email_required.
// Trigger it from a database webhook on public.notifications inserts or from a one-minute schedule.
// Email delivery needs a provider decision (marketplace-mvp.md, open decision 7); until EMAIL_PROVIDER is
// configured, email-required rows stay unsent and are reported in the response.
import { adminClient, json } from "../_shared/clients.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (request) => {
  const secret = Deno.env.get("NOTIFY_DISPATCH_SECRET");
  if (!secret || request.headers.get("x-dispatch-secret") !== secret) return json({ error: "forbidden" }, 403);

  const admin = adminClient();
  const { data: pending, error } = await admin
    .from("notifications")
    .select("id, user_id, title, body, href, data, email_required, push_sent_at, email_sent_at")
    .or("push_sent_at.is.null,and(email_required.eq.true,email_sent_at.is.null)")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return json({ error: error.message }, 500);

  let pushed = 0;
  let emailSkipped = 0;
  for (const note of pending ?? []) {
    if (!note.push_sent_at) {
      const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", note.user_id);
      const messages = (tokens ?? []).map((t) => ({
        to: t.token, title: note.title, body: note.body, data: { href: note.href, ...note.data }, sound: "default",
      }));
      if (messages.length) {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages),
        });
        if (!response.ok) continue;
        pushed += messages.length;
      }
      await admin.from("notifications").update({ push_sent_at: new Date().toISOString() }).eq("id", note.id);
    }
    if (note.email_required && !note.email_sent_at) {
      if (Deno.env.get("EMAIL_PROVIDER")) {
        // Provider adapter goes here. Never log message bodies or addresses.
      } else {
        emailSkipped += 1;
      }
    }
  }
  return json({ pushed, email_skipped_no_provider: emailSkipped });
});
