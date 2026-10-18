/**
 * Backend failures arrive as Postgres messages such as `insufficient_stock: Burger`. The database raises
 * short snake_case codes on purpose; this maps them to a stable code the UI can switch on and a message
 * a student can read. Unknown errors keep a generic message and never leak SQL text.
 */

export type ServiceErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "conflict"
  | "unavailable"
  | "payment"
  | "rate_limited"
  | "network"
  | "unknown";

type Rule = { match: RegExp; code: ServiceErrorCode; message: string };

const rules: Rule[] = [
  { match: /not_authenticated|JWT|jwt expired/i, code: "not_authenticated", message: "Please sign in again." },
  { match: /forbidden|permission denied|42501|not_a_seller|seller_not_active|workspace_not_available/i, code: "forbidden", message: "You are not allowed to do that." },
  { match: /not_found|P0002/i, code: "not_found", message: "We couldn't find that." },
  { match: /insufficient_stock/i, code: "unavailable", message: "There isn't enough stock left for that item." },
  { match: /slot_unavailable|slot_required/i, code: "unavailable", message: "That time slot is no longer available." },
  { match: /item_unavailable|listing_unavailable|job_unavailable/i, code: "unavailable", message: "That item is no longer available." },
  { match: /wrong_campus/i, code: "unavailable", message: "That item is on a different campus." },
  { match: /handoff_unavailable|delivery_unavailable/i, code: "unavailable", message: "That item can't be sent this way." },
  { match: /insufficient_funds|insufficient_available_funds/i, code: "payment", message: "There isn't enough balance for that." },
  { match: /invalid_voucher/i, code: "invalid_input", message: "That voucher code isn't valid." },
  { match: /invalid_student_number/i, code: "invalid_input", message: "Enter a student number that starts with eduv." },
  { match: /Demo accounts need an @/i, code: "invalid_input", message: "Use your @vossie.net email address." },
  { match: /cart_empty/i, code: "invalid_input", message: "Your cart is empty." },
  { match: /profile_incomplete/i, code: "invalid_input", message: "Finish your profile and pick a campus first." },
  { match: /address_required/i, code: "invalid_input", message: "Enter a delivery address." },
  { match: /payment_method_required/i, code: "invalid_input", message: "Choose a card to pay with." },
  { match: /own_listing/i, code: "forbidden", message: "You can't buy your own listing." },
  { match: /cancellation_not_allowed|past_cancellation_cutoff/i, code: "conflict", message: "This order can't be cancelled any more. Report a problem instead." },
  { match: /issue_window_closed/i, code: "conflict", message: "The time to report a problem on this order has passed." },
  { match: /invalid_status|already_resolved|already_final|listing_in_review/i, code: "conflict", message: "That isn't possible at this stage." },
  { match: /rate_limited|53400|over_email_send_rate_limit|rate limit/i, code: "rate_limited", message: "Too many attempts. Please wait a moment." },
  { match: /blocked/i, code: "forbidden", message: "You can't message this person." },
  { match: /Failed to fetch|Network request failed|fetch failed/i, code: "network", message: "No connection. Check your internet and try again." },
];

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly detail: string;

  constructor(code: ServiceErrorCode, message: string, detail = "") {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.detail = detail;
  }
}

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error ?? "");
  const text = typeof error === "object" && error !== null && "message" in error ? String((error as { message: unknown }).message) : raw;
  const rule = rules.find((item) => item.match.test(text));
  return rule
    ? new ServiceError(rule.code, rule.message, text)
    : new ServiceError("unknown", "Something went wrong. Please try again.", text);
}

/** Wrong handoff codes come back as data rather than errors so failed attempts are counted server-side. */
export const handoffMessages: Record<string, string> = {
  wrong_code: "That code isn't right.",
  locked: "Too many wrong tries. Ask for a new code.",
  expired: "That code has expired. Ask for a new one.",
  no_code: "There is no active code. Ask for a new one.",
};
