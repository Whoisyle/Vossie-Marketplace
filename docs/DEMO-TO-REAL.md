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
- [ ] **Seller messages** use the demo conversations; real ones use `messaging` services and realtime. The thread page is the buyer's look.
- [ ] **Demo orders arrive on a timer** while a seller is in seller mode (`SellerDemoEffects`, 40, 110 and 200 seconds). Remove once real students order.
- [ ] **Listing photos:** seller listings use our drawings; real photo upload is not built, and the database will not publish a listing without a photo. Deleting a listing is local only (no archive function).
- [ ] **Seller payouts and bank details:** the saved bank keeps the last four digits only and nothing is verified with the bank.
- [ ] **Platform fee on sales** is a demo 5% (`PLATFORM_FEE_PERCENT` in `src/seller/state.ts`), shown on the order and taken from earnings on the phone only. The real fee policy is an open decision and must be taken by the database when an order completes.
- [ ] **The seller screens' live path** (Supabase) is written and tested against mocks and the database tests, but has never run against the hosted project, because the migrations are not applied. First run needs a real sign-in (email one-time code), a staff account to approve documents, and a listing photo.
- [ ] **Courier handover (seller side)** is a demo: a courier "Tebogo K." takes a ready delivery 5 seconds later (`SellerDemoEffects`), the four digit handover code is made on the phone, and confirming pays the seller straight away. Real: a courier job, a code checked on the server, and payment only after delivery. The buyer is told it is on its way, but there is no courier app yet.
- [ ] **Seller Promotions, Reviews, Returns and disputes, Team members and notification setting** live on the phone only (no tables yet). Real needs promotions with redeemable codes at checkout, buyer reviews and replies, refunds that move money, team invites by email with a packer role, and saved settings. Analytics conversion (4.2%) is a fixed demo figure.
- [ ] **Stock steppers and Archive** call the same listing save as Restock in live mode; the database has no archived state, so Archive pauses the listing there. Product photos (up to 6) and variants stay on the phone until upload and options are built.
- [ ] **Store preview Share** only shows a message; there is no public store page or link.
- [ ] **Operating times** (presets, lecture timetable, closures, pickup slots, queue-when-closed) live on the phone. The database holds one open range for all days (`opens_at`, `closes_at`, `open_days`), so per-day hours, lectures and closures need new columns or a table. Buyers do not yet see Open or Closed, hours or "Back on", checkout does not offer the pickup slots, and orders that arrive while closed are queued only in the seller's own list.
- [ ] **Transactions, receipts and statements** are built from the demo ledger. Share sends plain text (or copies it on the web); a signed PDF receipt, reference numbers from the server and real monthly statements need the money ledger.
- [ ] **Notification preferences** (push and email per kind, quiet hours, sound) are saved on the phone and do not yet change what is sent. Real push needs Expo push tokens and a server trigger; email needs a sender.
- [ ] **Security page** reuses the buyer's Face ID, two-factor and login-activity state. Sign-in email cannot be changed (Eduvos owns it). The list of signed-in devices is the demo list.
- [ ] **Account settings:** tax number is kept on the phone only; Download my data and Close seller account do nothing on a server.
- [ ] **Reels:** a seller's reels are kept on the phone. The picked video is not uploaded, the reels do not appear in the buyer's Reels tab, and views, likes, taps and sales driven are demo numbers that grow on a timer (`SellerDemoEffects`). Real reels need video storage, a feed, and event counts from buyers.
- [ ] **Seller plans:** Free, Seller Plus (R49) and Seller Pro (R99) are demo prices and limits (10 products on Free; 0, 5 and unlimited live reels; analytics tabs; fees 5%, 3% and 2%). Plans are bought with the buyer wallet through the existing subscription flow. The database has the Seller Plus plan row (migration `20261021000100_seller_plus_plan.sql`, not applied to the hosted project) but does not enforce the limits or the fee by plan.
- [ ] **Analytics conversion (4.2%)** is a fixed demo number, and product and reel analytics come from the demo orders and reels.
- [ ] **Store location and maps:** the place search and pin lookup use the public OpenStreetMap service (Nominatim), which has a fair-use limit and no promise of uptime. Production needs a geocoding provider with a key (or our own). The two campus hubs are real places, but the Eduvos pin is placed by the two streets Eduvos publishes (12 Esselen Street, cnr Steve Biko) and should be moved to the exact gate once the owner confirms it. The place is saved on the phone; the database still holds only a text location, so buyers' checkout and the buyer map do not use it yet. Order drop-offs on the map are found from the typed address and may be wrong or missing.
- [ ] **Store banner, product photos, support attachments and documents** are kept on the phone and not uploaded. The documents screen takes files from the photo library, the camera and (once `expo-document-picker` is installed) Files. "Scan a document" is the camera with a crop step, not automatic edge detection; real edge detection needs a development build with a scanning package.
- [ ] **Packages not installed yet:** `expo-document-picker` (the Files option) and `expo-video` (playing a picked reel video) could not be installed because npm refused the registry certificate on this PC (CERT_NOT_YET_VALID, a clock or certificate problem). The screens work without them: Files is hidden and reels show the product as a poster. After fixing the PC clock run `npx expo install expo-document-picker expo-video`.
- [ ] **Help and support:** requests are kept on the phone and Vossie support answers 7 seconds later by a demo timer. The email address and phone number on the page are placeholders. Real support needs a ticket table, staff replies, attachments in storage and notifications.
- [ ] **Promotions** can be edited with every option (type, value, what it covers, minimum spend, code or automatic, dates, limits) but are not applied at buyer checkout and usage counts do not rise.
- [ ] **Share store:** the web link (vossie.app/s/...) is a demo address. The QR code holds a Vossie app link (vossie://home/store/<id>) which opens the store in the app for anyone who has it.
- [ ] **Seller wallet:** the balance card, payout cards and transactions are the seller's earnings, shown like the buyer's wallet. Payout cards are the buyer's saved cards; paying out to a card or by instant EFT is a demo.

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
