import type { Category, Listing, Seller } from "./types";

export type Suggestion =
  | { kind: "listing"; id: string; label: string; detail: string }
  | { kind: "store"; id: string; label: string; detail: string }
  | { kind: "category"; id: string; label: string; detail: string };

function normalise(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

/** Rank: a match at the start of a word beats one in the middle, and shorter labels beat longer ones. */
function rank(label: string, query: string): number {
  const text = normalise(label);
  if (text === query) return 0;
  if (text.startsWith(query)) return 1;
  if (text.split(" ").some((word) => word.startsWith(query))) return 2;
  if (text.includes(query)) return 3;
  return Infinity;
}

/**
 * Suggestions while typing: products, stores and categories that match, best first, a few of each kind.
 * Matching ignores case, accents and punctuation.
 */
export function suggest(
  rawQuery: string,
  listings: Listing[],
  sellers: Seller[],
  categories: Category[],
  limit = 7,
): Suggestion[] {
  const query = normalise(rawQuery);
  if (query.length < 1) return [];
  const sellerName = new Map(sellers.map((seller) => [seller.id, seller.name]));

  const scored: { suggestion: Suggestion; score: number }[] = [];
  for (const listing of listings) {
    const score = rank(listing.title, query);
    if (score < Infinity) {
      scored.push({
        score: score * 10 + listing.title.length / 100,
        suggestion: { detail: sellerName.get(listing.sellerId) ?? "", id: listing.id, kind: "listing", label: listing.title },
      });
    }
  }
  for (const seller of sellers) {
    const score = rank(seller.name, query);
    if (score < Infinity) {
      scored.push({
        score: score * 10 + seller.name.length / 100 - 0.5,
        suggestion: { detail: seller.location, id: seller.id, kind: "store", label: seller.name },
      });
    }
  }
  for (const category of categories) {
    const score = rank(category.name, query);
    if (score < Infinity) {
      scored.push({ score: score * 10 - 1, suggestion: { detail: "Category", id: category.id, kind: "category", label: category.name } });
    }
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((entry) => entry.suggestion);
}

/** Full results for a submitted search: same words in any order across title, description and store name. */
export function searchListings(rawQuery: string, listings: Listing[], sellers: Seller[]): Listing[] {
  const words = normalise(rawQuery).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const sellerName = new Map(sellers.map((seller) => [seller.id, normalise(seller.name)]));
  return listings.filter((listing) => {
    const haystack = normalise(`${listing.title} ${listing.description} ${sellerName.get(listing.sellerId) ?? ""} ${listing.categoryId}`);
    return words.every((word) => haystack.includes(word));
  });
}

/** Things to try when a search finds nothing: the closest categories and popular stores. */
export function alternatives(rawQuery: string, categories: Category[], sellers: Seller[]): string[] {
  const query = normalise(rawQuery);
  const near = categories
    .filter((category) => isSubsequence(query, normalise(category.name)) || rank(category.name, query.slice(0, 3)) < Infinity)
    .map((category) => category.name);
  const popular = [...sellers].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 3).map((seller) => seller.name);
  return [...new Set([...near, ...popular])].slice(0, 4);
}

/** True when the letters of `needle` appear in `haystack` in order, so "fod" finds "food". */
function isSubsequence(needle: string, haystack: string): boolean {
  if (needle.length === 0) return false;
  let at = 0;
  for (const letter of haystack) {
    if (letter === needle[at]) at += 1;
    if (at === needle.length) return true;
  }
  return false;
}
