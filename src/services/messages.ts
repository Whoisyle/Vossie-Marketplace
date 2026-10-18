import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type OrderMessage = Database["public"]["Tables"]["order_messages"]["Row"];

export async function listOrderMessages(orderId: string): Promise<OrderMessage[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function sendOrderMessage(
  orderId: string,
  body: string
): Promise<{ success: boolean; message?: OrderMessage; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("send_order_message", {
      p_order_id: orderId,
      p_body: body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: data as unknown as OrderMessage };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send message.",
    };
  }
}
