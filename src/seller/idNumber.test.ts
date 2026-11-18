import { cleanIdNumber, formatIdNumber, isValidSouthAfricanId, maskIdNumber } from "./idNumber";

/** Adds the check digit to the first twelve digits, so a test can build an ID that is right in every way but one. */
function withCheckDigit(first12: string): string {
  for (let digit = 0; digit <= 9; digit += 1) {
    const candidate = `${first12}${digit}`;
    let sum = 0;
    for (let position = 1; position <= 13; position += 1) {
      let value = Number(candidate[13 - position]);
      if (position % 2 === 0) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      sum += value;
    }
    if (sum % 10 === 0) return candidate;
  }
  throw new Error("no check digit");
}

describe("South African ID numbers", () => {
  it("accepts a number with a real date, citizenship digit and check digit, with or without spaces", () => {
    expect(isValidSouthAfricanId("8001015009087")).toBe(true);
    expect(isValidSouthAfricanId("800101 5009 087")).toBe(true);
    expect(isValidSouthAfricanId("0506150123087")).toBe(true);
    expect(isValidSouthAfricanId(withCheckDigit("800101500918"))).toBe(true);
  });

  it("refuses a wrong check digit, a wrong length and anything that is not digits", () => {
    expect(isValidSouthAfricanId("8001015009086")).toBe(false);
    expect(isValidSouthAfricanId("800101500908")).toBe(false);
    expect(isValidSouthAfricanId("80010150090870")).toBe(false);
    expect(isValidSouthAfricanId("80010150090AB")).toBe(false);
    expect(isValidSouthAfricanId("")).toBe(false);
  });

  it("refuses a date that does not exist, even when the check digit is right", () => {
    expect(isValidSouthAfricanId(withCheckDigit("800230500908"))).toBe(false);
    expect(isValidSouthAfricanId(withCheckDigit("801301500908"))).toBe(false);
    expect(isValidSouthAfricanId(withCheckDigit("800100500908"))).toBe(false);
  });

  it("refuses a citizenship digit that is not 0 or 1, even when the check digit is right", () => {
    expect(isValidSouthAfricanId(withCheckDigit("800101500928"))).toBe(false);
  });

  it("accepts the 29th of February only in a leap year", () => {
    expect(isValidSouthAfricanId(withCheckDigit("000229500908"))).toBe(true);
    expect(isValidSouthAfricanId(withCheckDigit("010229500908"))).toBe(false);
  });

  it("formats and masks for showing", () => {
    expect(cleanIdNumber(" 800101 5009 087 ")).toBe("8001015009087");
    expect(formatIdNumber("8001015009087")).toBe("800101 5009 087");
    expect(formatIdNumber("80010")).toBe("80010");
    expect(maskIdNumber("8001015009087")).toBe("•••••••••9087");
  });
});
