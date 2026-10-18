import { base32Decode, base32Encode, generateSecret, groupSecret, otpauthUri, totp, verifyTotp } from "./totp";

// RFC 6238 appendix B: secret "12345678901234567890", HMAC-SHA1. The RFC lists 8-digit codes; 6 digits are the last 6.
const RFC_SECRET = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors", () => {
    expect(totp(RFC_SECRET, 59_000, 8)).toBe("94287082");
    expect(totp(RFC_SECRET, 1_111_111_109_000, 8)).toBe("07081804");
    expect(totp(RFC_SECRET, 1_111_111_111_000, 8)).toBe("14050471");
    expect(totp(RFC_SECRET, 1_234_567_890_000, 8)).toBe("89005924");
    expect(totp(RFC_SECRET, 2_000_000_000_000, 8)).toBe("69279037");
    expect(totp(RFC_SECRET, 59_000)).toBe("287082");
  });

  it("round-trips base32", () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes));
    expect(base32Encode(new TextEncoder().encode("foobar"))).toBe("MZXW6YTBOI");
  });

  it("accepts the current code and one step either side, and nothing else", () => {
    const now = 1_700_000_000_000;
    const code = totp(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now - 30_000), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now + 30_000), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now - 90_000), now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "abcdef", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, now)).toBe(true);
  });

  it("makes secrets, links and grouped keys", () => {
    const secret = generateSecret((count) => Uint8Array.from({ length: count }, (_, index) => index * 7));
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(groupSecret("ABCDEFGHIJKL")).toBe("ABCD EFGH IJKL");
    const uri = otpauthUri("eduv230953@vossie.net", secret);
    expect(uri).toContain("otpauth://totp/Vossie%20Marketplace:eduv230953%40vossie.net");
    expect(uri).toContain(`secret=${secret}`);
  });
});
