import {
  isSoldOut,
  isVerifiedSeller,
  parseTip,
  referralCodeFor,
  scheduleSlots,
  validateReferralCode,
  voucherProblem,
} from "./phase4";

describe("referral codes", () => {
  it("builds a code from the name and the last digits of the student number", () => {
    expect(referralCodeFor("Vumisa", "202309530")).toBe("VUMI-9530");
    expect(referralCodeFor("Jo", "12")).toBe("JOXX-0012");
  });

  it("rejects badly formed codes and your own", () => {
    expect(validateReferralCode("nope", "VUMI-9530")).toMatch(/look like/);
    expect(validateReferralCode("vumi-9530", "VUMI-9530")).toMatch(/your own/);
    expect(validateReferralCode("kamo-1234", "VUMI-9530")).toBeNull();
  });
});

describe("vouchers", () => {
  const voucher = { expiresAt: new Date(2026, 11, 1).toISOString(), minSpendCents: 5000 };
  it("is usable before it expires and above the minimum spend", () => {
    expect(voucherProblem(voucher, 6000, new Date(2026, 10, 1))).toBeNull();
  });
  it("explains why it cannot be used", () => {
    expect(voucherProblem(voucher, 6000, new Date(2027, 0, 1))).toMatch(/expired/);
    expect(voucherProblem(voucher, 3000, new Date(2026, 10, 1))).toBe("Spend R 20 more to use this voucher.");
    expect(voucherProblem(undefined, 0)).toBeNull();
  });
});

describe("order for later", () => {
  it("offers slots at least 45 minutes ahead, every 30 minutes, 08:00 to 20:00, today and tomorrow", () => {
    const now = new Date(2026, 9, 18, 10, 10);
    const slots = scheduleSlots(now);
    expect(slots[0]).toMatchObject({ day: "Today", label: "11:00" });
    expect(slots.every((slot) => new Date(slot.iso).getTime() >= now.getTime() + 45 * 60_000)).toBe(true);
    expect(slots.filter((slot) => slot.day === "Tomorrow")[0]!.label).toBe("08:00");
    expect(slots.at(-1)!.label).toBe("20:00");
  });

  it("only offers tomorrow late in the evening", () => {
    const slots = scheduleSlots(new Date(2026, 9, 18, 19, 30));
    expect(slots.filter((slot) => slot.day === "Today")).toHaveLength(0);
    expect(slots.length).toBeGreaterThan(20);
  });
});

describe("sellers, stock and tips", () => {
  it("verifies strong, established sellers", () => {
    expect(isVerifiedSeller({ rating: 4.9, ratingCount: 152 })).toBe(true);
    expect(isVerifiedSeller({ rating: 4.9, ratingCount: 10 })).toBe(false);
    expect(isVerifiedSeller({ rating: 4.2, ratingCount: 500 })).toBe(false);
  });
  it("knows what is sold out", () => {
    expect(isSoldOut("tablet-desk")).toBe(true);
    expect(isSoldOut("burger-chips")).toBe(false);
  });
  it("parses custom tips", () => {
    expect(parseTip("15")).toBe(1500);
    expect(parseTip("7,50")).toBe(750);
    expect(parseTip("0")).toBeNull();
    expect(parseTip("abc")).toBeNull();
    expect(parseTip("9999")).toBeNull();
  });
});
