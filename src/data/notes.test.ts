import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";

import { asListing } from "@/seller/catalogue";

import { NOTES_CAMPUSES, noteListings, notesCoverUri, notesDetailFor, notesOutline, searchNotes } from "./notes";
import { stockReviews } from "./mock/stockReviews";
import { getListing, getListings, getSeller } from "./repository";

const signedIn = (): DemoState => demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });

describe("study notes catalogue", () => {
  it("has six packs on three campuses, all in Books, priced R15 to R60", () => {
    expect(noteListings).toHaveLength(6);
    expect(new Set(noteListings.map((item) => item.notes!.campusId)).size).toBe(3);
    for (const item of noteListings) {
      expect(item.categoryId).toBe("books");
      expect(item.priceCents).toBeGreaterThanOrEqual(1500);
      expect(item.priceCents).toBeLessThanOrEqual(6000);
      expect(item.notes!.moduleCode).toMatch(/^[A-Z]{4}\d{3}$/);
      expect(getListing(item.id)).toBeTruthy();
      expect(getSeller(item.sellerId)).toBeTruthy();
    }
  });

  it("is made by two student sellers", () => {
    expect(new Set(noteListings.map((item) => item.sellerId)).size).toBe(2);
  });

  it("finds packs by module code, module name and campus", () => {
    const all = getListings({});
    expect(searchNotes(all, "ITMA101", "all").map((item) => item.notes!.moduleCode)).toEqual(["ITMA101"]);
    expect(searchNotes(all, "business law", "all")).toHaveLength(1);
    expect(searchNotes(all, "", "pretoria")).toHaveLength(2);
    expect(searchNotes(all, "cape town", "all")).toHaveLength(2);
    expect(searchNotes(all, "ITMA101", "pretoria")).toHaveLength(0);
    expect(searchNotes(all, "zzz", "all")).toHaveLength(0);
  });

  it("never treats an ordinary listing as notes", () => {
    expect(searchNotes(getListings({}), "", "all").every((item) => Boolean(item.notes))).toBe(true);
    expect(NOTES_CAMPUSES).toHaveLength(3);
  });

  it("has an outline for every pack", () => {
    for (const item of noteListings) expect(notesOutline(item.notes!.moduleCode).length).toBeGreaterThanOrEqual(6);
  });
});

describe("notes are listings like any other", () => {
  it("has three pictures each: cover, a sample page and what is inside", () => {
    for (const item of noteListings) {
      expect(item.images).toEqual([`art:${item.id}`, `art:${item.id}#2`, `art:${item.id}#3`]);
    }
  });

  it("has a full details block with about, highlights and specs", () => {
    const detail = notesDetailFor(noteListings[0]!);
    expect(detail.about).toHaveLength(2);
    expect(detail.highlights).toHaveLength(4);
    expect(detail.specs.map(([label]) => label)).toEqual(expect.arrayContaining(["Module", "Module code", "Campus", "Lecturer", "Format", "Delivery"]));
  });

  it("gets reviews that talk about notes, not delivery", () => {
    const reviews = stockReviews(noteListings, []);
    expect(reviews.length).toBeGreaterThanOrEqual(noteListings.length * 2);
    expect(reviews.every((review) => !/library|seller met me|edition/i.test(review.body))).toBe(true);
  });
});

describe("a pack a seller uploads", () => {
  const notes = { campusId: "cape-town-mowbray" as const, fileName: "BLAW101-notes.pdf", moduleCode: "BLAW101", moduleName: "Business Law", pages: 24, previewPages: 2, year: 1 as const };

  it("gets a drawn cover with its module code and name, so it is never a grey box", () => {
    const uri = decodeURIComponent(notesCoverUri(notes));
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
    expect(uri).toContain("BLAW101");
    expect(uri).toContain("Business Law");
  });

  it("shows up as a notes listing on its campus with that cover", () => {
    const listing = asListing({ category: "books", description: "d", id: "sl-1", notes, onHand: 0, photos: [], priceCents: 2500, sku: "VM-1", status: "published", title: "t", unlimited: true, updatedAt: "", variants: [] }, "store");
    expect(listing.notes?.moduleCode).toBe("BLAW101");
    expect(listing.campusId).toBe("cape-town-mowbray");
    expect(String(listing.images[0])).toMatch(/^data:image\/svg\+xml/);
  });
});

describe("buying notes", () => {
  it("delivers at once: no delivery fee, an order that is already delivered, and the pack in the library", () => {
    const next = demoReducer(signedIn(), { listingId: "notes-itma101", type: "buyNotes" });
    expect(next.notesLibrary).toEqual(["notes-itma101"]);
    const order = next.orders[0]!;
    expect(order.status).toBe("delivered");
    expect(order.deliveryFeeCents).toBe(0);
    expect(order.totalCents).toBe(3000);
    expect(order.address).toBe("Digital download");
    expect(next.notifications[0]!.title).toBe("Your notes are ready");
  });

  it("does not sell the same pack twice", () => {
    const once = demoReducer(signedIn(), { listingId: "notes-itma101", type: "buyNotes" });
    const twice = demoReducer(once, { listingId: "notes-itma101", type: "buyNotes" });
    expect(twice).toBe(once);
  });

  it("ignores a listing that is not notes", () => {
    const state = signedIn();
    expect(demoReducer(state, { listingId: "burger-chips", type: "buyNotes" })).toBe(state);
  });

  it("takes the price from the wallet, and refuses when the wallet is short", () => {
    const base = demoReducer(signedIn(), { payment: "wallet", type: "setPayment" });
    const rich = { ...base, wallet: { ...base.wallet, balanceCents: 10_000 } };
    const paid = demoReducer(rich, { listingId: "notes-itdb201", type: "buyNotes" });
    expect(paid.wallet.balanceCents).toBe(10_000 - 6000);
    const poor = { ...base, wallet: { ...base.wallet, balanceCents: 100 } };
    expect(demoReducer(poor, { listingId: "notes-itdb201", type: "buyNotes" })).toBe(poor);
  });
});
