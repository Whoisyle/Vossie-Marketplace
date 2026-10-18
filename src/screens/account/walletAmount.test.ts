import { parseRandToCents } from "./walletAmount";

describe("parseRandToCents", () => {
  it("parses whole and decimal rand amounts", () => {
    expect(parseRandToCents("150")).toBe(15000);
    expect(parseRandToCents("150,50")).toBe(15050);
    expect(parseRandToCents(" 1 200.5 ")).toBe(120050);
  });

  it("rejects empty, negative and malformed input", () => {
    expect(parseRandToCents("")).toBeNull();
    expect(parseRandToCents("-5")).toBeNull();
    expect(parseRandToCents("12.345")).toBeNull();
    expect(parseRandToCents("abc")).toBeNull();
  });
});
