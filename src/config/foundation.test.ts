import { architectureStatus, foundationCapabilities } from "./foundation";

describe("Vossie foundation contract", () => {
  it("keeps the approved foundation separate from product decisions", () => {
    expect(architectureStatus).toEqual({
      foundation: "Ready",
      productSpecification: "Pending",
    });
  });

  it("declares the supported development surfaces", () => {
    expect(foundationCapabilities).toContain("React Native Web in Chrome");
    expect(foundationCapabilities).toContain("Native iOS delivery path");
  });
});
