/**
 * Draft legal text. It is written in plain English so it can be reviewed, but it has NOT been checked by a
 * lawyer and must be replaced or approved before release (POPIA, consumer protection and marketplace terms).
 */
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { id: "terms" | "privacy" | "community"; title: string; summary: string; updated: string; sections: LegalSection[] };

export const LEGAL_DRAFT_NOTICE = "Draft text, needs legal review before release.";
export const LEGAL_VERSION = "draft-2026-10-18";

export const legalDocs: LegalDoc[] = [
  {
    id: "terms",
    summary: "The rules for buying, selling and delivering on Vossie.",
    title: "Terms and Conditions",
    updated: "18 Oct 2026",
    sections: [
      { body: ["Vossie Marketplace is a campus marketplace for students. By creating an account you agree to these terms.", "You must be a student with a valid Eduvos email address, and you must give accurate information."], heading: "Who can use Vossie" },
      { body: ["Buyers pay Vossie. Vossie holds the money until the order is handed over or delivered, then releases it to the seller after the issue window.", "Prices shown include any deals. Delivery fees, discounts and vouchers are shown before you pay."], heading: "Buying and payments" },
      { body: ["Sellers must list only items and services they are allowed to sell, describe them honestly and fulfil accepted orders.", "Prohibited items (such as weapons, illegal goods and counterfeit products) are not allowed and will be removed."], heading: "Selling" },
      { body: ["You can choose a Vossie courier, hub to hub (for items from another campus), a third-party courier, or collect it yourself.", "Delivery uses one-time codes at pick-up and drop-off. Never share a code with anyone except the courier at the door."], heading: "Delivery and collection" },
      { body: ["If something is wrong with an order, open an issue from the order within the issue window. Vossie reviews it and may refund all or part of the order.", "Refunds go back to the original payment method or your Vossie wallet."], heading: "Problems and refunds" },
      { body: ["Subscriptions renew every month until you cancel. When you cancel, the plan stays active until the end of the period you paid for.", "Vossie Points have no cash value outside Vossie and can change with notice."], heading: "Subscriptions and points" },
      { body: ["We may suspend an account that breaks these terms or the Community Rules.", "We may update these terms. We will tell you in the app before a change takes effect."], heading: "Changes and suspension" },
    ],
  },
  {
    id: "privacy",
    summary: "What we collect, why, and the choices you have.",
    title: "Privacy Policy",
    updated: "18 Oct 2026",
    sections: [
      { body: ["Your name, Eduvos email, student number, campus, phone number, profile photo, orders, messages, wallet history and the places you share for delivery or tracking."], heading: "What we collect" },
      { body: ["To run your account, deliver orders, keep payments safe, prevent fraud, give support and improve the app.", "We use your student number only to check you are a student."], heading: "Why we use it" },
      { body: ["Sellers and couriers see only what they need for an order (for example a delivery address and a first name). Payment providers see payment details. We do not sell your personal information."], heading: "Who sees it" },
      { body: ["You can turn off personalised recommendations, limit who sees your profile, and block people in Security and Settings.", "You can ask for a copy of your data or delete your account. Some records are kept for the time the law requires."], heading: "Your choices" },
      { body: ["Card numbers are handled by the payment provider and are not stored in the app. Location is used only while you track or share an order."], heading: "Cards and location" },
      { body: ["Contact Vossie Support from the Help screen for any privacy question or request."], heading: "Contact" },
    ],
  },
  {
    id: "community",
    summary: "How we expect everyone to behave.",
    title: "Community Rules",
    updated: "18 Oct 2026",
    sections: [
      { body: ["Treat other students, sellers and couriers with respect. No harassment, hate or threats."], heading: "Be respectful" },
      { body: ["Keep chats and payments inside Vossie, and meet in busy, well-lit places on campus. Use the Safe meet-up spots."], heading: "Stay safe" },
      { body: ["Be honest in listings, photos and reviews. Do not post fake reviews or pretend to be someone else."], heading: "Be honest" },
      { body: ["Report anything that worries you from the Safety page or a conversation. In an emergency call 10111 (police), 10177 (ambulance) or 112 from a mobile phone first."], heading: "Report problems" },
    ],
  },
];

export function getLegalDoc(id: string): LegalDoc | undefined {
  return legalDocs.find((doc) => doc.id === id);
}
