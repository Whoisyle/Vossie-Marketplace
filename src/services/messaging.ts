import { rpc, supabase, unwrap } from "./client";
import type { ConversationRow, MessageRow, NotificationRow } from "./types";

export async function listConversations(): Promise<ConversationRow[]> {
  return unwrap(
    await supabase
      .from("conversations")
      .select("id, kind, title, seller_order_id, last_message_at")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  );
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  return unwrap(
    await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, system, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at"),
  );
}

export const sendMessage = (conversationId: string, body: string) => rpc<string>("send_message", { p_conversation_id: conversationId, p_body: body });
export const markRead = (conversationId: string) => rpc("mark_conversation_read", { p_conversation_id: conversationId });
export const openSellerConversation = (sellerId: string) => rpc<string>("open_seller_conversation", { p_seller_id: sellerId });
export const openSupportConversation = () => rpc<string>("open_support_conversation");
export const blockUser = (userId: string) => rpc("block_user", { p_user_id: userId });
export const reportMessage = (messageId: string, reason: string) => rpc("report_message", { p_message_id: messageId, p_reason: reason });

/** Live updates for one conversation. Rows still pass row level security; reads stay authoritative. */
export function subscribeToMessages(conversationId: string, onMessage: (message: MessageRow) => void): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as MessageRow))
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  return unwrap(
    await supabase.from("notifications").select("id, kind, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(limit),
  );
}
export const markNotificationsRead = (ids?: string[]) => rpc<number>("mark_notifications_read", { p_ids: ids ?? null });
export const registerPushToken = (token: string, platform: "ios" | "android" | "web") => rpc("register_push_token", { p_token: token, p_platform: platform });
export const trackEvent = (name: string, props: Record<string, unknown> = {}) => rpc("track_event", { p_name: name, p_props: props });
