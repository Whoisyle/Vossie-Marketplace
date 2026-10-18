# Marketplace MVP — backend contract draft

- Status: **Working draft — discovery only; no SQL or application implementation authorized by this document**
- Foundation: [ADR 0001](../decisions/0001-universal-expo-foundation.md) and [application foundation](application-foundation.md)
- Product scope: [Marketplace MVP](../product/marketplace-mvp.md)

This draft fits the approved Expo/Supabase foundation. It does not approve or apply migrations, configure a Supabase project, or authorize production use of incomplete policies.

## Confirmed technology boundary

- Client: Expo SDK 57, React Native, Expo Router, strict TypeScript, npm.
- Data/auth platform: Supabase (PostgreSQL, Auth, Storage, and Edge Functions where privileged or transactional server behavior is required).
- App code reaches Supabase through typed service interfaces/adapters. Add a client SDK dependency only with the implementation task that defines its use.
- Public client configuration may contain only public Supabase URL/anon key. Service-role keys, SMTP credentials, Entra credentials, payment secrets, and privileged operations remain in Supabase/server secret storage.
- Simple public reads and user-owned operations may use the authenticated Supabase client only where reviewed RLS safely expresses the contract. Multi-row state transitions, reservation/expiry, moderation, identity provisioning, and audit writes must be enforced transactionally in a database function/RPC or approved Edge Function—not trusted to client sequencing.
- Every endpoint/use case authenticates the caller, validates input, checks owner/role/campus scope, returns typed success/error outcomes, and records required audit events. Reservation and message-send operations need idempotency where retries could duplicate effects.

## Existing database foundation (not yet proven production-ready)

The repository currently has three SQL files under `supabase/migrations/`:

1. `001_identity_access.sql`: users, identity links, student eligibility, memberships, staff invitations, sessions, audit events, RLS policies, and updated-at triggers.
2. `002_marketplace.sql`: seller/provider profiles, categories/attributes, goods/service listings and media, inventory, service definitions/slots/holds, policy checks, flags, moderation cases, RLS, and updated-at triggers.
3. `003_money_ledger.sql`: payment intents/events, webhook events, ledger, fee policies, refunds, payout destinations/payouts, reconciliation, and RLS.

These migrations are source files, not evidence that the schema was applied to a target Supabase project or validated with integration tests. Their comments and policy names are not substitutes for threat modeling, RLS tests, migration replay, and independent database verification.

Important contract gaps for this MVP:

- No order/order-line lifecycle exists, despite `payment_intents.checkout_session_id` and `slot_holds.checkout_session_id` referencing checkout concepts.
- No order-specific messages, handoff-confirmation records, or goods reservation lifecycle is defined.
- No order handoff-issue reporting/staff-resolution lifecycle is defined.
- `slot_holds` exists, but it is described as a checkout hold and has no booking/provider-acceptance lifecycle; assess whether it can safely support the approved service-request contract.
- No service booking no-show/issue report lifecycle or staff-resolution record is defined.
- Existing payment/ledger schema is not an approved or usable payment integration. Online payments are deferred; no client flow may create/settle/reconcile a payment for this MVP.
- No typed client service adapters or Supabase package dependency are currently present.
- Demo OTP configuration, production Eduvos OIDC, SMTP/email delivery settings, campus catalog seed data, and authorized staff provisioning remain unspecified. The owner supplied campus display names and approved internal stable keys listed in the product draft; seed these mappings without substituting official Eduvos codes.

## Candidate service contracts

Names and data shapes below are proposals for Forge/Schema refinement; they are not approved public API paths or database object names.

