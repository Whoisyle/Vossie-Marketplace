# Seller onboarding v2: plan (2026-11-17)

Status: **plan only, nothing in this file is built yet.** Written after the owner's brief and two rounds of questions. Build in the four stages below, shipping and reviewing each one before the next.

## The owner's brief, in order

1. The three seller welcome slides: two moving 3D branded boxes, with a branded notepad, meal boxes and latte cups as part of the animation. A big "bam" on the last slide, products jumping out of the boxes.
2. On Verify your account, when the student card is verified, show the actual student card.
3. On "How do buyers get their order?", let the seller choose more than one, or all, with properly coloured icons.
4. Upgrade the "You are verified" page; the slide button must be as big as the other main buttons.
5. After everything is verified, a short two-page contract slides up from the bottom. It names the seller (name, student number, email, ID number) and makes them accept responsibility for what they list and sell.
6. The colours on the branded boxes were wrong.

## Decisions already made by the owner

| Question | Answer |
| --- | --- |
| Colours for boxes, notepad, meal boxes, cups | App brand colours. Wordmark `#29475B` on pale grey packaging, with teal `#376371`, steel grey `#8B9DA6`, sage `#DFE2DC`, slate `#586879`, charcoal `#191B1D`. The earlier navy `#2A3490` was my mistake and goes. |
| Where the "bam" happens | Final slide, then tap: slides 1 and 2 build up, slide 3 bursts open, the Set up my shop button waits underneath. |
| Delivery choices | Campus courier, Collection from me, Hub to hub, Third-party courier. The seller can tick any or all. |
| Contract signing | Type full name **and** draw a signature **and** tick agree. The date is added automatically. |
| Contract timing | After approval, required. The seller cannot open the dashboard, list or sell until it is signed. |
| Contract details | Name, email, student number filled in from the account and Eduvos record, not editable. The seller types their ID number once, checked against the South African ID format. |
| Verified page | Bigger slide button, and a box-burst celebration. (Not chosen: showing the student card there, or leading straight into the contract from it. See open item 3.) |

## Stage 1: the boxes, products and motion

