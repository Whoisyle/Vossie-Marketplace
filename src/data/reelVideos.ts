/** Free stock clips (Mixkit licence) the demo reels play. A seller's own picked video wins over these. */
const CLIPS = {
  food: require("../../assets/reels/food.mp4") as number,
  laptop: require("../../assets/reels/laptop.mp4") as number,
  sweets: require("../../assets/reels/sweets.mp4") as number,
  books: require("../../assets/reels/books.mp4") as number,
  calculator: require("../../assets/reels/calculator.mp4") as number,
  fashion: require("../../assets/reels/fashion.mp4") as number,
  headphones: require("../../assets/reels/headphones.mp4") as number,
};

const ORDER = [CLIPS.fashion, CLIPS.headphones, CLIPS.books, CLIPS.calculator, CLIPS.laptop, CLIPS.food];

/** The clip a reel plays: the seller's own video if there is one, else a stock clip that fits what it is about. */
export function reelVideoFor(reel: { id: string; caption: string; listingId?: string; videoUri?: string }): string | number {
  if (reel.videoUri) return reel.videoUri;
  const about = `${reel.listingId ?? ""} ${reel.caption}`.toLowerCase();
  if (/burger|chips|grill|wrap|kota|meal|bowl|coffee|latte|croissant|food|lunch/.test(about)) return CLIPS.food;
  if (/strawberr|matcha|choc|sweet|treat|cake/.test(about)) return CLIPS.sweets;
  if (/calc|ti-30|casio/.test(about)) return CLIPS.calculator;
  if (/book|textbook|pack|notes|study|planner/.test(about)) return CLIPS.books;
  if (/hood|jacket|tote|shirt|wear|fashion|bag/.test(about)) return CLIPS.fashion;
  if (/headphone|earbud|audio/.test(about)) return CLIPS.headphones;
  if (/laptop|tablet|tech|hub|usb|lamp|repair/.test(about)) return CLIPS.laptop;
  const hash = [...reel.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return ORDER[hash % ORDER.length]!;
}
