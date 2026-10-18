/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 second steps): the same codes Google
 * Authenticator, Microsoft Authenticator and 1Password produce. Written without any library so it runs in Expo Go,
 * and checked against the RFC's own test vectors.
 */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

function sha1(message: Uint8Array): Uint8Array {
  const words: number[] = [];
  const length = message.length;
  for (let i = 0; i < length; i += 1) words[i >> 2] = (words[i >> 2] ?? 0) | (message[i]! << (24 - (i % 4) * 8));
  words[length >> 2] = (words[length >> 2] ?? 0) | (0x80 << (24 - (length % 4) * 8));
  const total = (((length + 8) >> 6) + 1) * 16;
  for (let i = 0; i < total; i += 1) words[i] = words[i] ?? 0;
  words[total - 1] = length * 8;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  const rol = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  for (let block = 0; block < total; block += 16) {
    for (let t = 0; t < 16; t += 1) w[t] = words[block + t]!;
    for (let t = 16; t < 80; t += 1) w[t] = rol(w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!, 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let t = 0; t < 80; t += 1) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rol(a, 5) + f + e + k + w[t]!) | 0;
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }
  const out = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((word, index) => {
    out[index * 4] = (word >>> 24) & 255;
    out[index * 4 + 1] = (word >>> 16) & 255;
    out[index * 4 + 2] = (word >>> 8) & 255;
    out[index * 4 + 3] = word & 255;
  });
  return out;
}

export function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = 64;
  const k = key.length > block ? sha1(key) : key;
  const inner = new Uint8Array(block + message.length);
  const outer = new Uint8Array(block + 20);
  for (let i = 0; i < block; i += 1) {
    const byte = k[i] ?? 0;
    inner[i] = byte ^ 0x36;
    outer[i] = byte ^ 0x5c;
  }
  inner.set(message, block);
  outer.set(sha1(inner), block);
  return sha1(outer);
}

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/** The code for a secret (base32) at a time, in milliseconds. */
export function totp(secret: string, atMs: number = Date.now(), digits: number = TOTP_DIGITS): string {
  const counter = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
  const message = new Uint8Array(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i -= 1) {
    message[i] = remaining & 255;
    remaining = Math.floor(remaining / 256);
  }
  const hash = hmacSha1(base32Decode(secret), message);
  const offset = hash[19]! & 15;
  const binary = ((hash[offset]! & 0x7f) << 24) | (hash[offset + 1]! << 16) | (hash[offset + 2]! << 8) | hash[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** True when the code matches this step or one step either side, to allow for a slightly wrong phone clock. */
export function verifyTotp(secret: string, code: string, atMs: number = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return [-1, 0, 1].some((step) => totp(secret, atMs + step * TOTP_STEP_SECONDS * 1000) === clean);
}

/** A fresh 160-bit secret from the phone's secure random source. */
export function generateSecret(randomBytes?: (count: number) => Uint8Array): string {
  const bytes = randomBytes ? randomBytes(20) : secureRandomBytes(20);
  return base32Encode(bytes);
}

function secureRandomBytes(count: number): Uint8Array {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("expo-crypto") as typeof import("expo-crypto")).getRandomBytes(count);
  } catch {
    const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
    if (cryptoApi?.getRandomValues) return cryptoApi.getRandomValues(new Uint8Array(count));
    throw new Error("No secure random source is available on this device.");
  }
}

/** The link an authenticator app opens to add the account (also what the QR code holds). */
export function otpauthUri(account: string, secret: string, issuer = "Vossie Marketplace"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

/** "ABCDEFGH..." as "ABCD EFGH ..." so it is easy to type. */
export function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