**Art (all drawn in code, brand colours only).** Two Vossie shipping boxes (closed and open, the angled blue-grey panels from the owner's photo). Products: a branded notepad, two meal boxes, two latte cups, each with the wordmark or the double-S mark. Assumed quantities: notepad x1, meal boxes x2, latte cups x2. One shared set of drawings so the welcome slides, the setup headers and the verified page all match.

**Motion, one timeline across the three slides (the products and boxes persist; they are not redrawn per slide):**

- Slide 1: the two boxes slide in from opposite sides, settle with a small bob and a soft floor shadow. Lids closed.
- Slide 2: the boxes turn toward each other (perspective tilt), lids rattle, a latte lid and a notepad corner peek out.
- Slide 3: sealed boxes shake and build tension, then **bam**: a white flash and a ring, lids fly open, the notepad, meal boxes and cups jump out on arcs with squash and stretch and then float and bob. The Set up my shop button pulses once.
- Moving between slides is driven by the progress bar, so tapping a bar segment or Skip plays the right pose.
- Haptic on the bam. Reduce Motion: show the final poses, no burst, simple cross-fade.

**Approach (decision needed, see open item 1).** Recommended: layered vector art with perspective transforms and parallax in the existing animation library. It runs everywhere, is light, and looks 3D enough. The alternative, true 3D (three.js with a GL view), looks more real but adds heavy dependencies and risk on low-end phones and on the web build.

Setup step headers (steps 1 to 3) get small still versions of the same boxes and products.

## Stage 2: the setup steps

- **Delivery multi-select.** Four cards with their own coloured icon tile: Campus courier (blue), Collection from me (green), Hub to hub (orange), Third-party courier (purple). Any combination, at least one required. Replaces the three-way courier/collection/both choice.
  - Data: `delivery` (one value) becomes `deliveryModes` (a list). Database: add `delivery_modes text[]`, copy from the old column (`both` becomes courier and collection), then retire `delivery_mode`. `save_seller_onboarding` takes the list. Old callers keep working during the change. Same careful approach as the earlier migrations: additive first.
  - The live store preview card and the store profile page show the chosen modes.
- **Real student card on Verify.** When the student card row is Verified, show the seller's actual student card there (the existing student card component: name, student number, campus, verified mark), on the row itself and in its preview.

## Stage 3: the "You are verified" page

- The slide-to-continue pill becomes the height and width of the main buttons (60 high, full width).
- The plain tick is replaced by the box-burst celebration from stage 1, smaller.
- Continues to the dashboard unless open item 3 changes that.

## Stage 4: the seller contract

**What the seller sees.** Once every document is accepted, a sheet slides up from the bottom like a push notification. It cannot be dismissed until signed. Two pages:

1. **Who you are.** Parties and details: store name, full name, student number, email, campus (all read-only), ID number (typed, validated), today's date (automatic).
2. **What you promise, and signature.** The promises, then: tick "I have read and agree", type full name and surname (must match the account name), draw a signature, Sign. Date and time added automatically by the server.

**Draft promises** (plain language; to be checked by a South African lawyer before launch, see open item 4):

- I will list and sell only items and services that I own, have in stock or can really provide.
- My descriptions, prices and photos will be true. I will not copy other people's photos or sell fakes.
- I will not sell anything illegal, stolen, counterfeit, unsafe, age-restricted or banned by Vossie.
- I am responsible for the food and goods I sell: safe, clean, correctly described, with allergens declared.
- I will keep to hand-over codes and Vossie's order, return and dispute rules, and will not take buyers off the app to avoid fees.
- I will not manipulate reviews, prices or stock.
- I understand Vossie may hold payouts during a dispute, and may suspend or remove my store for breaking these rules.
- I confirm my details and documents are true and mine, and I agree to Vossie using my details for verification (POPIA).
- I understand I am personally responsible for what I list and sell.

**Data and enforcement.**

- New table `seller_agreements`: seller, contract version, text hash, typed name, signature image (private storage, seller's own folder), student number, email, ID number (staff-only, masked in the app), signed time (server clock), device note. Seller can read their own; staff can read all; writes only through a function.
- Function `sign_seller_agreement`: checks the seller is approved, the typed name matches the account, the ID number passes the South African ID check, the signature file is in the seller's folder, the contract version is current. Records it once per version.
- Enforcement in the database, not just the screen: publishing a listing and accepting orders refuse with `agreement_required` until a current contract is signed. A new contract version means a re-sign.
- Operations Review tab later gets a "Signed contracts" list.

## Order, tests and checks

Each stage: typecheck, lint, tests, a browser walk-through (and a phone check by the owner), then commit, push and deploy, as usual. Database changes get their own tests and are applied to the hosted project only after the local tests pass and the target state is checked.

1. Stage 1 first because it is the most visible and everything else reuses the art.
2. Stage 2, then 3, then 4. Stage 4 is the largest because it touches the database and gates the dashboard.

## Open items (my default if you say nothing)

1. **3D approach.** Layered vector with perspective and parallax (recommended) or true 3D. Default: layered vector.
2. **Product counts.** Notepad x1, meal boxes x2, latte cups x2. Default: as stated.
3. **Verified page and the contract.** You asked for the contract "after approval, required" but did not tick leading into it from the verified page. Default: the verified page slides to the dashboard, and the contract sheet is the first thing on the dashboard until signed.
4. **Legal review.** The promises above are a plain-language draft, not legal advice. Get a South African lawyer to check it (consumer protection, food safety, privacy) before it is live.
5. **ID number privacy.** Default: stored for staff only and shown masked (last four digits) in the app. Say if you would rather not store the full number at all.
6. **A copy of the contract.** Default: the seller can view it again in Account. A PDF copy by email needs an email service, which is not set up yet.
