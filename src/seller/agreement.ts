import type { SellerKind } from "./types";

/**
 * The seller agreement. Change the wording only by bumping AGREEMENT_VERSION (and the matching version in the database,
 * private.seller_agreement_version): everyone then signs again. This is a plain-language draft written for the owner; it
 * has to be checked by a South African lawyer before Vossie goes live (consumer protection, food safety, privacy).
 */
export const AGREEMENT_VERSION = "2026-11-v1";

export type AgreementDetails = {
  fullName: string;
  studentNumber: string;
  email: string;
  campus: string;
  storeName: string;
  kind: SellerKind | null;
  /** The ID number as typed, or empty before it is known. */
  idNumber: string;
  /** Today, as a readable date, added automatically. */
  date: string;
};

/** What the seller promises, in the order it is shown. */
export const AGREEMENT_PROMISES: { title: string; text: string }[] = [
  { text: "Only things I own, have in stock, or can really provide. Nothing I do not have.", title: "I sell only what is real" },
  { text: "My descriptions, prices and photos are true. I will not copy other people's photos or sell fakes.", title: "I describe it honestly" },
  { text: "Nothing illegal, stolen, counterfeit, unsafe, age-restricted or banned by Vossie.", title: "I sell only what is allowed" },
  { text: "I am responsible for the food and goods I sell: safe, clean, correctly made and described, with allergens declared.", title: "I am responsible for what I sell" },
  { text: "I follow Vossie's order, hand-over code, return and dispute rules, and I do not take buyers off the app to avoid fees.", title: "I follow the order rules" },
  { text: "I do not fake reviews, change prices unfairly or hide stock.", title: "I play fair" },
  { text: "Vossie may hold a payout while a dispute is open, and may suspend or remove my store if I break these rules.", title: "I accept the consequences" },
  { text: "My details and documents are true and mine. Vossie may use them to verify me and keep buyers safe, as its privacy policy says.", title: "I confirm my details" },
  { text: "I understand that I, and not Vossie, am personally responsible for everything I list and sell.", title: "It is my responsibility" },
];

/** The opening sentence, with the seller's own details filled in. */
export function agreementIntro(details: AgreementDetails): string {
  const id = details.idNumber ? `, ID number ${details.idNumber}` : "";
  return `I, ${details.fullName} (student number ${details.studentNumber}, email ${details.email}${id}), trade on Vossie Marketplace as ${details.storeName || "my store"}, on the ${details.campus} campus. I agree to the following.`;
}

/** The whole agreement as plain text: what is hashed, so the exact words that were signed can be proved later. */
export function agreementPlainText(details: AgreementDetails): string {
  return [
    `Vossie seller agreement, version ${AGREEMENT_VERSION}`,
    agreementIntro(details),
    ...AGREEMENT_PROMISES.map((promise, index) => `${index + 1}. ${promise.title}. ${promise.text}`),
  ].join("\n");
}

/** The words that never change, hashed without the seller's details, so every signature of one version shares one hash. */
export function agreementTemplateText(): string {
  return [`Vossie seller agreement, version ${AGREEMENT_VERSION}`, ...AGREEMENT_PROMISES.map((promise, index) => `${index + 1}. ${promise.title}. ${promise.text}`)].join("\n");
}

/** Names compared the way the database does: ignoring case and extra spaces. */
export function sameName(a: string, b: string): boolean {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return clean(a).length >= 3 && clean(a) === clean(b);
}