| Service/use case | Proposed input/output responsibility | Enforcement |
|---|---|---|
| `DemoAuth.requestSignUpOtp(email, studentNumber)` | Normalize and validate demo input; store the student number in the user's protected private profile; request first-time email verification; never claim enrollment | Supabase Auth plus owner-private profile storage; demo string checks are not authorization; rate-limit; never log OTP or expose the student number |
| `DemoAuth.requestSignInOtp(email)` | Send a fresh one-time login code/link on each later sign-in | Supabase Auth; verified code/link required before session exists |
| `DemoAuth.verifyOtp(email, token)` | Exchange valid OTP for session; return safe profile/setup state | Supabase Auth; no `student_eligibility=active` from email/ID formatting |
| `Profile.getMine()` / `Profile.updateMine(patch)` | Read and update only permitted profile fields and preferred campus | Auth UID ownership + RLS; email is identity-controlled; enforce allowed campus IDs |
| `Campus.list()` | Return the owner-supplied campus directory with its approved stable key and display name for profile and listing filters | Seed/source ownership and read policy required; Vossie keys are not official Eduvos codes |
| `Marketplace.search(filters)` / `Marketplace.getListing(id)` | Paginated published goods/services, preferred-campus default, explicit campus/category/search filters | Public row/media visibility only for active approved content; no private seller fields |
| `Seller.submitProfile(input)` / `Seller.submitListing(input)` | Create/update own seller profile and goods listing; return moderation state | Owner RLS plus server validation; staff-only publication transition |
| `Provider.submitProfile(input)` / `Provider.submitService(input)` / `Provider.setAvailability(input)` | Create/update own provider profile, service, and time slots; return review state | Owner scope; validated future intervals/capacity; staff-only publication transition |
| `Moderation.review(target, decision, reason)` | Staff approves, rejects, or requests changes; returns audited state change | Trusted staff authorization + campus scope; atomic update and immutable audit event |
| `GoodsOrders.request(listingId, quantity, note)` | Create pending request and reserve inventory atomically; return request/expiry/availability | Auth buyer; published listing; not self-purchase unless approved; atomic stock check; idempotent |
| `GoodsOrders.respond(orderId, acceptOrReject)` | Seller accepts/rejects their own request; reject/expiry releases reserved stock | Seller ownership; valid state transition; idempotent and audited |
| `GoodsOrders.cancel(orderId)` / `GoodsOrders.requestCancellation(orderId)` / `GoodsOrders.respondToCancellation(requestId, decision)` | Buyer may cancel while pending; after seller acceptance either participant may request cancellation, but both must approve before it takes effect. An unanswered request expires after 24 hours and leaves the order active | Participant ownership; atomic reservation release only on approved cancellation; idempotent and audited |
| `ServiceBookings.request(serviceId, slotId, note)` | Create pending provider request and temporary slot hold atomically; return expiry | Auth buyer; available published slot; concurrency-safe capacity check |
| `ServiceBookings.respond(bookingId, acceptOrDecline)` | Provider accepts/declines their own request; decline/expiry releases the slot | Provider ownership; valid state transition; idempotent and audited |
| `ServiceBookings.cancel(bookingId)` / `ServiceBookings.requestReschedule(bookingId, proposedSlotId)` / `ServiceBookings.respondToReschedule(requestId, decision)` | Either participant may cancel an accepted booking before its scheduled start; a reschedule takes effect only after provider approval | Participant ownership; atomic current/proposed slot handling; idempotent; no off-app payment state changes |
| `ServiceBookings.reportNoShow(bookingId, details)` / `ServiceIssues.resolve(bookingId, outcome, reason)` | Either participant may report a no-show; staff review resolves the issue; no automatic completion | Participant-only report; separately authorized and audited staff resolution; outcome/evidence policy remains to be defined |
| `OrderMessages.list(orderId)` / `OrderMessages.send(orderId, body)` | Private participant-only order communication | Buyer/seller membership check on every operation; size/rate limits, report path, no public contact details |
| `Handoff.confirm(orderId)` / `Handoff.reportIssue(orderId, reason)` | Record buyer or seller confirmation, or report a problem; complete only after both confirmations and no unresolved issue | Participant-only atomic transition; immutable confirmation/audit events; reported issue freezes completion |
| `OrderIssues.resolve(orderId, outcome, reason)` | Authorized staff reviews a reported campus-handoff issue and records an audited outcome | Scoped staff authorization; only after review may the order transition; exact outcomes/evidence rules remain open |

If public HTTP routes are later required, design Edge Function request/response envelopes, stable error codes, authorization, and idempotency in a separate approved API specification. Do not expose service-role access to the app.

