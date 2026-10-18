export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;
/** Demo mode only. With the backend switched on, the real emailed code is checked by Supabase. */
export const DEMO_CODE = "123456";

/** Keeps digits only, up to the code length (paste, autofill and the keyboard all go through here). */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/** j***e@vossie.net: enough to recognise, not enough to read out loud. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.trim().split("@");
  if (!name || !domain) return email;
  const shown = name.length <= 2 ? name[0]! : `${name[0]}${"•".repeat(Math.min(name.length - 2, 6))}${name[name.length - 1]}`;
  return `${shown}@${domain}`;
}
