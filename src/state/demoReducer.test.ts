import { cartTotals, createInitialState, demoReducer, reviewEligibility, type DemoState } from "./demoReducer";

function signedIn(email = "eduv230953@vossie.net"): DemoState {
  return demoReducer(createInitialState(), { email, type: "signIn" });
}

describe("demo store", () => {
  it("recognises a returning demo account and skips profile setup", () => {
    const state = signedIn();
    expect(state.profile?.fullName).toBe("Vumisa");
    expect(state.isNewUser).toBe(false);
  });

  it("treats an unknown email as a new user until the profile is completed", () => {
    let state = signedIn("newstudent@vossie.net");
    expect(state.isNewUser).toBe(true);
    state = demoReducer(state, {
      profile: { campusId: "pretoria", email: "newstudent@vossie.net", fullName: "Naledi Mokoena", phone: "" },
      type: "completeProfile",
    });
    expect(state.isNewUser).toBe(false);
    expect(state.profile?.campusId).toBe("pretoria");

    const afterSignOut = demoReducer(state, { type: "signOut" });
    expect(afterSignOut.profile).toBeNull();
    const again = demoReducer(afterSignOut, { email: "NewStudent@vossie.net", type: "signIn" });
    expect(again.isNewUser).toBe(false);
    expect(again.profile?.fullName).toBe("Naledi Mokoena");
  });

  it("merges repeated cart lines and prices options", () => {
    let state = signedIn();
    state = demoReducer(state, { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { listingId: "burger-chips", optionId: "small", quantity: 2, type: "addToCart" });
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0]?.quantity).toBe(3);
    expect(cartTotals(state).subtotalCents).toBe(3 * 2800);
  });

  it("calculates delivery, member discount and vouchers", () => {
    let state = signedIn();
    state = demoReducer(state, { listingId: "planner-notebooks", quantity: 1, type: "addToCart" });
    expect(cartTotals(state)).toMatchObject({ deliveryFeeCents: 1500, subtotalCents: 9000, totalCents: 9000 + 1500 - 400 });

    state = demoReducer(state, { fulfilment: "collection", type: "setFulfilment" });
    state = demoReducer(state, { code: "VOSSIE10", type: "applyVoucher" });
    expect(cartTotals(state)).toMatchObject({ deliveryFeeCents: 0, discountCents: 400 + 900, totalCents: 9000 - 1300 });
  });

  it("places one order per seller, clears the cart and records a receipt", () => {
    let state = signedIn();
    const before = state.orders.length;
    state = demoReducer(state, { listingId: "burger-chips", optionId: "large", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { listingId: "mint-laptop", quantity: 1, type: "addToCart" });
    const expectedTotal = cartTotals(state).totalCents;
    state = demoReducer(state, { type: "placeOrder" });

    expect(state.cart).toHaveLength(0);
    expect(state.orders).toHaveLength(before + 2);
    expect(state.lastReceipt?.itemCount).toBe(2);
    expect(state.lastReceipt?.totalCents).toBe(expectedTotal);
    const created = state.orders.slice(0, 2);
    expect(created.reduce((sum, order) => sum + order.totalCents, 0)).toBe(expectedTotal);
  });

  it("tops up the wallet and records the transaction", () => {
    const state = demoReducer(signedIn(), { amountCents: 10000, source: "card •••• 4242", type: "addFunds" });
    expect(state.wallet.balanceCents).toBe(24500 + 10000);
    expect(state.wallet.transactions[0]?.label).toBe("Top up via card •••• 4242");
  });

  it("remembers recently viewed listings, newest first, without repeats", () => {
    let state = signedIn();
    for (const listingId of ["a", "b", "c", "a"]) state = demoReducer(state, { listingId, type: "viewListing" });
    expect(state.recentViews).toEqual(["a", "c", "b"]);
  });

  it("keeps only the latest twelve views", () => {
    let state = signedIn();
    for (let i = 0; i < 20; i += 1) state = demoReducer(state, { listingId: `l${i}`, type: "viewListing" });
    expect(state.recentViews).toHaveLength(12);
    expect(state.recentViews[0]).toBe("l19");
  });
});

describe("search history and reviews", () => {
  it("keeps recent searches newest first without duplicates and ignores tiny ones", () => {
    let state = signedIn();
    for (const query of ["latte", "books", "x", "Latte"]) state = demoReducer(state, { query, type: "addSearch" });
    expect(state.recentSearches).toEqual(["Latte", "books"]);
    state = demoReducer(state, { type: "clearSearches" });
    expect(state.recentSearches).toEqual([]);
  });

  it("lets a student review only what they have received, once", () => {
    let state = signedIn();
    expect(reviewEligibility(state, "iced-latte")).toBe("can_review");
    expect(reviewEligibility(state, "mint-laptop")).toBe("needs_purchase");
    const withBad = demoReducer(state, { body: "nope", listingId: "mint-laptop", rating: 5, type: "addReview" });
    expect(withBad.reviews).toHaveLength(state.reviews.length);

    state = demoReducer(state, { body: "Lovely and cold.", listingId: "iced-latte", rating: 5, type: "addReview" });
    expect(state.reviews[0]).toMatchObject({ author: "Vumisa", listingId: "iced-latte", mine: true, rating: 5 });
    expect(reviewEligibility(state, "iced-latte")).toBe("already_reviewed");
    const again = demoReducer(state, { body: "twice", listingId: "iced-latte", rating: 1, type: "addReview" });
    expect(again.reviews).toHaveLength(state.reviews.length);
  });

  it("does not allow a signed-out visitor to review", () => {
    expect(reviewEligibility(createInitialState(), "iced-latte")).toBe("signed_out");
  });

  it("takes the total from the wallet when paying with it, and refuses when the balance is too low", () => {
    let state = signedIn();
    state = demoReducer(state, { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { payment: "wallet", type: "setPayment" });
    const total = cartTotals(state).totalCents;
    const paid = demoReducer(state, { type: "placeOrder" });
    expect(paid.wallet.balanceCents).toBe(state.wallet.balanceCents - total);
    expect(paid.wallet.transactions[0]?.amountCents).toBe(-total);

    const broke = demoReducer({ ...state, wallet: { ...state.wallet, balanceCents: 0 } }, { type: "placeOrder" });
    expect(broke.cart).toHaveLength(1);
    expect(broke.orders).toHaveLength(state.orders.length);
  });
});
