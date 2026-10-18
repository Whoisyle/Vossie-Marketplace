import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hmacSha256Hex, safeEqual, verifySignature } from "../functions/_shared/signature.ts";

describe("webhook signatures", () => {
  it("accepts the correct signature and rejects anything else", async () => {
    const body = JSON.stringify({ id: "evt_1", type: "payment.captured" });
    const good = await hmacSha256Hex("secret", body);
    assert.equal(await verifySignature("secret", body, good), true);
    assert.equal(await verifySignature("secret", body, good.toUpperCase()), true);
    assert.equal(await verifySignature("wrong", body, good), false);
    assert.equal(await verifySignature("secret", body + " ", good), false);
    assert.equal(await verifySignature("secret", body, null), false);
    assert.equal(await verifySignature("", body, good), false);
  });

  it("compares in constant shape and handles length differences", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abcd"), false);
  });
});
