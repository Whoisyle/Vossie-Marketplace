import { campuses, categories, listings, sellers } from "./mock/catalog";
import { faqs } from "./mock/content";
import type { CampusId, CategoryId, Listing } from "./types";

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
  return sellers;
}

export function getSeller(id: string) {
  return sellers.find((seller) => seller.id === id);
}

export function getListing(id: string) {
  return listings.find((listing) => listing.id === id);
}

export function getListings(filter: ListingFilter = {}): Listing[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return listings
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
