import { rpc, supabase, unwrap } from "./client";
import type { CampusRow, CategoryRow, ListingCardRow, ListingDetail } from "./types";

const PAGE = 20;

export async function getCampuses(): Promise<CampusRow[]> {
  return unwrap(await supabase.from("campuses").select("id, name, sort_order").eq("active", true).order("sort_order"));
}

export async function getCategories(): Promise<CategoryRow[]> {
  return unwrap(await supabase.from("categories").select("id, name, icon, kind").eq("active", true).order("sort_order"));
}

export type ListingSearch = {
  campusId?: string | null;
  categoryId?: string | null;
  query?: string;
  popularOnly?: boolean;
  page?: number;
};

/** Strips characters that have meaning in a PostgREST filter so user text can't change the query. */
export function safeSearchText(value: string): string {
  return value.replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function searchListings(filter: ListingSearch = {}): Promise<ListingCardRow[]> {
  let query = supabase
    .from("listing_cards")
    .select("id, type, title, category_id, campus_id, seller_id, seller_name, location, price_cents, cover_path, rating_avg, rating_count, sold_count, published_at");
  if (filter.campusId) query = query.eq("campus_id", filter.campusId);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  const text = filter.query ? safeSearchText(filter.query) : "";
  if (text) query = query.or(`title.ilike.%${text}%,seller_name.ilike.%${text}%`);
  query = filter.popularOnly
    ? query.order("sold_count", { ascending: false }).order("rating_avg", { ascending: false })
    : query.order("published_at", { ascending: false });
  const from = (filter.page ?? 0) * PAGE;
  return unwrap(await query.range(from, from + PAGE - 1));
}

export async function getListingDetail(id: string): Promise<ListingDetail | null> {
  const result = await supabase
    .from("listings")
    .select(
      `id, type, title, description, category_id, campus_id, base_price_cents, open_hours, pickup_note,
       prep_minutes_min, prep_minutes_max, duration_minutes, cancel_cutoff_hours, rating_avg, rating_count,
       seller:sellers(id, display_name, location_text, rating_avg, rating_count, follower_count),
       options:listing_options(id, label, price_cents, on_hand, reserved, unlimited, sort_order),
       media:listing_media(storage_path, alt),
       slots:service_slots(id, starts_at, ends_at, capacity, reserved)`,
    )
    .eq("id", id)
    .eq("options.active", true)
    .maybeSingle();
  return unwrap(result) as unknown as ListingDetail | null;
}

export async function getMyFavouriteIds(): Promise<string[]> {
  return unwrap(await supabase.from("favourites").select("listing_id")).map((row: { listing_id: string }) => row.listing_id);
}

export const toggleFavourite = (listingId: string) => rpc<boolean>("toggle_favourite", { p_listing_id: listingId });
export const toggleFollow = (sellerId: string) => rpc<boolean>("toggle_follow", { p_seller_id: sellerId });
export const reportListing = (listingId: string, reason: string) => rpc("report_listing", { p_listing_id: listingId, p_reason: reason });

/** Public URL for a stored listing photo or avatar. */
export function mediaUrl(bucket: "listing-media" | "avatars" | "reels", path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
