import type { Faq, Reel, Review } from "../types";
import { daysAgo } from "./time";

export const reelsSeed: Reel[] = [
  {
    id: "reel-1",
    seller: "CampusBites",
    sellerId: "campusbites",
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
    sellerId: "kamo-threads",
    caption: "Thrift drop: vintage denim, sizes S–L. First come, first served.",
    listingId: "denim-jacket",
    likes: 388,
    tint: "#376371",
    comments: [{ id: "c1", author: "studentstyles", body: "Need the M 🙌" }],
  },
  {
    id: "reel-3",
    seller: "TechSwap Potch",
    sellerId: "techswap",
    caption: "Tested & ready: Mint 14\" laptop with charger and sleeve.",
    listingId: "mint-laptop",
    likes: 156,
    tint: "#2D4652",
    comments: [],
  },
  {
    id: "reel-4",
    seller: "Sweet Tooth by Lerato",
    sellerId: "sweet-tooth",
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

/** Starter reviews so product and store pages are not empty. New ones come from students who completed an order. */
export const reviewsSeed: Review[] = [
  { author: "Thabo N.", body: "Best burger on campus, still hot when it arrived.", createdAt: daysAgo(3), id: "rv-1", listingId: "burger-chips", rating: 5, sellerId: "campusbites" },
  { author: "Lerato M.", body: "Generous portion. Chips could be crispier.", createdAt: daysAgo(9), id: "rv-2", listingId: "burger-chips", rating: 4, sellerId: "campusbites" },
  { author: "Aiden P.", body: "Perfect latte before an 8am lecture.", createdAt: daysAgo(2), id: "rv-3", listingId: "iced-latte", rating: 5, sellerId: "plato-coffee" },
  { author: "Kamo D.", body: "Good coffee, queue was a bit long.", createdAt: daysAgo(12), id: "rv-4", listingId: "iced-latte", rating: 4, sellerId: "plato-coffee" },
  { author: "Naledi M.", body: "Laptop was exactly as described. Charger included.", createdAt: daysAgo(6), id: "rv-5", listingId: "mint-laptop", rating: 5, sellerId: "techswap" },
  { author: "Sipho V.", body: "Great condition, seller was quick to reply.", createdAt: daysAgo(15), id: "rv-6", listingId: "mint-laptop", rating: 4, sellerId: "techswap" },
  { author: "Chloe R.", body: "Hoodie fits perfectly and the colour is lovely.", createdAt: daysAgo(4), id: "rv-7", listingId: "campus-hoodie", rating: 5, sellerId: "kamo-threads" },
  { author: "Avery T.", body: "Tutor explained stats better than the lecture did.", createdAt: daysAgo(7), id: "rv-8", listingId: "maths-tutoring", rating: 5, sellerId: "aiden-tutors" },
  { author: "Zinhle K.", body: "Meal was fine, a little late.", createdAt: daysAgo(5), id: "rv-9", listingId: "zinger-meal", rating: 3, sellerId: "kfc" },
];
