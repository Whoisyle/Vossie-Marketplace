import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type ServiceBooking = Database["public"]["Tables"]["service_bookings"]["Row"];

export async function requestBooking(
  serviceId: string,
  slotId: string,
  note?: string
): Promise<{ success: boolean; booking?: ServiceBooking; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("request_service_booking", {
      p_service_id: serviceId,
      p_slot_id: slotId,
      p_note: note,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, booking: data as unknown as ServiceBooking };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to book service.",
    };
  }
}

export async function respondToBooking(
  bookingId: string,
  accept: boolean
): Promise<{ success: boolean; booking?: ServiceBooking; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("respond_service_booking", {
      p_booking_id: bookingId,
      p_accept: accept,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, booking: data as unknown as ServiceBooking };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to respond to booking.",
    };
  }
}

export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; booking?: ServiceBooking; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("cancel_service_booking", {
      p_booking_id: bookingId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, booking: data as unknown as ServiceBooking };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel booking.",
    };
  }
}

export async function reportNoShow(
  bookingId: string,
  details: string
): Promise<{ success: boolean; booking?: ServiceBooking; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc("report_service_no_show", {
      p_booking_id: bookingId,
      p_details: details,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, booking: data as unknown as ServiceBooking };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to report no-show.",
    };
  }
}
