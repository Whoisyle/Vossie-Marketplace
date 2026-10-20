import type { CategoryId } from "../types";

/** The long-form facts a listing page shows below the photos. */
export type ProductDetail = {
  /** The description, in short paragraphs. */
  about: string[];
  /** What makes it worth buying, one line each. */
  highlights: string[];
  /** Label and value rows: size, condition, what is in the box, and so on. */
  specs: [string, string][];
};

const food = (about: string[], highlights: string[], specs: [string, string][]): ProductDetail => ({ about, highlights, specs });

/** Details for every product the demo sells, keyed by the product's id. */
export const DETAILS: Record<string, ProductDetail> = {
  "almond-croissant": food(
    ["A proper butter croissant, baked every morning and filled with almond frangipane, then finished with flaked almonds and a light dusting of icing sugar.", "Best eaten warm. Collect before your first lecture, or pair it with a flat white from the same counter."],
    ["Baked fresh every morning", "Real butter, no margarine", "Crisp outside, soft inside", "Goes well with any coffee on the menu"],
    [["Contains", "Gluten, milk, egg, almonds"], ["Serves", "1 person"], ["Baked", "Daily before 07:00"], ["Best before", "Same day"], ["Collect from", "Main entrance counter"]],
  ),
  "bomber-jacket": food(
    ["A thrifted satin bomber with a ribbed collar, cuffs and hem, and a full zip. Soft inner lining, two side pockets and one inside pocket for your student card.", "Every jacket is washed and checked before it is listed, so what you see in the photos is what you get."],
    ["Pre-loved, washed and pressed", "Full zip with two side pockets", "Unisex relaxed fit", "Swap or return within 7 days"],
    [["Condition", "Very good, no marks"], ["Size", "M (fits 38 to 40 chest)"], ["Material", "Satin shell, polyester lining"], ["Colour", "Olive green"], ["Care", "Cold wash, hang dry"]],
  ),
  "burger-chips": food(
    ["Two flame-grilled beef patties with melted cheddar, crisp lettuce, tomato and our house sauce, stacked on a toasted brioche bun. Comes with a generous portion of salted chips.", "Pick your size when you order. Orders are made fresh, so there is a short wait at peak lunch hour."],
    ["Flame-grilled, made to order", "Toasted brioche bun", "Hand-cut chips on the side", "Extra sauce on request"],
    [["Contains", "Gluten, milk, egg, sesame"], ["Serves", "1 person"], ["Prep time", "10 to 15 minutes"], ["Halal", "Yes"], ["Collect from", "Food court, counter 2"]],
  ),
  "campus-hoodie": food(
    ["A heavyweight fleece hoodie in the Vossie campus green, soft on the inside and built for early lectures and cold library mornings. Kangaroo pocket, adjustable hood and ribbed cuffs.", "Sold new with tags. Sizes run true; if you are between two, take the bigger one."],
    ["Brushed fleece inside", "Adjustable drawcord hood", "Embroidered campus crest", "Machine washable"],
    [["Condition", "New with tags"], ["Sizes", "S, M, L, XL"], ["Material", "80% cotton, 20% polyester"], ["Colour", "Campus green"], ["Care", "Cold wash, tumble low"]],
  ),
  "casio-calculator": food(
    ["The scientific calculator most Eduvos maths, stats and engineering modules ask for. Natural textbook display, 270 functions, solar plus battery power and a hard slide-on case.", "Tested by the seller and cleared of any stored data, so it is ready for your first test."],
    ["Allowed in most campus exams", "Natural textbook display", "Solar and battery powered", "Hard case included"],
    [["Condition", "Very good, tested"], ["Functions", "270"], ["Power", "Solar and AAA battery"], ["Includes", "Hard case, quick-start card"], ["Warranty", "7-day swap on campus"]],
  ),
  "chicken-wrap": food(
    ["Grilled peri-peri chicken with crunchy slaw, sliced tomato and garlic mayo, rolled tight in a toasted tortilla. Filling enough to carry you through a double lecture.", "Ask for the mild sauce if you do not like heat. Add a side of chips at the counter."],
    ["Grilled, never fried", "Mild or hot sauce", "Toasted to order", "Ready in minutes"],
    [["Contains", "Gluten, egg, milk"], ["Serves", "1 person"], ["Prep time", "10 minutes"], ["Halal", "Yes"], ["Collect from", "Student centre, first floor"]],
  ),
  "choc-strawberries": food(
    ["Fresh strawberries dipped by hand in smooth milk chocolate, then drizzled with white chocolate or rolled in crushed nuts. A box of twelve, packed to travel.", "Made to order the day before, so please order early for exam-week treats, birthdays and gifts."],
    ["Hand-dipped to order", "Box of 12, gift ready", "Add a personal message", "Kept chilled until collection"],
    [["Contains", "Milk, nuts, soy"], ["Serves", "2 to 4 people"], ["Order ahead", "24 hours"], ["Keep", "Fridge, eat within 2 days"], ["Collect from", "Res block C"]],
  ),
  "denim-jacket": food(
    ["A classic mid-wash denim jacket, softened by wear and still in great shape. Button front, chest pockets and a slightly cropped cut that sits well over a hoodie.", "Thrifted and upcycled: the buttons were replaced with brass ones and the cuffs were reinforced."],
    ["One of a kind", "Reinforced cuffs, new buttons", "Cropped, relaxed fit", "Washed and ready to wear"],
    [["Condition", "Good, light fading"], ["Size", "S to L, see options"], ["Material", "100% cotton denim"], ["Colour", "Mid blue"], ["Care", "Cold wash inside out"]],
  ),
  "desk-planner": food(
    ["A weekly desk planner with a tear-off page for every week, a monthly overview and a to-do column. It lies flat, so it fits beside a laptop.", "Plan assignments, tests and shifts in one place. The thick paper takes a gel pen without bleeding."],
    ["52 tear-off weekly pages", "Lies flat on a desk", "Thick paper, no bleed", "Non-slip base"],
    [["Size", "A4"], ["Pages", "52 weeks plus notes"], ["Colour", "White and coral"], ["Condition", "New"], ["Includes", "Sticky tabs, 1 pen"]],
  ),
  "eng-maths": food(
    ["Advanced Engineering Mathematics, the set text for second-year engineering and IT maths. Clean pages with light pencil notes in the first chapters only.", "Worked examples throughout and a full solutions section at the back."],
    ["Current prescribed edition", "No missing or torn pages", "Solutions section included", "Light pencil notes only"],
    [["Condition", "Good"], ["Edition", "10th"], ["Pages", "1,200"], ["Language", "English"], ["Swap", "Welcome, ask the seller"]],
  ),
  "flat-white": food(
    ["A double shot of our house blend with silky steamed milk, poured with latte art. Smooth, strong and not bitter, which is the point.", "Swap to oat or almond milk for a small extra. Bring your own cup and take a discount off."],
    ["Double shot as standard", "Oat and almond milk available", "Bring your own cup, save R3", "Made by a trained barista"],
    [["Contains", "Milk (or plant milk)"], ["Size", "250 ml"], ["Caffeine", "About 130 mg"], ["Prep time", "3 minutes"], ["Collect from", "Main entrance counter"]],
  ),
  "green-folders": food(
    ["A pack of ten sturdy ring-binder folders with pockets and index tabs, so every module gets its own home and nothing gets lost in your bag.", "Colour-coded in green so they stay easy to spot on a crowded desk."],
    ["Ten folders in the pack", "Pockets and index tabs", "Hard-wearing covers", "Fit A4 paper"],
    [["Pack", "10 folders"], ["Size", "A4"], ["Colour", "Green"], ["Condition", "New"], ["Includes", "Index tab set"]],
  ),
  headphones: food(
    ["Over-ear wireless headphones with soft padded cups and up to 30 hours of battery. Fold flat for your bag, and the built-in microphone works for lectures on Teams.", "Tested end to end by the seller before listing. Comes with the cable and a pouch."],
    ["30-hour battery", "Folds flat, soft cups", "Built-in microphone", "Cable and pouch included"],
    [["Condition", "Very good, tested"], ["Connection", "Bluetooth 5.0 or cable"], ["Battery", "Up to 30 hours"], ["Colour", "Black and tan"], ["Warranty", "7-day swap on campus"]],
  ),
  highlighters: food(
    ["A set of six pastel highlighters with a chisel tip for wide strokes and a fine edge for underlining. The ink is quick-drying and does not show through the page.", "Sold as a set, in a pouch that fits a pencil case."],
    ["Six pastel colours", "Dry fast, no smudge", "Chisel tip, two line widths", "Does not bleed through"],
    [["Pack", "6 highlighters"], ["Colours", "Yellow, pink, blue, green, orange, lilac"], ["Condition", "New"], ["Ink", "Water based"], ["Includes", "Zip pouch"]],
  ),
  "iced-latte": food(
    ["Two shots of espresso over ice and cold milk, sweetened lightly and served in a tall cup. Cold, smooth and made for the walk between lectures.", "Add vanilla, caramel or hazelnut syrup for a small extra."],
    ["Double shot", "Light sweetness", "Syrups available", "Lasts the whole lecture"],
    [["Contains", "Milk"], ["Size", "400 ml"], ["Caffeine", "About 130 mg"], ["Prep time", "3 minutes"], ["Collect from", "Main entrance counter"]],
  ),
  "kota-special": food(
    ["The Gauteng classic: a quarter loaf hollowed out and stuffed with chips, polony, cheese, egg and atchar, with a spicy sauce on top. Big enough to share, but you will not want to.", "Choose your heat level when you order."],
    ["A full quarter loaf", "Chips, egg, cheese and atchar", "Mild, medium or hot", "Made fresh, wrapped to go"],
    [["Contains", "Gluten, egg, milk, mustard"], ["Serves", "1 to 2 people"], ["Prep time", "12 minutes"], ["Halal", "Yes"], ["Collect from", "Canteen window"]],
  ),
  "laptop-repair": food(
    ["Slow laptop, cracked screen or a keyboard that has given up? Bring it to the IT lab and get a written quote in the same visit. Most repairs are done in two days.", "Done by a third-year IT student with a technician's tool kit. You only pay if the repair works."],
    ["Quote before any work", "Most repairs in 2 days", "Screens, keyboards, batteries, cleaning", "Pay only if it works"],
    [["Service", "Laptop repair and clean-up"], ["Turnaround", "2 days on average"], ["Where", "IT lab 2"], ["Bring", "Laptop and charger"], ["Guarantee", "14 days on the repair"]],
  ),
  "maths-tutoring": food(
    ["One hour of one-on-one maths tutoring with a final-year student who has been through the same modules. We start from where you are stuck and work through past papers together.", "Sessions run at the study centre or online, whichever suits you."],
    ["One-on-one, one hour", "Past paper practice", "Study centre or online", "Notes sent after the session"],
    [["Service", "Maths tutoring"], ["Length", "60 minutes"], ["Format", "In person or online"], ["Modules", "Calculus, algebra, discrete maths"], ["Booking", "Choose a time on the next screen"]],
  ),
  "matcha-avo": food(
    ["Thick seeded toast topped with smashed avocado, a drizzle of olive oil, chilli flakes and a squeeze of lemon, with an iced matcha on the side. Fresh, filling and easy on the budget.", "Vegan on request: just ask for no egg."],
    ["Seeded sourdough toast", "Iced matcha included", "Vegetarian, vegan on request", "Made fresh to order"],
    [["Contains", "Gluten, sesame"], ["Serves", "1 person"], ["Prep time", "8 minutes"], ["Diet", "Vegetarian"], ["Collect from", "Student centre, ground floor"]],
  ),
  "mint-laptop": food(
    ["A 14-inch laptop in mint green, tested and cleaned, with a fresh operating system install, charger and a padded sleeve. Light enough for campus and fast enough for your coursework.", "Battery health and storage are shown in the details, so there are no surprises."],
    ["Fresh install, ready to use", "Charger and sleeve included", "Battery health checked", "7-day swap on campus"],
    [["Condition", "Very good"], ["Screen", "14 inch Full HD"], ["Memory and storage", "8 GB, 256 GB SSD"], ["Battery", "About 6 hours"], ["Includes", "Charger, padded sleeve"]],
  ),
  "planner-notebooks": food(
    ["A set of three spiral notebooks with dotted pages, a pen loop and a pocket at the back. Take notes, sketch diagrams or keep a bullet journal in the same book.", "The paper is thick enough for fountain pens and highlighters."],
    ["Three notebooks in the set", "Dotted pages", "Pen loop and back pocket", "Thick paper"],
    [["Pack", "3 notebooks"], ["Size", "A5"], ["Pages", "120 each"], ["Condition", "New"], ["Colours", "Mixed pastels"]],
  ),
  "poke-bowl": food(
    ["Sushi rice topped with marinated salmon, edamame, cucumber, carrot, avocado and sesame, with a soy and ginger dressing. Fresh, light and high in protein.", "Swap the salmon for tofu if you prefer."],
    ["Fresh salmon or tofu", "High in protein", "Light dressing", "Made in front of you"],
    [["Contains", "Fish, soy, sesame"], ["Serves", "1 person"], ["Prep time", "8 minutes"], ["Diet", "Pescatarian, tofu option vegan"], ["Collect from", "Student centre, ground floor"]],
  ),
  printing: food(
    ["Colour or black and white printing, copying and scanning at the study centre, with same-day pickup. Send the file, collect the pages, and hand your assignment in on time.", "Binding and lamination are available for projects and posters."],
    ["Same-day pickup", "Colour and black and white", "Binding and lamination", "Send files from your phone"],
    [["Service", "Printing and copying"], ["Paper", "A4 and A3"], ["Turnaround", "Same day"], ["Where", "Study centre"], ["Price", "From the amount shown per page"]],
  ),
  "stats-tutoring": food(
    ["One hour of statistics tutoring: probability, distributions, hypothesis tests and regression, explained with the examples from your own module. Bring your past papers and your questions.", "Sessions can be booked for a group of up to three students at the same price."],
    ["One-on-one or small group", "Past papers and worked examples", "Study centre or online", "Notes sent after the session"],
    [["Service", "Statistics tutoring"], ["Length", "60 minutes"], ["Format", "In person or online"], ["Topics", "Probability, tests, regression"], ["Booking", "Choose a time on the next screen"]],
  ),
  "study-room": food(
    ["A quiet bookable room with a large table, whiteboard, power points and Wi-Fi, for a group of up to six. Book an hour before a presentation or the whole afternoon before an exam.", "Water and a printer are on the same floor."],
    ["Seats up to six", "Whiteboard and power points", "Quiet floor, strong Wi-Fi", "Book by the hour"],
    [["Service", "Study room booking"], ["Seats", "Up to 6"], ["Includes", "Whiteboard, power, Wi-Fi"], ["Where", "Level 2, west wing"], ["Cancel", "Free up to 2 hours before"]],
  ),
  "tablet-desk": food(
    ["A 10-inch tablet with a clear screen, stylus support and a folding case that doubles as a stand. Good for reading slides, taking handwritten notes and watching recorded lectures.", "Factory reset, tested and cleaned before every sale."],
    ["Stylus support", "Folding case and stand", "Factory reset and tested", "Charger included"],
    [["Condition", "Very good"], ["Screen", "10.2 inch"], ["Storage", "64 GB"], ["Battery", "About 9 hours"], ["Includes", "Charger, folding case"]],
  ),
  "textbook-econ": food(
    ["Principles of Economics, the prescribed text for first-year economics and business modules. Clean, with the chapter summaries highlighted in yellow only.", "Saves you a good part of the new price, and you can sell it on at the end of the year."],
    ["Current prescribed edition", "Chapter summaries highlighted", "No missing pages", "Resell at the end of the year"],
    [["Condition", "Good"], ["Edition", "9th"], ["Pages", "800"], ["Language", "English"], ["Swap", "Welcome, ask the seller"]],
  ),
  "textbook-prog": food(
    ["A programming fundamentals textbook that covers variables, control flow, functions, objects and data structures with worked examples and exercises at the end of each chapter.", "Ideal for first- and second-year programming modules."],
    ["Worked examples in every chapter", "Exercises with answers", "No highlights or notes", "Spine and cover in good shape"],
    [["Condition", "Very good"], ["Edition", "5th"], ["Pages", "950"], ["Language", "English"], ["Swap", "Welcome, ask the seller"]],
  ),
  "tote-bag": food(
    ["A sturdy canvas tote with an inside zip pocket and long shoulder straps. Big enough for a laptop, a textbook and your lunch, and it washes like new.", "Hand-printed with the campus crest in small batches."],
    ["Thick canvas, double stitched", "Inside zip pocket", "Fits a 15-inch laptop", "Machine washable"],
    [["Condition", "New"], ["Size", "38 x 42 cm"], ["Material", "100% cotton canvas"], ["Colour", "Natural"], ["Care", "Cold wash"]],
  ),
  "usb-hub": food(
    ["A seven-in-one USB-C hub that adds HDMI, two USB-A ports, an SD and microSD slot, ethernet and power passthrough to a laptop that has too few ports.", "Plug it in and it works. No drivers needed."],
    ["HDMI, USB-A, SD and ethernet", "100 W power passthrough", "No drivers needed", "Aluminium case runs cool"],
    [["Condition", "New"], ["Ports", "7 in 1"], ["Video", "HDMI 4K at 30 Hz"], ["Power", "Up to 100 W passthrough"], ["Warranty", "7-day swap on campus"]],
  ),
  "veg-bowl": food(
    ["Roasted sweet potato, chickpeas, fresh greens, shredded carrot and pickled onion over brown rice, finished with a lemon and tahini dressing. Filling without being heavy.", "Add grilled chicken for a small extra."],
    ["Vegan as standard", "High in fibre", "Add chicken if you like", "Made fresh daily"],
    [["Contains", "Sesame"], ["Serves", "1 person"], ["Prep time", "6 minutes"], ["Diet", "Vegan, gluten free"], ["Collect from", "Student centre, ground floor"]],
  ),
  "zinger-meal": food(
    ["A crispy zinger fillet with lettuce and mayo in a toasted bun, with regular chips and a cold drink. The student meal deal, ready for collection on campus.", "Choose your drink when you check out."],
    ["Burger, chips and a drink", "Student price", "Collect on campus", "Ready in 10 minutes"],
    [["Contains", "Gluten, egg, milk, soy"], ["Serves", "1 person"], ["Prep time", "10 minutes"], ["Halal", "Yes"], ["Collect from", "Walk-in counter"]],
  ),
};

