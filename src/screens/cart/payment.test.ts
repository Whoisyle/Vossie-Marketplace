import { checkPayment } from "./payment";

const base = { hasCard: true, totalCents: 5000, walletCents: 10000 };

describe("checkPayment", () => {
  it("accepts a wallet with enough balance and refuses one without", () => {
    expect(checkPayment({ ...base, method: "wallet" })).toEqual({ ok: true });
    expect(checkPayment({ ...base, method: "wallet", walletCents: 100 }).ok).toBe(false);
  });
  it("needs a card for card payments and a bank for instant EFT", () => {
    expect(checkPayment({ ...base, hasCard: false, method: "card" }).ok).toBe(false);
    expect(checkPayment({ ...base, method: "eft" }).ok).toBe(false);
    expect(checkPayment({ ...base, bank: "FNB", method: "eft" })).toEqual({ ok: true });
  });
  it("lets Apple Pay and Google Pay through", () => {
    expect(checkPayment({ ...base, method: "apple-pay" }).ok).toBe(true);
    expect(checkPayment({ ...base, method: "google-pay" }).ok).toBe(true);
  });
});
