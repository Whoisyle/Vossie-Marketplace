import { formatCardNumber, formatExpiry, isValidExpiry } from "./cardFormat";

describe("card formatting", () => {
  it("groups digits in fours and caps at 16", () => {
    expect(formatCardNumber("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42a4")).toBe("424");
  });

  it("inserts the expiry slash", () => {
    expect(formatExpiry("1228")).toBe("12/28");
    expect(formatExpiry("1")).toBe("1");
  });

  it("rejects bad or past expiries", () => {
    const now = new Date(2026, 9, 18);
    expect(isValidExpiry("10/26", now)).toBe(true);
    expect(isValidExpiry("09/26", now)).toBe(false);
    expect(isValidExpiry("13/30", now)).toBe(false);
    expect(isValidExpiry("1/30", now)).toBe(false);
  });
});
