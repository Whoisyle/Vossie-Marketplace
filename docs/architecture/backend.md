# Backend: Supabase schema, security and services

- Status: **Implemented and tested locally; not applied to any Supabase project**
- Design source: `plan.md` sections 5 to 10 (the project owner's latest decisions)
- Code: `supabase/migrations/`, `supabase/functions/`, `src/services/`
- Tests: `npm run test:db` (database), `npm test` (service contracts)

This replaces the "discovery only" draft in [marketplace-mvp-backend-contracts.md](marketplace-mvp-backend-contracts.md) for everything it covered. The old unordered SQL files are kept in `supabase/legacy/` for reference only and must not be applied.

## Conflict recorded

`docs/product/marketplace-mvp.md` (2026-10-14) describes off-app payment and defers couriers. `plan.md` (2026-10-12 interview, listed as the highest authority) describes in-app payment, seller acceptance, courier delivery, disputes and payouts. The schema follows `plan.md` because the owner asked for the seller and courier sides to share one model. If the owner wants the narrower MVP, the same tables work with the wallet-only payment path and delivery switched off; nothing needs removing.

## Who can do what

| Role | How they get it | Can |
| --- | --- | --- |
| Buyer | every signed-in user | browse, cart, order, pay, message, confirm, report |
| Seller / provider | submits a profile, staff approve | list goods and services, accept orders, hand over, request payouts |
| Courier | invitation only | claim jobs, record pickup and drop-off with codes, report exceptions |
| Support / operations | invitation | review sellers and listings, resolve cases, assign couriers |
| Finance | invitation (admin to activate fee policy) | payouts, fee policy, reconciliation, ledger read |
| Admin | invitation | invite staff, change memberships, audit log |

No one can grant themselves a role. `memberships`, `profiles.student_status` and every money table reject direct writes; clients only call the functions below.

## Schema map

| Area | Tables |
| --- | --- |
| Identity | `profiles`, `profile_private` (student number, owner only), `identity_links`, `student_eligibility`, `memberships`, `staff_invitations`, `audit_events` (append-only), `account_deletion_requests`, `app_settings` |
| Catalogue | `campuses`, `categories`, `category_attributes`, `sellers`, `listings`, `listing_options` (price and stock), `listing_media`, `service_slots`, `listing_policy_checks`, `policy_terms`, `listing_flags`, `moderation_cases`, `favourites`, `follows`, `reviews`, `reels` (+ likes, comments) |
| Commerce | `cart_items`, `addresses`, `vouchers`, `orders` (buyer level), `seller_orders` (one per seller, own state), `order_items` (price snapshots), `bookings`, `order_events` |
| Delivery | `courier_profiles`, `delivery_jobs`, `packages`, `handoff_challenges` (hashed codes), `custody_events` (append-only), `delivery_exceptions`, `carrier_bookings` |
| Money | `wallets`, `wallet_transactions`, `payment_methods` (tokens only), `payment_intents`, `payment_events`, `provider_webhook_events`, `ledger_accounts`, `ledger_journals`, `ledger_entries` (append-only, balanced), `fee_policies`, `refunds`, `payout_destinations`, `payouts`, `reconciliation_runs` |
| Communication | `conversations`, `conversation_participants`, `messages`, `user_blocks`, `message_reports`, `notifications`, `push_tokens`, `cases`, `case_notes`, `analytics_events` |

Views: `listing_cards`, `profile_cards`, `courier_job_pool` (no buyer address), `delivery_courier_cards`.

## The order lifecycle (one source of truth for buyer, seller and courier)

```
cart_add -> place_order (prices, fees, stock and slot holds set by the database)
  wallet:   paid immediately          card / Apple Pay / Google Pay: pending_payment until the provider webhook
-> seller_order: awaiting_seller (24 h to accept; timeout = full refund)
-> seller_respond(accept)  -> accepted -> preparing -> ready
     campus handoff:  buyer reveals a code, seller enters it           -> issue_window
     Vossie delivery: courier claims job, seller reveals pickup code,
                      courier enters it (picked up), buyer reveals drop-off code, courier enters it -> issue_window
-> 48 h issue window: buyer_confirm_received, or open_order_issue (freezes funds) , or time passes
-> settle: escrow -> seller payable, platform fee, courier payable, delivery revenue
-> request_payout -> finance approves and marks paid
```

Disputes (`open_order_issue`) put the seller order in `disputed` with funds held; `staff_resolve_case` refunds fully, partially, releases, or denies. Services follow the same path with a booking in place of the delivery.

## Security model

- Row level security is on for every table. Clients can `select` only what a policy allows and cannot insert, update or delete except their own addresses.
- Every state change is a `security definer` function that checks `auth.uid()`, the caller's role and campus scope, and the current state. Functions pin `search_path`.
- Cross-table policy checks use definer helpers so policies cannot recurse.
- Prices, fees, stock, discounts and payment results are never taken from the client. `place_order` reads them from the database inside one transaction; `order_items` snapshots cannot be edited.
- Handoff codes are random 6 digit values stored as salted SHA-256 hashes. A participant reveals a fresh code (which voids the old one); the courier or seller submits it. Five wrong tries lock it. Wrong tries return data instead of raising so they are counted.
- The ledger is double entry. A deferred constraint trigger rejects any journal that does not balance, and entries cannot be updated or deleted. Wallet balance always equals its ledger account (tested).
- Trusted-only functions (`apply_payment_event`, `save_payment_method`, `attach_provider_reference`, `settle_provider_refund`, `expire_stale`) are callable by the service role only. Payment webhooks verify an HMAC signature first and are idempotent per provider event.
- The demo student number is readable only by its owner (staff cannot read it) and is wiped by `private.purge_deleted_accounts()` 30 days after a deletion request.
- No card numbers, CVV, bank logins or provider secrets are stored; only provider tokens and last four digits.

## Scheduled work

`public.expire_stale()` (every minute) expires unpaid orders and releases their holds, times out unanswered seller orders with a refund, and settles orders whose issue window has closed. `private.purge_deleted_accounts()` runs daily. Both are scheduled with `pg_cron` when it exists; on a project without it, call `expire_stale` from a scheduled Edge Function using the service role.

## Edge Functions (`supabase/functions/`)

| Function | Purpose | Auth |
| --- | --- | --- |
| `payments-create` | start the provider side of a card or wallet-less payment | user JWT |
| `payments-webhook` | verify and apply provider events and refunds | HMAC signature |
| `payments-mock-capture` | development only: lets a buyer pay their own mock intent | user JWT, off unless `ALLOW_MOCK_PAYMENTS=true` |
| `notify-dispatch` | push through Expo; email when a provider is configured | shared secret header |

Secrets (set in Supabase, never in the app): `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET_<PROVIDER>`, `ALLOW_MOCK_PAYMENTS` (never true in production), `NOTIFY_DISPATCH_SECRET`, `EMAIL_PROVIDER`.

## Phase 4 additions (`20261019000100_phase4_features.sql`)

Ratings and tips (`rate_courier`, tip from the wallet into `courier_payable`), Vossie Points (`points_ledger`, awarded when a seller order completes, `redeem_points`), referrals (`my_referral_code`, `apply_referral_code`, reward on the friend's first paid order), the voucher wallet (`user_vouchers`, `my_vouchers`, `grant_voucher` for trusted code), order for later (`seller_orders.scheduled_for`, `schedule_seller_order`, `send_prep_reminders` for a scheduled job), meet-up spots, shared tracking links (`create_tracking_share`, `shared_tracking` shows status only), price and stock alerts (`toggle_alert` plus triggers on `listing_options`), `is_verified_seller` and `reorder_to_cart`. Block and report already existed (`user_blocks`, `message_reports`). Tests: `supabase/tests/phase4.test.mjs`.

Differences between the demo app and the database to settle with the owner: the app awards points when an order is marked delivered, the database when it completes after the issue window; the app takes a tip from the order's payment method, the database only from the wallet until the payment provider is live; hub-to-hub and third-party delivery are app-only so far (the database still has `campus_handoff` and `vossie_delivery`, plus carrier bookings); the welcome points and the demo vouchers exist only in the app.

## What is deliberately not built (external gates and open decisions)

| Item | Why |
| --- | --- |
| Real payment provider | not chosen; capability proof pending. Only the `mock` adapter exists. Wallet payments are fully in the database. |
| Eduvos Entra sign-in | needs Eduvos issuer, tenant and claims. Sign-in is demo email OTP; `student_status` stays `demo_unverified`. |
| Carrier adapters (PAXI, Courier Guy, Aramex) | `carrier_bookings` exists; no adapter until contracts clear. |
| 24 h paid waitlist when no fulfilment exists | financial sequence not approved (plan.md 6.6). |
| Subscriber benefit (R4 off) | subscriptions are deferred; the demo screen still shows it. |
| Real fee percentage | seeded as a 0% placeholder policy; finance sets the real one with `finance_set_fee_policy`. |
| Campus hubs and cross-campus transfers | requires a v1 scope decision. |
| Real money top-ups | `demo_top_up` is controlled by `app_settings.wallet_demo_topups`; turn it off before real money flows. |
| Email delivery | provider undecided; `notifications.email_required` marks what must be emailed. |

## Behaviour choices worth reviewing

- Delivery fee is charged per seller order (each seller needs its own courier trip). The demo UI shows one fee.
- Vouchers are funded by Vossie: the seller is paid in full and the discount is booked to `promotions_expense`; refunds return only what the buyer paid.
- Stock is held when the order is placed, committed when the seller accepts, and returned on any cancellation.
- Services need a slot; quantity is always 1; cancellation is free before the listing's cut-off.
- A reported issue after delivery freezes the whole seller order, not a single item.

## Running it

Local (needs Docker): `npx supabase start`, then `npx supabase db reset` applies migrations and `seed.sql`.

Without Docker, the schema is tested in an in-memory Postgres: `npm run test:db` boots it, applies every migration, loads the seed, and runs about 30 scenarios (checkout, delivery, disputes, payouts, RLS attacks).

To regenerate the demo data from the app's mock catalogue: `node supabase/scripts/generate-seed.mjs`.

### Applying to the existing hosted project

The project in `scripts/test-live-connection.cjs` already has the old `complete_schema.sql` applied (12 campuses, 5 categories, no listings). The new migrations assume an empty `public` schema, so applying them there means removing the old tables first. That is destructive and needs the owner's explicit approval and the database password; nothing was applied during this build. Steps once approved:

1. Back up (dashboard, Database, Backups).
2. In the SQL editor drop the legacy tables (or reset `public`), because the old tables use the same names with different shapes.
3. `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. Set the function secrets above and deploy: `npx supabase functions deploy`.
5. Enable the `before_user_created` hook in Auth settings (pointing at `public.hook_before_user_created`) and the 6-digit email OTP template.
6. Load `seed.sql` only on a non-production project.
