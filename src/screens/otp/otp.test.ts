import { cleanCode, DEMO_CODE, maskEmail, OTP_LENGTH } from "./otp";

describe("one-time code helpers", () => {
  it("keeps digits only and caps the length", () => {
    expect(cleanCode("12a 3-45")).toBe("12345");
    expect(cleanCode("1234567890")).toBe("123456");
    expect(cleanCode("")).toBe("");
  });

  it("masks the email so it can be shown on screen", () => {
    expect(maskEmail("eduv230953@vossie.net")).toBe("e••••••3@vossie.net");
    expect(maskEmail("ab@vossie.net")).toBe("a@vossie.net");
    expect(maskEmail("nonsense")).toBe("nonsense");
  });

  it("uses a six digit demo code", () => {
    expect(DEMO_CODE).toHaveLength(OTP_LENGTH);
    expect(/^\d+$/.test(DEMO_CODE)).toBe(true);
  });
});
