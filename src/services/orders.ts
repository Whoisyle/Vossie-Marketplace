import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type GoodsOrder = Database["public"]["Tables"]["goods_orders"]["Row"];

export async function requestOrder(
  listingId: string,
  quantity: number,
  note?: string
): Promise<{ success: boolean; order?: GoodsOrder; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      order: {
        id: `mock-order-${Date.now()}`,
        buyer_id: "demo-user",
        seller_id: "00000000-0000-0000-0000-000000000002",
        listing_id: listingId,
        quantity,
        unit_price_cents: 12000,
        total_price_cents: 12000 * quantity,
        currency: "ZAR",
        campus_code: "potchefstroom",
        status: "requested",
        note: note ?? null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        buyer_confirmed_at: null,
        seller_confirmed_at: null,
        issue_reported_at: null,
        issue_reported_by: null,
        issue_reason: null,
        cancellation_requested_by: null,
        cancellation_requested_at: null,
        cancellation_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  try {
    const { data, error } = await supabase.rpc("request_goods_order", {
      p_listing_id: listingId,
      p_quantity: quantity,
      p_note: note,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data as unknown as GoodsOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to place order request.",
    };
  }
}

export async function respondToOrder(
  orderId: string,
  accept: boolean
): Promise<{ success: boolean; order?: GoodsOrder; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("respond_goods_order", {
      p_order_id: orderId,
      p_accept: accept,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data as unknown as GoodsOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to respond to order.",
    };
  }
}

export async function cancelOrder(
  orderId: string
): Promise<{ success: boolean; order?: GoodsOrder; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("cancel_goods_order", {
      p_order_id: orderId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data as unknown as GoodsOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel order.",
    };
  }
}

export async function confirmHandoff(
  orderId: string
): Promise<{ success: boolean; order?: GoodsOrder; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("confirm_goods_handoff", {
      p_order_id: orderId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data as unknown as GoodsOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to confirm handoff.",
    };
  }
}

export async function reportHandoffIssue(
  orderId: string,
  reason: string
): Promise<{ success: boolean; order?: GoodsOrder; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("report_goods_issue", {
      p_order_id: orderId,
      p_reason: reason,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, order: data as unknown as GoodsOrder };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to report issue.",
    };
  }
}

export async function listMyOrders(): Promise<GoodsOrder[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("goods_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
