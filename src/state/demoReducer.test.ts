import { cartTotals, createInitialState, demoReducer, type DemoState } from "./demoReducer";

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
    expect(cartTotals(state).subtotalCents).toBe(3 * 3500);
  });

  it("calculates delivery, member discount and vouchers", () => {
    let state = signedIn();
    state = demoReducer(state, { listingId: "planner-notebooks", quantity: 1, type: "addToCart" });
    expect(cartTotals(state)).toMatchObject({ deliveryFeeCents: 1500, subtotalCents: 12000, totalCents: 12000 + 1500 - 400 });

    state = demoReducer(state, { fulfilment: "collection", type: "setFulfilment" });
    state = demoReducer(state, { code: "VOSSIE10", type: "applyVoucher" });
    expect(cartTotals(state)).toMatchObject({ deliveryFeeCents: 0, discountCents: 400 + 1200, totalCents: 12000 - 1600 });
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
});
