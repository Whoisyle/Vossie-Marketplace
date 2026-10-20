import type { CategoryId, Listing, Review } from "../types";

import { daysAgo } from "./time";

const NAMES = ["Thabo N.", "Lerato M.", "Aiden P.", "Naledi M.", "Sipho V.", "Chloe R.", "Avery T.", "Zinhle K.", "Kamo D.", "Palesa S.", "Mpho L.", "Jason W.", "Anele B.", "Tumi G."];

/** What students say, by category, in two tones: a keen five and a mostly-happy four. */
const SAY: Record<CategoryId, { five: string[]; four: string[] }> = {
  food: {
    five: ["Fresh, hot and exactly what I ordered. Will be back.", "Ready when I got there and the portion was generous.", "Best thing I have eaten on campus this term."],
    four: ["Really good, just a short wait at lunch hour.", "Tasty and good value. Would love a bigger size option."],
  },
  books: {
    five: ["Pages are clean and it is the right edition for my module.", "Exactly as described, and the seller met me at the library.", "Saved me a lot compared to the new price."],
    four: ["Good condition, a few pencil notes but nothing that matters.", "Right edition, quick hand-over on campus."],
  },
  electronics: {
    five: ["Works perfectly and the seller showed me it running first.", "Tested in front of me, charger included. No problems so far.", "Great value and the seller was quick to reply."],
    four: ["Works well, a couple of light scratches as described.", "Good deal. Hand-over took a day to arrange but all fine."],
  },
  fashion: {
    five: ["Fits true to size and looks even better in person.", "Washed, pressed and exactly as pictured. Love it.", "Quality is great for the price. Got compliments already."],
    four: ["Nice piece, slightly bigger than I expected.", "Good condition and easy to collect on campus."],
  },
  services: {
    five: ["Clear, patient and on time. Booked again for next week.", "Sorted my problem in one session. Highly recommend.", "Friendly and professional, and worth every rand."],
    four: ["Really helpful session, I just wanted a bit more time.", "Good service and easy to book."],
  },
};

function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length]!;
}

/** A few believable reviews for every listing that has none of its own, so no product page opens empty. */
export function stockReviews(listings: Listing[], existing: Review[]): Review[] {
  const have = new Set(existing.map((review) => review.listingId));
  const out: Review[] = [];
  listings.forEach((listing, index) => {
    if (have.has(listing.id)) return;
    const say = SAY[listing.categoryId];
    const count = 2 + (index % 2);
    for (let n = 0; n < count; n += 1) {
      const seed = index * 7 + n * 3;
      const five = n === 0 || listing.rating >= 4.7;
      out.push({
        author: pick(NAMES, seed),
        body: pick(five ? say.five : say.four, seed + n),
        createdAt: daysAgo(2 + n * 5 + (index % 4)),
        id: `rvs-${listing.id}-${n}`,
        listingId: listing.id,
        rating: five ? 5 : 4,
        sellerId: listing.sellerId,
      });
    }
  });
  return out;
}
