import type { Faq, Reel } from "../types";

export const reelsSeed: Reel[] = [
  {
    id: "reel-1",
    seller: "CampusBites",
    caption: "Fresh off the grill 🍔 Burger & Chips, R60 — collect in 15 min.",
    listingId: "burger-chips",
    likes: 214,
    tint: "#35505C",
    comments: [
      { id: "c1", author: "thabo.n", body: "Best burger on campus fr" },
      { id: "c2", author: "lerato.m", body: "Do you deliver to res?" },
    ],
  },
  {
    id: "reel-2",
    seller: "Kamo Threads",
    caption: "Thrift drop: vintage denim, sizes S–L. First come, first served.",
    listingId: "denim-jacket",
    likes: 388,
    tint: "#376371",
    comments: [{ id: "c1", author: "studentstyles", body: "Need the M 🙌" }],
  },
  {
    id: "reel-3",
    seller: "TechSwap Potch",
    caption: "Tested & ready: Mint 14\" laptop with charger and sleeve.",
    listingId: "mint-laptop",
    likes: 156,
    tint: "#2D4652",
    comments: [],
  },
  {
    id: "reel-4",
    seller: "Sweet Tooth by Lerato",
    caption: "Matcha-dipped strawberries for exam week 🍓",
    listingId: "choc-strawberries",
    likes: 502,
    tint: "#556C77",
    comments: [{ id: "c1", author: "aiden.p", body: "Ordering 2 boxes" }],
  },
];

export const faqs: Faq[] = [
  {
    id: "verify-student",
    question: "How do I verify my student status?",
    answer:
      "Sign in with your Eduvos Microsoft account. Your student status is confirmed by Eduvos and shown as a Verified Student badge on your account.",
  },
  {
    id: "become-seller",
    question: "How do I become a seller?",
    answer:
      "Go to Account → Switch role and choose Seller or Service provider. Add your business details and your first listing; our team reviews it before it goes live.",
  },
  {
    id: "report-issue",
    question: "How do I report an issue with an order?",
    answer:
      "Open the order from Activity → My Orders, tap View Details and choose Report a problem. You can also chat with support from Help.",
  },
  {
    id: "reset-password",
    question: "How do I reset my password?",
    answer:
      "Your password is managed by your Eduvos Microsoft account. Use “Can't access your account?” on the sign-in screen to reset it.",
  },
  {
    id: "refunds",
    question: "How do refunds work?",
    answer:
      "If a seller cancels or an issue is upheld, the refund goes back to your original payment method or your Vossie wallet within 3–5 working days.",
  },
];
