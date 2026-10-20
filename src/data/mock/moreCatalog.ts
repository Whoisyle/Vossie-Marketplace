import type { Listing, Seller } from "../types";

/**
 * Extra mock stores and listings so carousels, rows and filters have enough to show. All demo content: the
 * real catalogue will come from sellers. Pictures are our own drawings (components/art).
 */


export const moreSellers: Seller[] = [
  { id: "roast-republic", name: "Roast Republic", campusId: "potchefstroom", location: "Library entrance", bio: "Slow-roasted coffee beans, flat whites and pastries.", rating: 4.7, ratingCount: 176, followers: 860 },
  { id: "wrap-lab", name: "The Wrap Lab", campusId: "potchefstroom", location: "Student centre, first floor", bio: "Build-your-own wraps and bowls, ready in ten minutes.", rating: 4.6, ratingCount: 143, followers: 710 },
  { id: "paper-trail", name: "Paper Trail Stationery", campusId: "potchefstroom", location: "Res block A", bio: "Notebooks, planners and desk gear for exam season.", rating: 4.8, ratingCount: 52, followers: 301 },
];

type Seed = {
  id: string;
  title: string;
  categoryId: Listing["categoryId"];
  sellerId: string;
  priceCents: number;
  rating: number;
  ratingCount: number;
  description: string;
  images: number[];
  location: string;
  openHours?: string;
  pickupTime?: string;
  popular?: boolean;
  createdDaysAgo?: number;
  options?: Listing["options"];
};

function make(seed: Seed): Listing {
  return {
    campusId: "potchefstroom",
    createdDaysAgo: 4,
    openHours: "08:00 – 17:00",
    options: [],
    pickupTime: "10–20 min",
    popular: false,
    ...seed,
  };
}

export const moreListings: Listing[] = [
  make({ id: "flat-white", title: "Flat White", categoryId: "food", sellerId: "roast-republic", priceCents: 3200, rating: 4.7, ratingCount: 176, description: "Velvety double ristretto with micro-foam.", images: [], location: "Library entrance", pickupTime: "5–10 min", popular: true, createdDaysAgo: 1, options: [{ id: "reg", label: "Regular", priceCents: 3200 }, { id: "lrg", label: "Large", priceCents: 3900 }] }),
  make({ id: "almond-croissant", title: "Almond Croissant", categoryId: "food", sellerId: "roast-republic", priceCents: 2800, rating: 4.6, ratingCount: 88, description: "Baked fresh every morning, filled with almond cream.", images: [], location: "Library entrance", pickupTime: "5 min", openHours: "07:00 – 15:00" }),
  make({ id: "chicken-wrap", title: "Grilled Chicken Wrap", categoryId: "food", sellerId: "wrap-lab", priceCents: 5500, rating: 4.6, ratingCount: 143, description: "Peri-peri chicken, slaw and garlic mayo in a toasted wrap.", images: [], location: "Student centre", popular: true, createdDaysAgo: 2, openHours: "09:00 – 19:00" }),
  make({ id: "poke-bowl", title: "Salmon Poke Bowl", categoryId: "food", sellerId: "wrap-lab", priceCents: 8900, rating: 4.5, ratingCount: 61, description: "Sushi rice, salmon, edamame, avo and sesame dressing.", images: [], location: "Student centre", openHours: "09:00 – 19:00" }),
  make({ id: "veg-bowl", title: "Roasted Veg Power Bowl", categoryId: "food", sellerId: "varsity-cafe", priceCents: 6800, rating: 4.4, ratingCount: 47, description: "Roasted veg, quinoa, hummus and tahini.", images: [], location: "Student centre", openHours: "08:00 – 16:00" }),
  make({ id: "textbook-econ", title: "Economics 101 Textbook", categoryId: "books", sellerId: "thabos-books", priceCents: 24000, rating: 4.7, ratingCount: 19, description: "Latest edition, light highlighting, no torn pages.", images: [], location: "Library entrance", pickupTime: "Same day", openHours: "09:00 – 16:00", createdDaysAgo: 5 }),
  make({ id: "textbook-prog", title: "Intro to Programming (Python)", categoryId: "books", sellerId: "thabos-books", priceCents: 19500, rating: 4.8, ratingCount: 26, description: "Covers the full first-year module. Margin notes included.", images: [], location: "Library entrance", pickupTime: "Same day", openHours: "09:00 – 16:00", popular: true, createdDaysAgo: 3 }),
  make({ id: "desk-planner", title: "Weekly Desk Planner", categoryId: "books", sellerId: "paper-trail", priceCents: 9500, rating: 4.9, ratingCount: 52, description: "A4 undated planner with habit tracker and exam countdown.", images: [], location: "Res block A", pickupTime: "Same day", openHours: "10:00 – 18:00", popular: true, createdDaysAgo: 2 }),
  make({ id: "highlighters", title: "Pastel Highlighter Set (6)", categoryId: "books", sellerId: "paper-trail", priceCents: 4500, rating: 4.8, ratingCount: 70, description: "Chisel tip, quick-dry, no bleed-through.", images: [], location: "Res block A", pickupTime: "Same day", openHours: "10:00 – 18:00" }),
  make({ id: "usb-hub", title: "USB-C Hub (7-in-1)", categoryId: "electronics", sellerId: "techswap", priceCents: 38000, rating: 4.5, ratingCount: 33, description: "HDMI, SD, USB-A and 100W pass-through. Tested and boxed.", images: [], location: "IT lab 2", pickupTime: "Same day", openHours: "09:00 – 16:00" }),
  make({ id: "headphones", title: "Wireless Study Headphones", categoryId: "electronics", sellerId: "techswap", priceCents: 69000, rating: 4.6, ratingCount: 27, description: "Noise cancelling, 30 hour battery. Barely used.", images: [], location: "IT lab 2", pickupTime: "Same day", openHours: "09:00 – 16:00", popular: true, createdDaysAgo: 6 }),
  make({ id: "bomber-jacket", title: "Retro Bomber Jacket", categoryId: "fashion", sellerId: "kamo-threads", priceCents: 42000, rating: 4.7, ratingCount: 22, description: "Upcycled olive bomber with embroidered back panel.", images: [], location: "Campus courtyard", pickupTime: "Tomorrow", openHours: "Mon – Sat", createdDaysAgo: 3, options: [{ id: "s", label: "S", priceCents: 42000 }, { id: "m", label: "M", priceCents: 42000 }, { id: "l", label: "L", priceCents: 42000 }] }),
  make({ id: "tote-bag", title: "Canvas Tote Bag", categoryId: "fashion", sellerId: "kamo-threads", priceCents: 12000, rating: 4.6, ratingCount: 40, description: "Heavy canvas tote, hand-printed. Fits a 15 inch laptop.", images: [], location: "Campus courtyard", pickupTime: "Tomorrow", openHours: "Mon – Sat" }),
  make({ id: "stats-tutoring", title: "Statistics Tutoring (1 hour)", categoryId: "services", sellerId: "aiden-tutors", priceCents: 15000, rating: 5.0, ratingCount: 21, description: "Exam-focused sessions with worked past papers.", images: [], location: "Study centre or online", pickupTime: "Book a slot", openHours: "10:00 – 20:00", popular: true }),
  make({ id: "printing", title: "Print and Bind (50 pages)", categoryId: "services", sellerId: "paper-trail", priceCents: 7500, rating: 4.7, ratingCount: 58, description: "Colour or black and white, spiral bound, ready in an hour.", images: [], location: "Res block A", pickupTime: "1 hour", openHours: "10:00 – 18:00" }),
];
