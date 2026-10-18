/**
 * Vossie Marketplace legal documents, written for how Vossie actually works: a campus marketplace where students
 * and campus businesses sell goods and services, Vossie holds the payment until the order is handed over or
 * delivered, and couriers (Vossie, hub to hub and third-party) move items. They follow South African law:
 * the Electronic Communications and Transactions Act 25 of 2002 (ECTA), the Consumer Protection Act 68 of 2008
 * (CPA) and the Protection of Personal Information Act 4 of 2013 (POPIA).
 *
 * The numbers quoted here (15 minutes, 24 hours, 48 hours, R60, R15, points, plan prices) match the app and the
 * database settings. Change them in both places together.
 */
export type LegalSection = { heading: string; body: string[] };
export type LegalId = "terms" | "privacy" | "community" | "refunds" | "seller";
export type LegalDoc = { id: LegalId; title: string; summary: string; updated: string; sections: LegalSection[] };

export const LEGAL_VERSION = "2026-10-18";
export const LEGAL_UPDATED = "18 October 2026";

export const legalDocs: LegalDoc[] = [
  {
    id: "terms",
    summary: "The agreement between you and Vossie Marketplace.",
    title: "Terms and Conditions",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "About Vossie and these Terms",
        body: [
          "Vossie Marketplace (\"Vossie\", \"we\", \"us\") is a mobile marketplace for students and campus businesses at Eduvos campuses. People list goods and services, other students buy them, and Vossie takes the payment, holds it safely, arranges delivery or collection, and releases the money once the order is done.",
          "These Terms, the Refunds and Cancellations policy, the Seller Terms (if you sell), the Community Rules and the Privacy Policy together form the agreement between you and Vossie. By creating an account, or by using Vossie, you agree to them.",
          "Vossie is not affiliated with, endorsed by or part of Eduvos. We use your Eduvos email address only to check that you are a student.",
        ],
      },
      {
        heading: "Who can use Vossie",
        body: [
          "You must be a student with a working Eduvos email address, and you must give us accurate information, including your name, student number, phone number and campus.",
          "You must be 18 or older. If you are younger, you may only use Vossie with the consent and supervision of a parent or guardian, who is responsible for your use.",
          "You are responsible for keeping your sign-in, your one-time codes and your device safe, and for everything done through your account. Tell us straight away if you think someone else has access. You may not sell, share or transfer your account.",
        ],
      },
      {
        heading: "What Vossie does, and what it does not",
        body: [
          "Vossie provides the platform. Sellers and service providers are independent: they decide what to sell, the price, and the quality of what they provide. When you buy, the sale or service contract is between you and the seller. Vossie is a party only to the services we provide ourselves: the platform, payment handling, delivery by Vossie couriers, and our dispute process.",
          "We review listings and sellers, but we do not inspect every item and we cannot guarantee any listing. Descriptions, photos and reviews are provided by users.",
        ],
      },
      {
        heading: "Listings and prohibited items",
        body: [
          "You may only list items and services you are allowed to sell, and you must describe them honestly. The following may never be listed: firearms, ammunition and weapons; illegal drugs and drug equipment; stolen, counterfeit or pirated goods; anything that is unlawful to sell in South Africa; adult content; personal data of other people.",
          "Age-restricted goods (such as alcohol and vape products) need our approval before they appear, and may only be sold to buyers who are legally old enough. We may remove any listing, and suspend any account, that breaks these rules.",
        ],
      },
      {
        heading: "Prices and payment",
        body: [
          "All prices are in South African rand (ZAR) and include any discount shown. The delivery fee, any discount, voucher and your total are shown before you pay. Prices include VAT where the seller is required to charge it.",
          "You can pay with a saved card, Apple Pay or Google Pay where available, instant EFT, or your Vossie Wallet. Card details are handled by our payment provider and are not stored in the app. We may refuse or reverse a payment we reasonably suspect is fraudulent.",
          "Your payment holds the order for you for 15 minutes. If payment does not go through in that time, the order and any stock or booking slot being held for you are released.",
        ],
      },
      {
        heading: "Vossie Wallet",
        body: [
          "The Vossie Wallet is a balance you keep in the app to pay for orders, subscriptions and tips on Vossie. It is not a bank account, does not earn interest and can only be used on Vossie.",
          "You can add money with a card or instant EFT. You can withdraw your balance back to a saved card; the smallest withdrawal is R60, and it normally reaches the card within 1 to 3 working days. A withdrawal that fails is returned to your wallet.",
          "We may limit the amount you can hold or move to meet our legal duties, including the prevention of fraud and money laundering, and we may ask you to confirm who you are before we release money.",
        ],
      },
      {
        heading: "Orders, acceptance and one-time codes",
        body: [
          "When you place an order and pay, it is sent to the seller. The seller has 24 hours to accept it. If the seller declines or does not accept in time, you are refunded in full.",
          "Collection and delivery use one-time codes. The seller's pick-up code goes to the courier, and your drop-off code goes only to you. Give your code to the courier or seller only when you have the item in your hands and are happy to proceed. Never share a code by message or with anyone else, and Vossie will never ask you for one.",
          "Vossie holds your payment while the order is in progress. It is released to the seller after the order has been handed over or delivered and your 48-hour issue window has passed with no open issue, or earlier if you confirm everything is fine.",
        ],
      },
      {
        heading: "Delivery and collection",
        body: [
          "Depending on the order you can choose: a Vossie courier on your own campus, hub to hub for items from a seller on another campus (the item travels to your campus hub and you collect it there), a third-party courier, or collecting it yourself. The options, fees and estimated times are shown at checkout. Estimates are not promises.",
          "You must give an accurate delivery spot and be reachable when the courier arrives. If the courier cannot reach you, the order may be returned to the seller and we may charge the delivery fee. Risk in the item passes to you when you confirm delivery with your drop-off code.",
          "Order for later lets you pick a time slot between 08:00 and 20:00 (South African time), at least 45 minutes ahead. The seller is reminded before your slot, but the exact time can depend on the seller and the courier.",
        ],
      },
      {
        heading: "Cancellations, returns and refunds",
        body: [
          "Your rights to cancel, return or be refunded are explained in the Refunds and Cancellations policy, which forms part of these Terms. Nothing in these Terms limits the rights you have under the Consumer Protection Act or the Electronic Communications and Transactions Act.",
        ],
      },
      {
        heading: "Vossie Points, referrals, vouchers and offers",
        body: [
          "You earn 1 Vossie Point for every R10 you spend on an order, added when the order is delivered (Vossie Plus members earn double). 10 points are worth R1 and can be redeemed as wallet credit in steps of 100 points. Points have no cash value, cannot be sold or transferred, and can be changed or withdrawn on reasonable notice. Points from an order that is later refunded may be removed.",
          "When a friend signs up with your referral code and their first order is delivered, you and your friend each earn 200 points. We may withhold or remove rewards for abuse, such as fake accounts or referring yourself.",
          "Vouchers and coupons have an expiry date and may have a minimum spend. They cannot be exchanged for cash, and we may cancel a voucher that was obtained or used unfairly.",
        ],
      },
      {
        heading: "Subscriptions",
        body: [
          "Vossie offers optional monthly plans: Vossie Plus (R49 a month), Vossie Seller Pro (R99 a month) and Vossie Study Pass (R29 a month). Each plan's benefits are listed on the Subscriptions screen before you join.",
          "A plan is paid from your Vossie Wallet and renews every month until you cancel. If your wallet cannot cover a renewal, the plan ends. You can cancel at any time in the app; the plan then stays active until the end of the month you have paid for. We do not refund part of a month already paid for. We will tell you in the app before changing a price, and a change only applies from your next renewal.",
        ],
      },
      {
        heading: "Tips",
        body: [
          "After a delivery you may rate your courier and add a tip. Tips are voluntary, go to the courier, and are not refundable once sent unless the courier's delivery was cancelled or reversed.",
        ],
      },
      {
        heading: "Reviews, messages and your content",
        body: [
          "Only buyers who received an item or service can review it. Reviews must be honest and based on your own experience. You keep ownership of what you post (photos, reviews, listings, messages), but you give Vossie a free, non-exclusive licence to show and store it in the app to run the service. You promise you have the right to post it.",
          "We may remove content that breaks the Community Rules or the law.",
        ],
      },
      {
        heading: "Safety and conduct",
        body: [
          "You must follow the Community Rules. For your own safety, keep chats and payments inside Vossie, use the safe meet-up spots on campus, and use the Safety section to share a trip or report a problem. In an emergency, call 10111 (police), 10177 (ambulance) or 112 from a mobile phone before anything else.",
        ],
      },
      {
        heading: "Our responsibility",
        body: [
          "We take reasonable care to provide Vossie, but we cannot promise that it will always be available, error-free or uninterrupted, for example during maintenance or because of problems with a network or a provider.",
          "To the extent the law allows, Vossie is not liable for the quality, safety or legality of items and services sold by others, or for losses we could not reasonably have foreseen. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including for gross negligence, and nothing limits your rights under the Consumer Protection Act, such as the right to goods that are of good quality and fit for purpose and to services performed with reasonable care and skill.",
        ],
      },
      {
        heading: "Suspension and ending your account",
        body: [
          "You can delete your account at any time in Security and Settings. Your private data is removed after 30 days, except records we must keep by law or to deal with a dispute, a fraud investigation or an open order. Wallet money is returned to your card before closing the account where this is possible.",
          "We may warn, restrict or suspend an account, hold payments and remove content if you break these Terms or the law, put others at risk, or if we must do so to meet a legal duty. Where we can, we tell you why and how to appeal.",
        ],
      },
      {
        heading: "Changes to these Terms",
        body: [
          "We may update these Terms to reflect changes to Vossie, the law or our practices. We will tell you in the app before a material change takes effect and show the date at the top of the document. If you keep using Vossie after that date you accept the change; if you do not, you may close your account.",
        ],
      },
      {
        heading: "Complaints, disputes and governing law",
        body: [
          "If you are unhappy, start with an order issue (see Refunds and Cancellations) or contact Vossie Support from the Help screen. We will acknowledge your complaint and try to resolve it fairly.",
          "You may also approach the National Consumer Commission, your provincial consumer protector or the Information Regulator (for privacy matters). These Terms are governed by the laws of the Republic of South Africa, and the South African courts have jurisdiction, without limiting any right you have to use another forum the law gives you.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Contact Vossie Support from the Help screen in the app. Use the same place to ask for the registered details of the business operating Vossie Marketplace, as the law requires us to give them to you on request.",
        ],
      },
    ],
  },
  {
    id: "refunds",
    summary: "When you can cancel, return or get your money back.",
    title: "Refunds and Cancellations",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Cancel before the seller accepts",
        body: [
          "You can cancel an order in the app until the seller accepts it, and you are refunded in full. If the seller declines, or does not accept within 24 hours, we cancel it and refund you in full.",
        ],
      },
      {
        heading: "After the seller accepts",
        body: [
          "Once the seller has accepted and started preparing your order, you can no longer cancel it in the app. If you need to change or stop it, message the seller; if the seller agrees, they can cancel it and you are refunded. Food and drinks that are being prepared, and items made or customised for you, cannot be returned simply because you changed your mind.",
        ],
      },
      {
        heading: "Problems with your order: the 48-hour issue window",
        body: [
          "After your order is handed over or delivered you have 48 hours to open an issue from the order if something is wrong. Examples: the item was not delivered, is not as described, is damaged or faulty, is the wrong item, or a service was not provided or not provided properly.",
          "Vossie keeps the payment on hold while an issue is open. Both you and the seller can add messages and photos, and we may ask for more information. We then decide fairly: a full refund, a partial refund, or no refund where the issue is not supported. We tell you the outcome and the reason.",
        ],
      },
      {
        heading: "How and when you are refunded",
        body: [
          "Refunds go back to the way you paid. A refund to your Vossie Wallet is immediate. A refund to a card or bank account depends on your bank and usually takes 5 to 10 working days. Delivery fees are refunded when the delivery was not provided or the order is cancelled before it was collected, and vouchers used on a refunded order may be returned to you when still valid. Vossie Points earned from a refunded order may be removed.",
        ],
      },
      {
        heading: "Your rights by law",
        body: [
          "If you buy something online from a seller in South Africa you may have the right to cancel within 7 days of receiving the goods, without giving a reason, under section 44 of the Electronic Communications and Transactions Act. This right does not apply to some purchases, including perishable goods such as food and drink, items made to your specification, and services booked for a particular date or time. When it applies, you pay the cost of returning the goods unless the seller agrees otherwise, and we refund you once the seller has the goods back.",
          "Under the Consumer Protection Act, goods must be of good quality, in good working order and free of defects, and you can return defective goods within 6 months of delivery for a repair, replacement or refund. Services must be performed with reasonable care and skill. We will never ask you to give up these rights.",
        ],
      },
      {
        heading: "Services and bookings",
        body: [
          "For tutoring, study rooms and other booked services, you can cancel a booking before it starts and are refunded in full unless the listing says otherwise. If a provider does not show up, you are refunded in full. If you do not show up, the provider may keep the booking fee, and you can open an issue if you think that is unfair.",
        ],
      },
      {
        heading: "Subscriptions, tips and withdrawals",
        body: [
          "Cancel a subscription at any time; it stays active until the end of the month you paid for, and we do not refund the part of the month already paid for unless the service was not provided. Tips are voluntary and not refundable once sent. A wallet withdrawal that fails is returned to your wallet.",
        ],
      },
    ],
  },
  {
    id: "seller",
    summary: "The rules for students and businesses that sell on Vossie.",
    title: "Seller Terms",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Who can sell",
        body: [
          "Any Vossie student, and campus businesses we approve, can apply to sell. We review each seller profile before it goes live, and we may ask for more information to confirm who you are and what you sell. You must be 18 or older, or have a parent or guardian's consent, and you must have the right to sell what you list.",
          "Selling can be your own business. You are not an employee, agent or partner of Vossie, and you are responsible for your own tax, including income tax and VAT if you are required to register.",
        ],
      },
      {
        heading: "Your listings",
        body: [
          "List only what you are allowed to sell and describe it truthfully, with real photos, the right price and the real stock. Services must say what is included, how long it takes and where it happens. Listings that mention prohibited or age-restricted items are blocked or sent for review. Keep your stock up to date: do not accept orders you cannot fulfil.",
        ],
      },
      {
        heading: "Orders and handover",
        body: [
          "You have 24 hours to accept a paid order. Mark it ready when it is. Hand it over only against the one-time code (to the buyer or to the courier), and never share a code you receive in any other way. Orders that you decline or do not accept in time are refunded to the buyer.",
          "Food must be prepared and sold lawfully and safely, and you are responsible for meeting food safety rules and any municipal or health requirements for the food you sell.",
        ],
      },
      {
        heading: "Fees and payouts",
        body: [
          "Vossie may charge a service fee on completed orders and a fee for optional plans such as Vossie Seller Pro. The fee that applies to you is shown in your seller tools and on each order, and any change applies only to new orders after we tell you.",
          "Payment for an order is released to your seller balance after the buyer's 48-hour issue window closes with no open issue, or earlier if the buyer confirms. You can request a payout to your own verified bank account. We may hold or reverse money where an issue, a dispute, a refund or suspected fraud is being dealt with.",
        ],
      },
      {
        heading: "Ratings, conduct and compliance",
        body: [
          "Reviews belong to the buyers who write them; you may not ask for, pay for or fake reviews. You must follow the Community Rules and deal with buyers and couriers respectfully. Sellers with a strong rating over many reviews may earn a Verified seller badge, which we may remove at any time.",
          "If you repeatedly cancel, ship items that are not as described, or break these terms, we may limit your listings, hold your payouts, or suspend your seller profile.",
        ],
      },
      {
        heading: "Your responsibility to buyers",
        body: [
          "You are responsible to the buyer for the goods and services you sell, including their quality, safety and legality, and for the buyer's rights under the Consumer Protection Act and the Electronic Communications and Transactions Act. You agree to cover any loss Vossie suffers because of an unlawful listing or a breach of these terms by you.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    summary: "What we collect, why, who sees it, and your rights under POPIA.",
    title: "Privacy Policy",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Who is responsible",
        body: [
          "Vossie Marketplace is the \"responsible party\" for your personal information under the Protection of Personal Information Act 4 of 2013 (POPIA). We have an Information Officer, reachable through Vossie Support in the Help screen. This notice explains what we collect, why, who sees it and your rights, as section 18 of POPIA requires.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Account details: your name, Eduvos email, student number, campus, phone number and profile photo. You give us these when you sign up. Giving us your name, email, student number and campus is necessary to use Vossie; your phone number and photo are optional.",
          "Activity: what you view, search, save, buy and sell, your orders, reviews, messages, support reports and your wallet, points and subscription history.",
          "Payments: we do not store your card number. Our payment provider handles it and gives us a token, the last four digits, the card brand and expiry.",
          "Location and delivery: your delivery spot and, while you track or share an order, location points for the order. We do not track your location in the background.",
          "Device and safety: your device type, sign-in history, and the trusted contacts and campus security number you choose to save in Safety.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To create and secure your account and check you are a student; to run orders, payments, deliveries, refunds and disputes; to keep Vossie and its users safe and prevent fraud; to give support; to recommend things you may like (you can turn this off); to send notices about your orders and account; and to improve Vossie.",
          "We use your student number only to confirm that you are a student. We only send you promotions if you switch them on.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Sellers and service providers see what they need to fulfil your order: your first name, the items, and the handover details. Couriers see the pick-up and drop-off spots and your first name, and, while an order is in delivery, a way to contact you. Other students see your public profile and reviews as you allow in Security and Settings.",
          "We use service providers to run Vossie: payment providers, our database and hosting provider, messaging and email, and delivery partners. They may only use your information to provide their service to us. We do not sell your personal information.",
          "We may share information with authorities where the law requires, or to protect people or prevent a crime.",
        ],
      },
      {
        heading: "Sending information outside South Africa",
        body: [
          "Some of our providers store or process information on servers outside South Africa. We only send your information there where the provider is bound by law, binding rules or an agreement to protect it to a standard similar to POPIA, as section 72 of POPIA requires.",
        ],
      },
      {
        heading: "How we keep it safe",
        body: [
          "We use access controls, encryption in transit, row-level security in our database, one-time handover codes and monitoring to protect your information. If there is a security compromise that affects your information, we will tell you and the Information Regulator as soon as reasonably possible, as POPIA requires.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your information while your account is open and for as long as needed for the purposes above. When you delete your account we remove your private details after 30 days. We may keep records of orders, payments and disputes for as long as the law or a legitimate need (such as a fraud investigation or tax record) requires, and we keep them only for that purpose.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask us what information we hold about you and to correct or delete information that is inaccurate, out of date, incomplete or that we no longer need. You can object to processing, withdraw your consent (this does not affect what we did before), turn off personalised recommendations, choose who sees your profile and block people, all in Security and Settings.",
          "To use a right, contact Vossie Support from the Help screen. If you believe we have not handled your information properly you can complain to the Information Regulator (South Africa) at inforegulator.org.za.",
        ],
      },
      {
        heading: "Direct marketing",
        body: [
          "We only send you marketing messages if you have switched on promotions in your notification settings. You can switch them off at any time.",
        ],
      },
      {
        heading: "Children",
        body: [
          "Vossie is for people aged 18 and older. We do not knowingly collect information about children. A younger student may only use Vossie with a parent or guardian's consent.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We will update this notice when our practices change and show the date at the top. We will tell you in the app if a change is important.",
        ],
      },
    ],
  },
  {
    id: "community",
    summary: "How we expect everyone to behave on Vossie.",
    title: "Community Rules",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Be respectful",
        body: ["Treat every student, seller, courier and Vossie team member with respect. No harassment, bullying, hate, threats, sexual content or discrimination, in messages, listings, reviews or reels."],
      },
      {
        heading: "Be honest",
        body: ["Describe items truthfully and use your own photos. No fake reviews, fake accounts, pretending to be someone else, or manipulating ratings, referrals or points."],
      },
      {
        heading: "Keep it legal and safe to trade",
        body: ["Do not list or ask for anything prohibited (weapons, drugs, stolen or counterfeit goods, adult content or anything unlawful). Do not ask people to pay or chat outside Vossie, and never ask for someone's one-time code, password or card details."],
      },
      {
        heading: "Meet safely",
        body: ["Use the safe meet-up spots on campus, meet in busy, well-lit places, let someone you trust know where you are with Share trip, and leave if you feel unsafe. In an emergency call 10111 (police), 10177 (ambulance) or 112 first."],
      },
      {
        heading: "Respect privacy",
        body: ["Do not share other people's personal details, photos or messages without their permission, and do not record people without their consent."],
      },
      {
        heading: "Report and block",
        body: ["You can report a person, listing, delivery or incident from the Safety section or from a conversation, and block anyone. We review reports and may remove content, restrict accounts or involve the authorities."],
      },
      {
        heading: "What happens if the rules are broken",
        body: ["We may remove content, give a warning, hold payouts, restrict or suspend an account, or end it. Serious or repeated breaches can lead to a permanent ban."],
      },
    ],
  },
];

export function getLegalDoc(id: string): LegalDoc | undefined {
  return legalDocs.find((doc) => doc.id === id);
}
