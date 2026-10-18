// HMAC signature helpers shared by the payment functions. Pure Web Crypto, so it runs in Deno and Node.

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySignature(secret: string, payload: string, signature: string | null): Promise<boolean> {
  if (!secret || !signature) return false;
  return safeEqual(await hmacSha256Hex(secret, payload), signature.trim().toLowerCase());
}
