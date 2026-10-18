import { isActive, orderSummary, progressStep, statusInfo } from "./orderStatus";

describe("order status", () => {
  it("advances progress through the order lifecycle", () => {
    expect(progressStep({ status: "placed" })).toBe(0);
    expect(progressStep({ status: "preparing" })).toBe(2);
    expect(progressStep({ status: "delivered" })).toBe(4);
  });

  it("treats delivered and cancelled orders as finished", () => {
    expect(isActive({ status: "on-the-way" })).toBe(true);
    expect(isActive({ status: "delivered" })).toBe(false);
    expect(isActive({ status: "cancelled" })).toBe(false);
  });

  it("labels statuses and summarises lines", () => {
    expect(statusInfo("on-the-way").label).toBe("On the way");
    const line = { listingId: "a", title: "Latte", quantity: 1, unitPriceCents: 1 };
    expect(orderSummary({ lines: [line, { ...line, title: "Bun" }] })).toBe("Latte +1 more");
  });
});
