# Demo behaviour that must become real

Everything below works in the app today only as a demo. Nothing here is connected to a real provider, so none of it may be described to users as live. Work through this list before release. Keep it up to date: add a line when something new is built as a demo, tick it off when it is real.

Last updated: 2026-10-20.

## Backend and accounts

- [ ] **Hosted Supabase project has the OLD schema.** The new migrations in `supabase/migrations/` are written and tested (PGlite) but not applied. Owner runs `supabase/scripts/apply-hosted.cjs` with the database password (it deletes the old tables). Then deploy Edge Functions, set secrets, enable the auth hook.
- [ ] **Sign-in is a demo.** Any email signs in without a password. Real sign-in is an email one-time code through Supabase Auth (`EXPO_PUBLIC_USE_BACKEND=true`), which needs email sending set up in the Supabase project. Eduvos single sign-on is not available yet.
- [ ] **Student number record is mock** (`src/data/studentRecord.ts`). Real value must come from Eduvos.
- [ ] **Screens run on the in-memory demo store.** Wire each screen to `src/services` (buyer side not wired yet).

## Money

- [ ] **No payment provider.** Card, Apple Pay, Google Pay, Instant EFT and the wallet top-up are all mock flows. A payment provider is not chosen. Apple Pay and Google Pay also need a development build and merchant setup.
- [ ] **Withdrawals and payouts do not move money.** Needs the provider's payout API and bank-account verification.
- [ ] **Vouchers, points, subscriptions and tips are demo rules** held in the app; the database versions exist but are not applied.

## Seller mode (added 2026-10-20)

- [ ] **Seller verification is automatic.** Documents move Pending, In review, Verified on a timer. Real review is by Vossie Operations: documents upload to Supabase Storage and staff approve in the staff app / Supabase dashboard. The staff app does not exist yet.
- [ ] **Document uploads are not stored.** Needs the storage bucket, signed upload URLs and a virus/size check.
- [ ] **Seller identity checks (ID, proof of address, CIPC registration) are not verified** by anything.
- [ ] **Seller orders come from the demo loop**: a buyer's order on the same device appears in the seller's Orders. Real orders arrive through `seller_orders` with realtime updates.
- [ ] **Order alerts are local.** Real alerts need push notifications (Expo push plus a server trigger).
- [ ] **Seller Earnings and the weekly chart are computed from demo orders.** Real numbers come from the money ledger.
- [ ] **Handoff code check** runs against a demo code. Real check is `seller_complete_handoff`.
- [ ] **Seller messages** use the demo conversations; real ones use `messaging` services and realtime.

## Courier, delivery and maps

- [ ] **Couriers and live tracking are simulated.** No real courier app or positions yet; the courier app is not built.
- [ ] **Courier phone numbers are placeholders**; the Call button dials only when a courier has a number.
- [ ] **Campus security and clinic numbers** (`campus_contacts`) need real numbers from the owner.
- [ ] **Delivery fees, hubs and third-party carriers** are demo values.

## Content and compliance

- [ ] **Product art and banner photos are stand-ins.** Listings use our drawings; banners use stock photos (see `docs/product/photo-credits.md`). Replace with seller photos.
- [ ] **Legal documents** (terms, privacy) need the registered business details.
- [ ] **Bank and card artwork** is drawn from owner references; official brand artwork must replace it before release.
- [ ] **Biometrics** (Face ID) is the device's own check; two-factor setup is a demo.
- [ ] **Safety reports and emergency features** are not routed to anyone.
