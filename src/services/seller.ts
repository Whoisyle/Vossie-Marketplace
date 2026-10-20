import { rpc, supabase, unwrap } from "./client";
import type { CodeCheck, SellerOrderRow } from "./types";

export type SellerProfileInput = {
  displayName: string;
  bio: string;
  locationText: string;
  campusId: string;
  sellsGoods: boolean;
  providesServices: boolean;
};

export const submitSellerProfile = (input: SellerProfileInput) =>
  rpc("submit_seller_profile", {
    p_display_name: input.displayName,
    p_bio: input.bio,
    p_location_text: input.locationText,
    p_campus_id: input.campusId,
    p_sells_goods: input.sellsGoods,
    p_provides_services: input.providesServices,
  });

export async function getMySeller() {
  return unwrap(await supabase.from("sellers").select("id, display_name, bio, location_text, status, review_note, campus_id, sells_goods, provides_services, kind, contact_phone, logo_path, open_days, opens_at, closes_at").maybeSingle());
}

export type ListingInput = {
  id?: string;
  type: "goods" | "service";
  categoryId: string;
  campusId?: string;
  title: string;
  description: string;
  condition?: "new" | "like_new" | "good" | "fair";
  weightGrams?: number;
  handoffAvailable?: boolean;
  deliveryEligible?: boolean;
  openHours?: string;
  pickupNote?: string;
  prepMinutesMin?: number;
  prepMinutesMax?: number;
  durationMinutes?: number;
  mode?: "on_campus" | "remote";
  cancelCutoffHours?: number;
};
export type OptionInput = { id?: string; label: string; priceCents: number; onHand?: number; unlimited?: boolean };

export const upsertListing = (listing: ListingInput, options: OptionInput[], mediaPaths: string[] = []) =>
  rpc<string>("upsert_listing", {
    p_listing: {
      id: listing.id, type: listing.type, category_id: listing.categoryId, campus_id: listing.campusId,
      title: listing.title, description: listing.description, condition: listing.condition,
      weight_grams: listing.weightGrams, handoff_available: listing.handoffAvailable,
      delivery_eligible: listing.deliveryEligible, open_hours: listing.openHours, pickup_note: listing.pickupNote,
      prep_minutes_min: listing.prepMinutesMin, prep_minutes_max: listing.prepMinutesMax,
      duration_minutes: listing.durationMinutes, mode: listing.mode, cancel_cutoff_hours: listing.cancelCutoffHours,
    },
    p_options: options.map((o) => ({ id: o.id, label: o.label, price_cents: o.priceCents, on_hand: o.onHand, unlimited: o.unlimited })),
    p_media: mediaPaths.map((storage_path) => ({ storage_path })),
  });

/** Returns the new status, or the list of problems that stopped it publishing. */
export const submitListing = (listingId: string) =>
  rpc<{ status: string; issues: string[] }>("submit_listing", { p_listing_id: listingId });
export const setListingPaused = (listingId: string, paused: boolean) => rpc("set_listing_paused", { p_listing_id: listingId, p_paused: paused });
export const addServiceSlots = (listingId: string, slots: { startsAt: string; endsAt: string; capacity?: number }[]) =>
  rpc<number>("add_service_slots", {
    p_listing_id: listingId,
    p_slots: slots.map((s) => ({ starts_at: s.startsAt, ends_at: s.endsAt, capacity: s.capacity ?? 1 })),
  });
export const cancelServiceSlot = (slotId: string) => rpc("cancel_service_slot", { p_slot_id: slotId });

export async function listMyListings() {
  return unwrap(await supabase.from("listings").select("id, type, title, status, review_note, base_price_cents, updated_at").order("updated_at", { ascending: false }));
}

/** Orders where I am the seller or provider. */
export async function listIncomingOrders(): Promise<SellerOrderRow[]> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  const rows = unwrap(
    await supabase
      .from("seller_orders")
      .select("id, order_id, number, seller_id, seller_user_id, buyer_id, status, fulfilment, has_goods, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, refunded_cents, accept_by, issue_window_ends_at, created_at, order_items(id, listing_id, type, title, option_label, unit_price_cents, quantity, line_total_cents)")
      .eq("seller_user_id", me ?? "")
      .order("created_at", { ascending: false })
      .limit(100),
  );
  return rows as unknown as SellerOrderRow[];
}

export const respondToOrder = (sellerOrderId: string, accept: boolean, note?: string) =>
  rpc("seller_respond", { p_seller_order_id: sellerOrderId, p_accept: accept, p_note: note ?? null });
export const advanceOrder = (sellerOrderId: string, to: "preparing" | "ready") =>
  rpc("seller_advance", { p_seller_order_id: sellerOrderId, p_to: to });
export const completeCampusHandoff = (sellerOrderId: string, code: string) =>
  rpc<CodeCheck>("seller_complete_handoff", { p_seller_order_id: sellerOrderId, p_code: code });
export const markServiceComplete = (bookingId: string) => rpc("provider_mark_complete", { p_booking_id: bookingId });
export const cancelAsSeller = (sellerOrderId: string, reason: string) =>
  rpc("seller_cancel_order", { p_seller_order_id: sellerOrderId, p_reason: reason });

export type SellerKindDb = "student" | "campus_business" | "registered";
export type SellerDocKindDb = "student_card" | "id" | "address" | "cipc";

export type SaveSellerOnboardingInput = {
  kind: SellerKindDb;
  displayName: string;
  phone: string;
  bio: string;
  locationText: string;
  campusId: string;
  openDays: string[];
  /** "08:00" */
  opensAt: string;
  closesAt: string;
  logoPath?: string | null;
};

/** Steps 1 and 3 of the seller setup: who the seller is and how buyers see the store. Creates the seller as a draft. */
export const saveSellerOnboarding = (input: SaveSellerOnboardingInput) =>
  rpc("save_seller_onboarding", {
    p_kind: input.kind,
    p_display_name: input.displayName,
    p_phone: input.phone,
    p_bio: input.bio,
    p_location_text: input.locationText,
    p_campus_id: input.campusId,
    p_open_days: input.openDays,
    p_opens_at: input.opensAt,
    p_closes_at: input.closesAt,
    p_logo_path: input.logoPath ?? null,
  });

/** Uploads a file to the private seller-documents bucket, in the seller's own folder, and returns its path. */
export async function uploadSellerFile(kind: string, file: { uri: string; name: string }, bucket: "seller-documents" | "avatars" = "seller-documents"): Promise<string> {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) throw new Error("not_signed_in");
  const blob = await (await fetch(file.uri)).blob();
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  const path = `${me}/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

/** Hands in one document: uploads the file, then records it against the seller. */
export async function attachSellerDocument(kind: SellerDocKindDb, file: { uri: string; name: string }) {
  const path = await uploadSellerFile(kind, file);
  return rpc("attach_seller_document", { p_kind: kind, p_storage_path: path, p_file_name: file.name });
}

/** Sends the documents for review. The student card is accepted on its own when the Eduvos record matched. */
export const submitSellerVerification = () => rpc("submit_seller_verification");

export async function listMySellerDocuments() {
  return unwrap(await supabase.from("seller_documents").select("id, kind, status, file_name, note, updated_at"));
}

/** My listings with their options, so stock and price can be shown and changed. */
export async function listMyListingsWithStock() {
  return unwrap(
    await supabase
      .from("listings")
      .select("id, type, title, description, status, category_id, updated_at, listing_options(id, label, price_cents, on_hand, unlimited)")
      .order("updated_at", { ascending: false }),
  );
}
