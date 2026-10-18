# Motion and interaction plan

- Status: **Plan agreed with the owner on 2026-10-18; no motion work built yet**
- Method: flow order, one screen at a time, owner reviews each on the iPhone (Expo Go) before the next
- References go in the owner's folder `C:\Users\PABAL\OneDrive\Desktop\Vossie Design Inspiration` (see `design/inspiration/README.md`). Pinterest links cannot be opened by tooling, so the image or video itself is needed.

## Rules for all motion

- Animate with Reanimated on the UI thread. Springs and eased curves only; no linear motion except loops that are meant to be constant.
- Respect Reduce Motion everywhere: replace movement with a short crossfade (existing intro behaviour).
- Keep 44 pt touch targets. Motion never delays input.
- Soft haptics on taps, likes and success; never on every scroll tick.
- Colours stay on brand. New accents are used as tints and highlights, never as large solid fills.

## Palette additions (owner, 2026-10-18)

| Token | Hex | Use |
| --- | --- | --- |
| `mist` | `#b7c4cc` | light blue-grey: bubbles, glass pill, skeletons, soft borders |
| `ink` | `#1f2f39` | dark navy: text on light, ink reveal, deep surfaces |
| `ink-deep` | `#1e2a38` | deeper navy: shadows, reel overlay, neomorphic dark edge |

(`#1e2a38` was confirmed as the third colour; it is nearly identical to `#1f2f39`, so it is used as the deeper step of the same navy.) Existing brand teal `#376371` and primary `#35505C` stay the main action colours.

## Decisions

| Area | Decision |
| --- | --- |
| Intro dot | Keep the five hops across V, O, S, S, I but make them springier: physics-style arcs, soft squash and stretch on landing, a small letter nudge on each touch-down. |
| Intro to Welcome | Replace the warp with a **liquid ink reveal**: the landed dot swells into a navy circle that floods the screen and then drains away to reveal Welcome. |
| Welcome | Unchanged. |
| Sign-in bubbles | Slow soft drift at varied sizes and speeds in the new tints, **react to touch** (lean toward the finger, ripple on focus, soft burst on Next) and **tilt parallax** with phone motion. |
| OTP | Add a real code-entry step after the email (the database already issues 6-digit email codes). Animated digit boxes, success and error states, resend timer. Owner will supply the reference GIF. |
| Profile setup | Introduce the new colours as accents only. Animate the campus card (picker opens as a spring sheet; selected campus animates into the card). |
| Navbar | Floating iOS-style bar with a **sliding glass pill** behind the active tab, spring icon bounce, label fade. Slowly slides away on scroll down (swipe up) and slowly returns on scroll up. |
| Reels | Navbar hidden; **swipe from the bottom edge** brings it back. New reels icon (owner to supply the file). Double tap likes with a heart burst. Overlay shows store name, campus and a short description. |
| Home | Search bar gets a **filters button** (price range, minimum rating, open now). Listing tabs become a swipeable carousel left and right while the page still scrolls up and down. Promo banners, quick recents, personalised greeting and profile touches from existing data. |
| Explore | Featured carousel with the same swipe behaviour, a "top stores near you" row, promo banners. |
| Product page | Tappable star rating opens a review page (1 to 5 stars and a short note). **Only buyers with a completed order for that item can submit** (matches the database). Everyone else sees ratings and reviews. |
| Storefront | Tap a store to see all its listings, promos, specials, menus and services. |
| Promo banners | **Placeholders for now.** Later, sellers create promos from a template; Vossie staff create campus-wide banners. Needs new tables and approval rules when built. |
| Icons and surfaces | Simple clean icon animations. Neomorphic depth where it helps (cards, buttons, pill), restrained. |
| Checkout and receipts | Animated pay button states (idle, processing, success, failure), animated receipt, and receipts and order updates sent by email. |
| Email | Supabase built-in email for now (owner decision, to be changed later). It is rate-limited and by default only delivers to project team addresses, so it is for testing; the receipt email also needs an Edge Function and the provider swap later. |

## Final answers (2026-10-18, after the reference folder arrived)

References in the owner's folder: a property app (floating bar, dark filter button, swipeable cards, nearby list), a parcel delivery app (dark greeting header, tracking cards with a progress line, live map with dashed route and courier card with call and chat, QR box-scan screen, round centre button), a notes app (black and white curved cut-outs), the **reels icon** (black rounded square with white vertical bars) and a 5 second **transition video**: a navy circle swells over the screen and inverts the colours with small dots on top. This confirms the liquid ink reveal.