/** What a listing with no entry above (a seller's own product, say) shows: its own words and the general terms of its category. */
const GENERAL: Record<CategoryId, { highlights: string[]; specs: [string, string][] }> = {
  fashion: { highlights: ["Pre-checked before listing", "Meet on campus to try on", "Swap within 7 days"], specs: [["Meet-up", "On campus"], ["Returns", "Swap within 7 days"]] },
  food: { highlights: ["Made fresh to order", "Collect on campus", "Tell the seller about allergies"], specs: [["Collect", "On campus"], ["Allergies", "Ask the seller before ordering"]] },
  services: { highlights: ["Booked through Vossie", "Pay when the booking is confirmed", "Cancel up to 2 hours before"], specs: [["Booking", "Choose a time on the next screen"], ["Cancel", "Free up to 2 hours before"]] },
  books: { highlights: ["Checked by the seller", "Collect on campus", "Swap within 7 days"], specs: [["Meet-up", "On campus"], ["Returns", "Swap within 7 days"]] },
  electronics: { highlights: ["Tested by the seller", "Collect on campus", "7-day swap"], specs: [["Meet-up", "On campus"], ["Warranty", "7-day swap on campus"]] },
};

/** The details to show for a listing: its own entry, or its description plus the category's general terms. */
export function detailFor(id: string, description: string, categoryId: CategoryId): ProductDetail {
  const base = DETAILS[id.split("#")[0]!];
  if (base) return base;
  const general = GENERAL[categoryId] ?? GENERAL.books;
  return { about: [description], highlights: general.highlights, specs: general.specs };
}