## Candidate state transitions (require product review)

These candidate transitions clarify what must be specified before writing migrations; product owners must approve unresolved exact states and terminal outcomes:

- Goods request: `requested` → seller `accepted` or `rejected`; buyer may cancel while pending; unanswered order request → `expired`; after acceptance, cancellation requires both parties' approval; an unanswered cancellation request expires after 24 hours while the order remains active and stock remains reserved; accepted order → each party confirms handoff; `completed` only after both; either participant may report a handoff issue, which freezes completion pending staff review. Exact outcomes, evidence, and appeals remain open.
- Service request: `requested` → provider `accepted` or `declined`; unanswered request → `expired`; either participant may cancel an accepted booking before its start; reschedule requires provider approval; either participant may report a no-show, transitioning to a staff-reviewed issue state that cannot auto-complete; post-start cancellation, completion, evidence, resolution outcomes, and appeals remain open.
- Listing/profile/service: private `draft` → `pending_review` → staff `approved`/`rejected`/`changes_requested`; only approved active content is public. Re-review behavior after material edits requires a product decision.
- Inventory and service-slot holds: 24-hour expiration is an approved product rule for unanswered requests. Pending goods cancellation releases reserved stock; post-acceptance cancellation does so only after both parties approve. An unanswered post-acceptance cancellation request expires after 24 hours without releasing stock. A pre-start service cancellation releases the slot; an approved reschedule must atomically secure the proposed slot and release the old one. Implementation needs database-time expiry, concurrency guarantees, cleanup/recovery, and exactly-once release.

## Privacy and authorization invariants

- Supabase Auth email verification proves control of an email mailbox. `@vossie.net` and `eduv…` strings are demo input checks only and must never yield an institution-verified claim, active student eligibility, or privileged membership.
- Real student eligibility requires an Eduvos-approved Entra issuer/tenant and exact trusted claim/API contract. Never substitute suffix/domain-only checks for issuer, audience, signature, and enrollment validation.
- The owner approved storing the demo student number in the user's protected private profile. Retain it only while the account is active and delete it within 30 days of account deletion. Enforce owner-only access (plus explicitly approved privacy/support access), keep it out of public profile responses, listings, messages, logs, analytics, email subject lines, and authorization claims, and define access/export and correction behavior before implementation.
- Order messages are private to participants and authorized support staff only. Public listing reads must not include contact email/phone or identity evidence.
- Staff permissions must be explicitly provisioned, scoped, and audited. Client-provided role, status, campus, price, inventory, payment, or moderation values are never authoritative.
- No-show reports are visible only to the booking participants and authorized staff; only explicitly authorized staff can resolve them.
- Handoff-issue reports are visible only to order participants and authorized staff; only explicitly authorized staff can resolve them.
- Payment/ledger tables and policies require separate security/financial review before any future transaction milestone. The MVP must not imply Vossie holds funds.

## Required verification before implementation/production

- Confirm toolchain and migration history; verify local Supabase CLI availability without touching the remote project.
- Replay migrations in a disposable local Supabase/Postgres environment once the migration contract is reviewed; add tests for RLS across anonymous, buyer, seller/provider, and scoped staff roles.
- Test OTP email delivery and sign-in throttling using non-production test accounts and approved SMTP configuration.
- Concurrency tests: two buyers requesting the last unit/slot; simultaneous seller/provider accept/reject; pending and mutual post-acceptance cancellation; cancellation-request timeout retains stock and order; concurrent service cancellation/reschedule; repeated delivery/retry; hold expiry and release.
- Authorization tests: cross-user order/profile/message/student-number access denied; account deletion removes the student number within 30 days; unapproved listing/service invisible; no-show/handoff-issue reports are participant/staff-only; only authorized staff can resolve them; staff scope cannot exceed campus; demo identity cannot gain verified-student membership.
- Privacy/security review (including Aegis/Vault-equivalent) and Guardian review before merging or applying migrations.
- Never run migrations against production without explicit owner approval, backup/rollback plan, and a verified target.
