import { campuses, categories, listings, sellers } from "./mock/catalog";
import { faqs } from "./mock/content";
import type { CampusId, CategoryId, Listing, Seller } from "./types";

/**
 * The store the signed-in student runs as a seller, once they are approved and have set it up. While it is set, buyers see
 * that store (its name, banner-less details and products) in place of the demo store it takes over, and can buy from it.
 * The seller side fills this in whenever its state changes; it is empty for everyone else.
 */
type OwnStore = { seller: Seller; listings: Listing[]; /** Every product the seller has, on sale or not, so a cart or an order that has one still finds it. */ known: Listing[] } | null;
let ownStore: OwnStore = null;

export function registerOwnStore(store: OwnStore): void {
  ownStore = store;
}

export function getOwnStore(): OwnStore {
  return ownStore;
}

/**
 * Read-only catalogue access for the frontend phase. Every function returns
 * mock data today; the backend phase swaps these bodies for Supabase queries
 * without changing the screens that call them.
 */

export type ListingFilter = {
  categoryId?: CategoryId | null;
  campusId?: CampusId | null;
  query?: string;
  sellerId?: string;
  popularOnly?: boolean;
};

export function getCampuses() {
  return campuses;
}

export function getCampus(id: CampusId) {
  return campuses.find((campus) => campus.id === id);
}

export function getCampusName(id: CampusId): string {
  return getCampus(id)?.name ?? id;
}

export function getCategories() {
  return categories;
}

export function getCategory(id: CategoryId) {
  return categories.find((category) => category.id === id);
}

export function getSellers() {
  return ownStore ? sellers.map((seller) => (seller.id === ownStore!.seller.id ? ownStore!.seller : seller)) : sellers;
}

export function getSeller(id: string) {
  return ownStore && ownStore.seller.id === id ? ownStore.seller : sellers.find((seller) => seller.id === id);
}

export function getListing(id: string) {
  return listings.find((listing) => listing.id === id) ?? ownStore?.known.find((listing) => listing.id === id);
}

export function getListings(filter: ListingFilter = {}): Listing[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  // the demo store the seller took over is replaced by the seller's own products
  const pool = ownStore ? [...listings.filter((listing) => listing.sellerId !== ownStore!.seller.id), ...ownStore.listings] : listings;
  return pool
    .filter((listing) => !filter.categoryId || listing.categoryId === filter.categoryId)
    .filter((listing) => !filter.campusId || listing.campusId === filter.campusId)
    .filter((listing) => !filter.sellerId || listing.sellerId === filter.sellerId)
    .filter((listing) => !filter.popularOnly || listing.popular)
    .filter((listing) => {
      if (!query) return true;
      const sellerName = getSeller(listing.sellerId)?.name ?? "";
      return `${listing.title} ${listing.description} ${sellerName} ${listing.categoryId}`
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => a.createdDaysAgo - b.createdDaysAgo);
}

export function getFaqs() {
  return faqs;
}

export function getFaq(id: string) {
  return faqs.find((faq) => faq.id === id);
}
