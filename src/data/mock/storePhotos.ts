import type { ImageSourcePropType } from "react-native";

import { PRODUCT_PHOTOS } from "@/components/art/photos";

/**
 * A picture and a banner for every demo store, taken from the stock photos of what the store sells.
 * The logo is a close-up of its best seller; the banner is a wider shot of something else it offers.
 */
const STORE_PHOTO_KEYS: Record<string, { banner: string; logo: string }> = {
  "aiden-tutors": { banner: "stats-tutoring#2", logo: "maths-tutoring" },
  campusbites: { banner: "chicken-wrap#2", logo: "burger-chips" },
  kfc: { banner: "zinger-meal#2", logo: "zinger-meal" },
  "kamo-threads": { banner: "bomber-jacket#2", logo: "denim-jacket" },
  "paper-trail": { banner: "highlighters#2", logo: "desk-planner" },
  "plato-coffee": { banner: "iced-latte#2", logo: "flat-white" },
  "pretoria-eats": { banner: "poke-bowl#2", logo: "kota-special" },
  "roast-republic": { banner: "flat-white#2", logo: "iced-latte" },
  "study-space": { banner: "study-room#2", logo: "study-room" },
  "sweet-tooth": { banner: "almond-croissant#2", logo: "choc-strawberries" },
  "wrap-lab": { banner: "chicken-wrap#3", logo: "chicken-wrap" },
  techswap: { banner: "tablet-desk", logo: "mint-laptop" },
  "thabos-books": { banner: "textbook-prog#2", logo: "textbook-econ" },
  "varsity-cafe": { banner: "matcha-avo#2", logo: "veg-bowl" },
};

export function storeLogo(sellerId: string): ImageSourcePropType | undefined {
  const key = STORE_PHOTO_KEYS[sellerId]?.logo;
  return key ? PRODUCT_PHOTOS[key] : undefined;
}

export function storeBanner(sellerId: string): ImageSourcePropType | undefined {
  const key = STORE_PHOTO_KEYS[sellerId]?.banner;
  return key ? PRODUCT_PHOTOS[key] : undefined;
}
