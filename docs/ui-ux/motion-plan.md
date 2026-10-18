# Motion and interaction plan

- Status: **Plan agreed with the owner on 2026-10-18; no motion work built yet**
- Method: flow order, one screen at a time, owner reviews each on the iPhone (Expo Go) before the next
- References go in `design/inspiration/` (see its README). Pinterest links cannot be opened by tooling, so the image or video itself is needed.

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