| Question | Answer |
| --- | --- |
| Navbar style | **Light frosted glass** with the sliding glass highlight (owner chose this over the dark pill and the centre button). |
| Maps | **All four**: live order tracking (courier, dashed route, ETA, call and chat), store and pickup locations, delivery address picker, and the courier's own navigation view. |
| Payments (mock-ups with proper brand icons) | **All**: Visa and Mastercard (credit and debit), Apple Pay and Google Pay, Vossie Wallet, instant EFT with South African banks. Real Apple Pay and Google Pay need a payment provider and a development build, so they stay mock. EFT is not yet a payment method in the database; it needs one more enum value when it goes live. |
| Seller and courier apps | **Tomorrow (19 Oct).** Not part of this pass. |
| Reels icon | The black rounded square with white vertical bars. Redrawn as a clean animated icon (bars bounce when active). |
| Scope of this pass | Maps data and live tracking; connect screens to the real backend; the missing buyer screens (notifications, saved items, saved addresses with a map pin, payment methods and cards list, order tracking, receipt). The polish layer (skeletons, offline states, onboarding tour, dark mode) is deferred. |

Notes: connecting screens to the real backend needs the new schema on a Supabase project. Until the owner approves applying it, screens keep working on the demo store behind the `backendEnabled` switch. Live courier position needs a new table and the iPhone location permission.

## Feature additions (owner, 2026-10-18, after review of the first intro build)

Main action colour is **slate #35505C with a soft gradient** (Welcome button, Continue, Pay Now, Add to Cart). Bubbles use matching teal, navy and mist gradients and drift a little quicker and shorter than the first version.

| Feature | Decision | Backend or package it needs |
| --- | --- | --- |
| Courier rating and tip | Yes: 1-5 stars and tip chips (R5, R10, R20, custom) after delivery | tips table and ledger posting to the courier payable; courier rating |
| Face ID / Touch ID | Yes, before payments and wallet actions, with passcode fallback | `expo-local-authentication` (client) |
| Referral codes | Yes: both get wallet credit after the friend's first order | referrals table, wallet credit rule |
| Loyalty points | Yes: earn on orders, redeem as wallet credit, progress ring | points ledger |
| My vouchers wallet | Yes: vouchers and promo codes with expiry, one-tap apply | user vouchers table |
| Order for later | Yes: time slot picker at checkout | `scheduled_for` on seller orders, seller prep reminders |
| Subtle sounds | Yes (off in silent mode and in settings) | `expo-audio` and short sound files |
| Onboarding tour | Yes: 3 animated cards after first sign-in | none |
| Skeleton loading and offline states | Yes | read-only cache |
| Dark mode | **No** (owner decision) | none |
| Safe meet-up spots, share order tracking, verified seller badges, report and block everywhere | All yes | meet-up points table, tracking share token, badge rules |
| Trending on campus, smart suggestions as you type, back in stock and price drop alerts, reorder in one tap | All yes | trending view, alerts table and notifications |

These are additions to the backend; they are not in the current schema. Each gets a migration and tests when its phase starts.

## Phases (owner chose four, reviewing on the iPhone after each)

1. Intro, Welcome, sign-in, **OTP**, profile setup, **floating navbar**, Home (filters, carousel, banners, recents, personalised greeting).
2. Explore, Reels, product page, storefront, reviews, search.
3. Cart, checkout, cards and payment mock-ups, animated receipts and email, maps and live tracking, delivery address picker.
4. The extra features above (tips, biometrics, referrals, loyalty, vouchers wallet, scheduling, safety, discovery, sounds, tour, skeletons and offline).

Seller and courier apps are a separate pass (19 Oct).

## New packages (approved)

`react-native-gesture-handler`, `expo-haptics`, `expo-linear-gradient`, `expo-blur`, `expo-sensors`. All run in Expo Go.

## Build order

1. **Motion kit**: palette tokens, spring presets, reduce-motion helper, haptics helper, shared animated pieces (pressable, sheet, skeleton).
2. Intro dot and ink-reveal transition.
3. Sign-in bubbles, then the OTP step.
4. Profile setup and animated campus card.
5. Floating navbar with hide-on-scroll and the glass pill.
6. Home: filters, swipeable listing tabs, banners, recents, greeting.
7. Explore: featured carousel, top stores.
8. Reels: hidden navbar, bottom-edge reveal, double-tap like, new icon, overlay.
9. Product page: star rating and review page. Storefront page.
10. Checkout and pay button, animated receipt, email receipt.

Each step ends with lint, types, tests, a check in Chrome, and the owner's check on the iPhone before it is committed.

## Still needed from the owner

- The reels icon file, the intro transition video and the OTP GIF (into `design/inspiration/`).
- Any further inspiration per screen (name files by screen).
- Review rules are decided; storefront "menus" and "specials" wording can be refined when we reach that screen.
