# Vossie Marketplace implementation plan

> Project ID: `vossie-marketplace`
> Plan status: working implementation baseline
> Created: 2026-10-12 (Africa/Johannesburg)
> Owner: project owner, coordinated by Atlas
> Current repository: `projects/Vossie-Marketplace-1/`
> Current implementation branch at planning time: `feature/jev-agent-layer`

## 1. Purpose

This plan converts the 2026-10-12 product interview, the current repository decisions, and the recoverable Vossie document archive into an implementation sequence that can be executed one approved slice at a time with the Vossie agents.

It is a planning and reconciliation document. It does not claim that live Eduvos identity, payment, payout, carrier, mapping, messaging, or production infrastructure is already available. It also does not make the archived 177-screen atlas the final UI source. The project owner will provide the correct screens one by one during implementation.

The plan has four goals:

1. Preserve the decisions already made.
2. Expose conflicts instead of silently combining incompatible documents.
3. Sequence the work around complete, testable user journeys.
4. Give Atlas enough structure to create scoped agent tasks, handoffs, quality gates, and release evidence.

## 2. How to use this plan

For each implementation step:

1. Atlas selects the next unblocked work package.
2. Atlas confirms its canonical references and unresolved decisions.
3. If UI is involved, the project owner supplies or approves the exact screen reference for that step.
4. Atlas creates typed tasks in `project-state.json` using the repository handoff contract.
5. Specialists work only in their assigned scope.
6. Probe runs the required automated checks.
7. Guardian reviews the integrated work and must issue `PASS`.
8. Sentinel coordinates any required independent verification.
9. Scribe synchronizes the relevant product, architecture, decision, and operating documents.
10. Atlas marks the work commit-ready. Protected-branch merge and production release remain human decisions.

Do not start a later phase merely because its UI can be mocked. A phase is unblocked only when its business rules, authority boundaries, and external capability assumptions are explicit.

## 3. Source precedence

When two sources disagree, use this order:

1. The project owner's latest explicit decision, including the 2026-10-12 interview and later per-screen instructions.
2. Accepted repository decisions in `docs/decisions/`.
3. Approved repository product specifications in `docs/product/`.
4. Approved repository architecture in `docs/architecture/`.
5. The latest project-owner-approved screen or Figma reference for the screen being built.
6. Approved brand identity and UI/UX rules.
7. The archived implementation specification, 177-screen atlas, developer guides, backlog, and curated context pack.
8. Historical prototypes, images, pitch material, and older technology plans.

Conflict rule: stop the affected work, record the conflict, identify both sources, and obtain the project owner's decision. Do not silently select or merge contradictory behavior.

### 3.1 Source status labels

- `LOCKED`: explicitly decided in the latest interview or an accepted repository ADR.
- `APPROVED-SCREEN`: supplied or approved by the project owner for the current screen.
- `PROVISIONAL`: useful archived detail that still needs confirmation.
- `EXTERNAL-GATE`: depends on a provider, institution, legal, commercial, or operational approval.
- `DEFERRED`: intentionally outside v1.
- `HISTORICAL`: context only; it cannot override a newer decision.

## 4. Current project state

### 4.1 Completed foundation

- Expo SDK 57 managed workflow.
- React Native and React Native Web.
- Expo Router with routes under `src/app`.
- Strict TypeScript.
- npm with a committed lockfile.
- EAS delivery path for builds, updates, and web hosting.
- Product-neutral application shell and initial supplied screen work.
- Existing lint, typecheck, test, Expo Doctor, web export, and agent-system checks.
- Vossie agent roster, task contracts, handoff structure, Guardian gate, and independent verification roles.
- Jev routing/validation tooling. Automatic safety-hook enforcement remains disabled and must not be described as active.

### 4.2 Current blockers

- Product decisions from the interview have not yet been converted into canonical repository specifications and ADRs.
- Correct screen references will arrive one by one; the archived 177-screen atlas is an inventory and behavior reference only.
- Eduvos SSO/federation access is not confirmed.
- A production payment and payout provider has not been selected or capability-tested.
- PAXI, The Courier Guy, and Aramex contracts, API access, coverage, rate limits, and commercial terms are not confirmed.
- Final commercial policy, prohibited-item policy, service cancellation cutoff, retention periods, and campus operating coverage are open.
- The older archive contains decisions that conflict with the latest interview and current Expo ADR. Section 8 records the required resolutions.

## 5. Product baseline

### 5.1 Product statement

Vossie is a verified campus-commerce platform for Eduvos students. It connects student buyers and sellers of goods and services with payment, fulfillment, delivery, support, and Vossie operations. The broader product vision also contains campus hubs, transfers, incubation, buyer requests, and social commerce, but v1 is organized around completing reliable transactions.

### 5.2 V1 outcome

`LOCKED`: A release is valuable only when a verified student can complete an end-to-end journey:

`sign in -> discover -> select goods or a service -> pay -> seller/provider accepts -> fulfill -> confirm delivery/service -> dispute if necessary -> seller payout eligibility -> operational reconciliation`

The release includes the staff workflows required to operate that journey. A collection of disconnected screens does not satisfy v1.

### 5.3 Launch users and roles

| Role | Launch access | Main capability |
| --- | --- | --- |
| Buyer | Verified Eduvos student | Browse, buy goods, book services, pay, track, chat, confirm, dispute |
| Seller / service provider | Verified Eduvos student with seller activation | Publish, manage availability, accept orders, fulfill, view earnings |
| Vossie courier | Invited and role-assigned Vossie account | Receive assigned jobs, record pickup and handoff proof, report exceptions |
| Operations staff | Invited and role-assigned Vossie account | Moderate, support, reconcile, resolve disputes, manage couriers and policies |
| Finance staff | Separately granted privileged role | Refund, payout, reconciliation, financial exception handling |
| Admin / security | Separately granted privileged role | Memberships, policy, access, audit, security response |

`LOCKED`: Students do not self-select staff or courier privileges at launch. Privileged accounts are invited and assigned. Student courier self-activation from older documents is a possible later model and is not a v1 assumption.

### 5.4 Launch geography and scale

- `LOCKED`: All Eduvos campuses are in the intended launch service area.
- `LOCKED`: Design for low thousands of students and modest daily order volume, then measure and scale.
- `LOCKED`: No fixed launch date. Launch occurs after the end-to-end journey and external dependencies pass their acceptance gates.
- `LOCKED`: Operate as a lean pilot, keeping recurring costs low and adding paid capacity based on measured usage.
- `RISK`: “All campuses” is a product target, not proof of staff, courier, hub, or carrier coverage at every campus. A campus readiness matrix is required before launch.

### 5.5 V1 scope

#### Included

- Eduvos SSO before student marketplace access.
- Buyer, seller/service provider, invited courier, and staff role boundaries.
- Goods and services.
- Fixed-price goods.
- Defined service sessions with duration, location or remote mode, availability, and cancellation terms.
- Delivery-ready physical-goods listings.
- Automated completeness/policy checks plus staff review of reports and flags.
- Search/browse and listing/service detail.
- Cart containing goods and services, including multiple sellers.
- One buyer payment that produces separate seller orders and fulfillment state per seller.
- Temporary service-slot holds during checkout.
- In-app payment through an approved provider adapter.
- Seller acceptance and timeout handling.
- Campus handoff and door-to-door delivery choices.
- Vossie delivery plus eligible third-party carrier choices.
- Live or current checkout quote before payment.
- Native courier role mode for assigned deliveries.
- One-time pickup and delivery handoff codes with timestamped exception records.
- Buyer confirmation or dispute within 48 hours.
- Partial refund of an unavailable seller's order while unaffected seller orders continue.
- Seller payout eligibility after confirmed completion or expiry of the issue window, subject to dispute and finance guards.
- One disclosed transaction-fee percentage, configurable until approved.
- Order-linked in-app chat with report and block controls.
- Push and in-app notifications; email for critical receipts and financial events.
- Protected desktop-oriented web operations surface in the Expo application.
- Read-only offline cache for recent listings and order details.
- English, screen-reader support, readable contrast, large touch targets, and reduced motion.
- Product and operations analytics, including funnel, cohort, attribution, payment, delivery, and support signals.
- Development, staging, and production environments with separate data and credentials.

#### Deferred from v1

- Social feed, follows, Marketplace Reels, and personalized recommendations.
- Generic social-network behavior.
- Unapproved events, group orders, subscriptions, recurring services, rentals, and digital-entitlement extensions.
- Incubation workflows unless explicitly promoted into v1 by the project owner.
- Student self-service courier activation.
- Optional decorative 3D effects that are not required for the transaction journey.
- Any screen from the 177-screen archive that is not part of an approved v1 vertical slice.

#### Requires a v1 scope decision

- Buyer Requests and seller offer matching.
- Campus hub custody as a launch requirement versus a later operating expansion.
- Pooled cross-campus transfer routes versus third-party-only cross-campus fulfillment at first launch.
- Food, rental, and digital categories at launch.
- Public ratings and reviews.
- Seller timetable extraction.
- Automatic payout versus manual finance release during the pilot.

## 6. Locked journey rules from the interview

### 6.1 Access and identity

- Students see sign-in before marketplace content.
- Eduvos/Microsoft institutional sign-in is the target.
- Identifier format or email domain alone is not proof of identity.
- If Eduvos SSO is unavailable, the student launch is blocked. Staff testing may continue in a separate environment.
- Staff and couriers use invited accounts with assigned privileges.
- Authentication, student eligibility, and Vossie authorization are separate checks.
- Vossie must not collect or store Eduvos passwords or Authenticator secrets.

### 6.2 Listings

- Physical goods require title, category, price, condition, photos, campus, size or weight, and handoff availability.
- Service listings require description, price, duration, campus or remote mode, bookable availability, and cancellation terms.
- Broad legal categories are allowed only within Vossie's prohibited list and carrier-specific restrictions.
- Listing publication follows required-field and automated policy checks. Staff handle flagged listings and reports.
- Sellers use structured fields; the platform produces consistent buyer-facing cards and detail pages.

### 6.3 Cart and order split

- A cart may contain goods and services.
- The interview answer “2 and 3” is interpreted as multiple items from one seller and items from multiple sellers. This remains an explicit assumption until confirmed.
- One payment creates separate seller orders with independent acceptance, fulfillment, completion, refund, and dispute state.
- Failure by one seller does not cancel unaffected seller orders.

### 6.4 Goods order

1. Buyer selects an in-stock fixed-price item.
2. System validates listing, campus, quantity, price, seller status, and fulfillment eligibility.
3. Checkout shows eligible Vossie and third-party fulfillment choices and quoted prices.
4. Payment is authorized or collected through the provider flow selected by the approved funds model.
5. Seller has 24 hours to accept.
6. If the seller times out or cannot fulfill, that seller order and applicable delivery charge are refunded.
7. Pickup and delivery use one-time handoff codes and timestamped custody events.
8. Buyer confirms receipt or opens an issue within 48 hours.
9. If no issue is opened, payout can become eligible after the 48-hour window, subject to reconciliation and finance rules.

### 6.5 Service booking

1. Provider publishes defined slots.
2. Buyer selects a slot.
3. System creates a short temporary hold while payment completes.
4. Failed or timed-out payment releases the slot.
5. Provider performs the service and marks it complete.
6. Buyer confirms completion or opens a dispute.
7. The default policy is a full refund before a published cancellation cutoff.
8. Late cancellations and no-shows route to operations under the approved policy.

### 6.6 Fulfillment and coverage gaps

- Buyers choose campus handoff or door-to-door delivery at checkout.
- Intended third-party set: PAXI, The Courier Guy, and Aramex.
- Launch requires Vossie fulfillment and at least one working third-party option; the other named carriers may follow as contracts clear.
- A failed carrier quote or booking hides that option while leaving other valid methods available and explaining the unavailability.
- If no eligible method exists, the interview allows a paid waitlist order for at most 24 hours.
- While waiting and before pickup/carrier booking, the buyer may cancel for a full refund.
- The exact authorize/capture/refund sequence for the 24-hour waitlist must be approved before implementation; taking settled funds before fulfillment is known creates financial and trust risk.

### 6.7 Disputes and payouts

- Recipient handoff proof confirms delivery, not product satisfaction.
- Buyer issue window: 48 hours.
- Vossie operations makes the final dispute decision.
- Outcomes may include refund, partial refund, payout release, return, denial, or another recorded resolution.
- Seller funds stay unavailable while the relevant transaction is disputed.
- Courier earnings are evaluated independently when the delivery itself was valid and the courier did not cause the issue.
- No client action alone declares payment, refund, payout, custody, or delivery final.

## 7. Architecture baseline

### 7.1 Approved client foundation

- Expo SDK 57 managed workflow.
- React Native and React Native Web.
- Expo Router.
- Strict TypeScript.
- npm.
- Shared adaptive application for iOS, Android, and web.
- Mobile-first marketplace and courier experiences.
- Desktop-oriented operations layouts on web.
- EAS Build, EAS Update, and EAS Hosting paths.

### 7.2 Backend direction

`LOCKED`: Supabase is the initial backend platform, behind typed Vossie-owned service boundaries.

- PostgreSQL is the authoritative application data store.
- Supabase Auth or an identity adapter manages Vossie sessions after approved Eduvos federation.
- Edge Functions hold trusted transaction, webhook, reconciliation, and privileged workflow logic where suitable.
- Private Storage holds approved media and evidence with signed, scoped access.
- Realtime may accelerate updates but never replaces authoritative reads.
- Row Level Security and server authorization both apply where appropriate.
- Client code only receives public configuration. Service-role keys and provider secrets stay in trusted server boundaries.
- External providers are isolated behind adapters so identity, payment, logistics, maps, email, push, and analytics providers can change without rewriting domain rules.

### 7.3 Proposed source layout

Keep the existing Expo structure and add modules only when an approved slice requires them:

```text
src/app/                    route declarations and layouts
src/screens/                route-level screen compositions
src/components/             reusable accessible UI
src/theme/                  semantic tokens
src/config/                 non-secret configuration
src/domain/                 entities, value objects, state machines, policies
src/features/               feature use cases and presentation state
src/services/               typed service ports
src/integrations/           provider adapters
src/storage/                cache and persistence boundaries
src/analytics/              typed events and consent-aware instrumentation
supabase/migrations/         reviewed database changes
supabase/functions/          trusted Edge Functions and webhooks
docs/product/               approved product requirements
docs/architecture/          approved architecture and contracts
docs/decisions/             ADRs and product decision records
docs/ui-ux/                 approved screen-specific contracts
.vossie/handoffs/           agent task and review evidence
```

This is a target organization, not authorization for a broad restructure. Atlas must create a scoped architecture task before moving existing files.

### 7.4 Domain boundaries

- Identity and student eligibility.
- Memberships, roles, capabilities, and campus/resource scope.
- Campuses, service areas, and operating readiness.
- Sellers and service providers.
- Catalog, categories, listings, variants, and inventory.
- Service schedules, slots, holds, and bookings.
- Cart, checkout, quote, and seller-order split.
- Payments, refunds, payouts, ledger, and reconciliation.
- Fulfillment quotes, carrier bookings, courier tasks, and tracking.
- Packages, custody, handoff codes, and delivery evidence.
- Chat, notifications, email, and receipts.
- Cases, disputes, returns, moderation, and support.
- Operations, finance, policy, security, and audit.
- Analytics and observability.

Do not create microservices for these domains during the pilot. Keep explicit module boundaries inside the Supabase/Expo architecture and extract services only when operational evidence requires it.

## 8. Conflict register and current resolution

| Topic | Older archive | Newer authority | Plan resolution |
| --- | --- | --- | --- |
| Client stack | Next.js, Tailwind, pnpm, Turborepo, Vercel PWA | Accepted Expo SDK 57 ADR | Use Expo, React Native Web, Expo Router, npm, and EAS |
| Server architecture | NestJS modular monolith and 202 REST operations | Interview chose Supabase Edge Functions; Expo ADR approves Supabase adapters | Begin with Supabase/Postgres/Edge Functions; reuse archived contracts only after domain review |
| Student authentication | Supabase email/password or manual document review in parts of implementation spec | Interview requires Eduvos SSO and blocks student launch without it | Implement institution identity adapter and SSO proof; no email fallback for public launch |
| Courier model | Student progressively activates courier capability | Interview assigns invited Vossie couriers | Use invited courier role in v1; treat student courier activation as later decision |
| Issue window | 24 hours | Interview selected 48 hours | Use configurable 48-hour v1 policy |
| Fees | 7% seller and 5% courier hypotheses, or zero development seed | Interview chose one disclosed transaction percentage, exact rate pending | Use versioned configurable policy; no production rate until approved |
| Reels | First-class pilot feature | Interview explicitly defers social feed, Reels, follows, and recommendations | Keep data-model extension points only; no v1 build |
| Operations delivery | Separate operations application in older architecture | Interview chose protected web admin in the Expo app | Use separate route group and authorization boundary in the same Expo codebase initially |
| Screen authority | Archived 177-screen atlas | Project owner will supply correct screens one by one | Use atlas for inventory and edge-case prompts only; each supplied screen is the implementation reference |
| Payment provider | Paystack preferred sandbox candidate in implementation spec | Interview requires evaluate then select | Run a provider capability proof before ADR; do not hard-code Paystack |
| Fulfillment carriers | Hub network plus general third-party fallback | Interview names PAXI, The Courier Guy, and Aramex, with at least one live at launch | Build a carrier interface, validate named providers, and launch only with proven options |
| Product universe | 177 screens, 90 tables, 202 operations, 385 tickets | V1 is a complete transaction journey with unrelated screens deferred | Reconcile and import only the tickets required for approved vertical slices |

## 9. Data model blueprint

This is a domain blueprint, not a migration. Schema owns the final relational design, constraints, indexes, RLS, and migration sequence.

### 9.1 Identity and access

- `users`: internal identity reference and lifecycle status.
- `identity_links`: provider, subject, tenant, issuer, and verification metadata.
- `student_eligibility`: institution status, campus, evidence source, verified/expired timestamps.
- `memberships`: role/capability, campus/resource scope, invited/approved/suspended state.
- `staff_invitations`: inviter, target, requested role, expiry, acceptance.
- `sessions` or provider-session references where safe and supported.
- `audit_events`: actor, action, target, scope, correlation, outcome, immutable timestamp.

### 9.2 Marketplace

- `seller_profiles` and `service_provider_profiles`.
- `categories` and versioned category attribute definitions.
- `listings`, `listing_media`, `listing_attributes`, `listing_inventory`.
- `service_definitions`, `service_slots`, `slot_holds`.
- `listing_policy_checks`, `listing_flags`, `moderation_cases`.
- `carts` and `cart_items`.
- `checkout_sessions`, `quotes`, and immutable quote lines.
- `orders` as buyer-level payment/checkout grouping.
- `seller_orders` as independent fulfillment and settlement units.
- `order_items` with immutable price, fee, seller, and listing snapshots.
- `bookings` for services.

### 9.3 Money

- `payment_intents` and `payment_events`.
- `provider_webhook_events` with idempotency and processing outcome.
- `ledger_accounts`, `ledger_entries`, and balanced ledger postings.
- `fee_policies` with effective dates and versions.
- `refunds` and allocation lines.
- `payout_destinations`, `payouts`, and payout attempts.
- `reconciliation_runs` and exceptions.

Store money as integer cents in ZAR for the pilot. Store provider references and immutable financial snapshots. Never store raw card data, CVV, banking credentials, or provider secrets.

### 9.4 Fulfillment and custody

- `fulfillment_quotes` and `fulfillment_options`.
- `carrier_bookings` and normalized provider events.
- `delivery_jobs` and assignments.
- `packages` with opaque QR/token identifiers.
- `custody_events` with actor, role, location, timestamp, evidence, and transition.
- `handoff_challenges` with hashed, single-use, time-bound codes.
- `delivery_exceptions` and evidence.
- `campus_hubs`, `hub_memberships`, and `hub_operating_hours` if hubs enter v1.
- `transfer_routes`, `manifests`, and scan reconciliation if pooled transfers enter v1.

### 9.5 Communication and operations

- `conversations`, `conversation_participants`, `messages`, `message_reports`, `blocks`.
- `notification_events`, channel deliveries, templates, receipts, and failures.
- `cases`, `case_links`, `case_evidence`, assignments, internal notes, decisions, and appeals.
- `policy_versions`, `prohibited_items`, and carrier eligibility rules.
- `analytics_events` with privacy-aware identity and consent rules.
- `operational_metrics` derived from authoritative records.

### 9.6 Integrity requirements

- UUID identifiers.
- UTC timestamps; render in Africa/Johannesburg by default.
- Optimistic version field on mutable aggregates.
- Foreign keys and uniqueness rules enforced in PostgreSQL.
- Idempotency keys for financial, fulfillment, and other retryable commands.
- No cascade deletion of financial, custody, case, or audit history.
- Append-only or protected records for posted ledger entries and custody events.
- Object-level and role/campus-scope authorization on every protected read and mutation.
- Audit and outbox/event record written in the same transaction as sensitive state changes.
- Account deletion handled as a reviewed privacy workflow, not a destructive blanket delete.

## 10. State-machine blueprint

Exact names may change during domain design, but transitions must remain explicit and server-authoritative.

### 10.1 Listing

`DRAFT -> CHECKING -> PUBLISHED`

Alternate paths:

- `CHECKING -> FLAGGED -> UNDER_REVIEW -> PUBLISHED | REJECTED`
- `PUBLISHED -> PAUSED | SOLD_OUT | ARCHIVED`

### 10.2 Goods seller order

`CREATED -> PAYMENT_PENDING -> PAID_AWAITING_SELLER -> ACCEPTED -> PREPARING -> READY_FOR_PICKUP -> IN_FULFILLMENT -> DELIVERED -> ISSUE_WINDOW -> COMPLETED`

Exception states include `SELLER_TIMEOUT`, `FULFILLMENT_WAITLIST`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `DISPUTED`, and `RETURN_IN_PROGRESS`.

### 10.3 Service booking

`SLOT_AVAILABLE -> HELD -> PAYMENT_PENDING -> BOOKED -> IN_PROGRESS -> PROVIDER_MARKED_COMPLETE -> ISSUE_WINDOW -> COMPLETED`

Exception states include `HOLD_EXPIRED`, `CANCELLED`, `NO_SHOW_REVIEW`, `DISPUTED`, and `REFUNDED`.

### 10.4 Payment and settlement

Keep payment, order, delivery, and payout states separate.

`CREATED -> PROVIDER_PENDING -> AUTHORISED | CAPTURED -> RECONCILED`

Then allocated value may move through:

`PENDING -> SECURED -> HELD_FOR_COMPLETION -> AVAILABLE -> PAYOUT_PROCESSING -> PAID_OUT`

Exceptions include `FAILED`, `UNCERTAIN`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`, `DISPUTED`, and `RECONCILIATION_REQUIRED`.

### 10.5 Delivery

`QUOTE_SELECTED -> BOOKING_PENDING -> ASSIGNED -> PICKUP_PENDING -> PICKED_UP -> IN_TRANSIT -> ARRIVED -> HANDOFF_VERIFIED -> DELIVERED`

Every transition has actor, authority, evidence, idempotency, timestamp, and failure behavior.

## 11. Implementation roadmap

### Phase 0 - Canonicalize decisions and clear planning blockers

**Lead:** Atlas
**Agents:** Scribe, Market, Relay, Forge, Schema, Bridge, Guardian

Deliverables:

- Convert the interview baseline into approved documents under `docs/product/`.
- Create ADRs for identity, backend boundaries, payment selection process, role model, and fulfillment architecture.
- Add the conflict register and decision status to the repository knowledge index.
- Decide whether Buyer Requests, hubs, cross-campus pooled transfers, food, rentals, digital goods, and ratings are in v1.
- Create a campus readiness template.
- Create a provider capability matrix for identity, payments, and carriers.
- Replace `BLK-001` only when canonical product references exist in the repository.
- Convert only the approved first vertical slice into `project-state.json` tasks.

Acceptance gates:

- Product owner approves the v1 scope statement.
- Repository source precedence is unambiguous.
- Every open decision has an owner and target phase.
- Guardian `PASS` on documentation consistency.

### Phase 1 - Shared product foundation and screen intake

**Lead:** Pixel
**Agents:** Kinetic, Market, Scribe, Probe
**Verifier focus:** Lens, Pulse

Deliverables:

- Finalize semantic design tokens from approved brand assets.
- Build accessible shared components needed by the first journey.
- Add route groups for student marketplace, courier, and protected operations surfaces.
- Establish form, loading, empty, error, offline, denied, retry, and success patterns.
- Establish read-only offline cache boundaries.
- Establish typed analytics event conventions.
- Use the project owner's first approved screen to validate the page-build loop.

Acceptance gates:

- No screen is built from archived imagery when a new owner-supplied screen is expected.
- Components work at phone, tablet, and desktop widths relevant to their role.
- Screen-reader labels, focus order, minimum 44 pt targets, readable contrast, and reduced motion pass.
- Lint, typecheck, tests, Expo Doctor, and web export pass.
- Chrome and connected physical iPhone behavior are verified where available.
- Guardian `PASS`.

### Phase 2 - Identity, eligibility, invitations, and authorization

**Lead:** Forge
**Agents:** Schema, Bridge, Pixel, Aegis, Vault, Probe

Deliverables:

- Eduvos/Microsoft SSO capability proof and documented fallback rule of “no student launch.”
- Identity-provider interface and Supabase session integration.
- Student eligibility record and campus assignment.
- Staff/courier invitation and role assignment flow.
- Capability-based RBAC with campus and resource scope.
- RLS and server-side authorization tests.
- Session expiry, logout, revoked access, denied state, and audit events.

Acceptance gates:

- Client role selection cannot grant access.
- Cross-user, cross-campus, and cross-role access tests fail safely.
- Sensitive role changes are audited.
- No institutional secrets are collected or stored.
- Development and staging use approved test identities; production credentials remain separate.
- Guardian `PASS`; Aegis and Vault findings resolved.

### Phase 3 - Sellers, listings, services, catalog, and moderation

**Lead:** Market
**Agents:** Schema, Forge, Pixel, Bridge, Probe

Deliverables:

- Seller/service-provider activation.
- Categories and extensible listing attributes.
- Goods listing creation, media, inventory, campus, dimensions, and availability.
- Service definition, duration, location/remote mode, cancellation policy, and slots.
- Automated required-field and policy checks.
- Prohibited-item and carrier-eligibility rules.
- Flag/report and operations review workflow.
- Browse, search, listing detail, and service detail.

Acceptance gates:

- A listing cannot publish with missing delivery-critical fields.
- Duplicate submission and retry behavior is idempotent.
- Inventory and slot conflicts are database-protected.
- Flagged listings do not bypass review.
- Unauthorized sellers cannot mutate another seller's catalog.
- Guardian `PASS`.

### Phase 4 - Cart, checkout split, service holds, and pricing

**Lead:** Market
**Agents:** Forge, Schema, Pixel, Relay, Bridge, Probe

Deliverables:

- Mixed goods/services cart.
- Multi-seller order split.
- Immutable quote and price snapshots.
- Delivery and service availability validation.
- Temporary service-slot hold with expiry.
- Seller-order-specific delivery fee allocation.
- Checkout recovery after partial failures.
- Clear unavailable-item handling before payment.

Acceptance gates:

- One checkout produces correct independent seller orders.
- A stale price, stock version, slot, or delivery quote cannot be silently accepted.
- One seller's failure does not corrupt unaffected seller orders.
- Two buyers competing for the last item or slot yield only one successful reservation.
- Guardian `PASS`; Vector contract review complete.

### Phase 5 - Payment, ledger, refunds, and provider reconciliation

**Lead:** Bridge
**Agents:** Forge, Schema, Market, Aegis, Vault, Probe

Deliverables:

- Payment-provider evaluation and ADR.
- Sandbox capability proof for hosted/tokenized checkout, webhook signatures, idempotency, partial refunds, payouts or marketplace settlement, and reconciliation.
- Payment adapter and verified webhook processing.
- Versioned fee policy and immutable fee snapshot.
- Balanced ledger and seller-order allocations.
- Refund commands and partial-refund allocation.
- Reconciliation queue and finance exception workflow.
- 24-hour fulfillment-waitlist funds behavior approved and implemented safely.

Acceptance gates:

- Duplicate, reordered, delayed, and malicious webhook cases are tested.
- Amount/currency mismatch never records successful payment.
- Client redirect never declares payment final.
- Double refund and double payout are prevented.
- Ledger postings balance and posted history cannot be edited.
- No production payment path until provider capability, commercial, legal/accounting, and security gates pass.
- Guardian `PASS`; Aegis, Vault, and Vector pass.

### Phase 6 - Seller acceptance and goods fulfillment

**Lead:** Relay
**Agents:** Market, Forge, Schema, Pixel, Bridge, Probe

Deliverables:

- 24-hour seller acceptance timeout.
- Seller preparation and ready-for-handoff states.
- Vossie delivery quote and assignment rules.
- Third-party carrier interface and at least one proven sandbox integration.
- Carrier fallback and failure behavior.
- Native courier task mode.
- One-time pickup/delivery codes, custody timeline, and exception reporting.
- Buyer tracking and unified fulfillment status.
- 24-hour no-coverage waitlist and buyer cancellation flow.

Acceptance gates:

- Two couriers cannot own one exclusive assignment.
- Wrong, expired, reused, or brute-forced handoff codes fail and are audited.
- A carrier failure does not corrupt the order or hide valid alternatives.
- Private address/location data is limited to the active authorized job.
- Delivery completion does not automatically finalize product satisfaction or payout.
- At least one third-party option is proven before public launch.
- Guardian `PASS`; Relay evidence reviewed by Aegis, Vector, Pulse, and Vault as applicable.

### Phase 7 - Service fulfillment

**Lead:** Market
**Agents:** Forge, Schema, Pixel, Bridge, Probe

Deliverables:

- Provider booking acceptance and schedule management.
- Reminders and booking communication.
- Provider completion submission.
- Buyer confirmation and dispute entry.
- Approved cancellation cutoff and no-show handling.
- Service-specific refund and payout rules.

Acceptance gates:

- Overlapping slots and stale holds fail.
- Provider cannot mark another provider's booking complete.
- Buyer cannot confirm or dispute an unrelated booking.
- Cancellation calculations use the policy version captured at booking.
- Guardian `PASS`.

### Phase 8 - Cases, disputes, returns, and payout release

**Lead:** Forge
**Agents:** Market, Relay, Schema, Pixel, Bridge, Aegis, Vault, Probe

Deliverables:

- 48-hour issue window.
- Structured cases linked to order, payment, seller order, booking, package, and evidence.
- Operations assignment, timeline, internal notes, and decision workflow.
- Return-cost responsibility and logistics incidents.
- Refund/partial-refund/payout outcomes.
- Appeal or second-review path for sensitive decisions.
- Automatic or manual payout rule selected for the pilot.

Acceptance gates:

- Disputed allocations remain held.
- Unaffected seller-order allocations may progress independently after review.
- The same operator cannot silently propose and approve a sensitive exception when separation of duties is required.
- Evidence access is scoped and audited.
- 48-hour expiry and buyer-confirmation paths produce the correct payout eligibility event.
- Guardian `PASS`; Aegis and Vault pass.

### Phase 9 - Messaging, notifications, receipts, admin, and analytics

**Lead:** Forge
**Agents:** Pixel, Bridge, Schema, Market, Relay, Scribe, Probe

Deliverables:

- Order-linked conversations, blocking, and reporting.
- In-app notification center.
- Expo push integration and token lifecycle.
- Transactional email adapter.
- Event-derived receipts.
- Protected operations web workspace for listings, orders, couriers, disputes, finance, and access.
- Funnel, cohort, attribution, payment, delivery, support, and reliability telemetry.
- Separate security audit events from product analytics.

Acceptance gates:

- Notifications deep-link only to authorized objects.
- Notification delivery failure does not roll back the business transaction.
- Chat participants cannot access unrelated conversations.
- Analytics contains no unnecessary sensitive content or secrets.
- Admin grants enforce separation of duties.
- Guardian `PASS`; Watchtower operational-readiness review complete.

### Phase 10 - Campus hubs and cross-campus transfers, if approved for v1

**Lead:** Relay
**Agents:** Schema, Forge, Pixel, Bridge, Vault, Probe

Deliverables:

- Hub intake, condition checks, custody, release, return, and exception flows.
- Transfer routes, capacity, manifests, scan reconciliation, and route exceptions.
- Unified buyer timeline across multiple custody legs.
- Third-party fallback for routes without viable pooled movement.
- Campus operating-hours and staffing controls.

Acceptance gates:

- QR scan resolves an opaque token and never grants a final state without server validation.
- Manifest expected package set must equal the scanned package set; equal counts alone are insufficient.
- Transfer staff receive only the minimum parcel and route data.
- Every custody transition is immutable and auditable.
- Guardian `PASS`; Vault and Relay verification complete.

### Phase 11 - Release hardening and staffed pilot

**Lead:** Atlas
**Agents:** Guardian, Sentinel, Lens, Aegis, Vector, Pulse, Vault, Harbor, Watchtower, Resolver, Medic, Scribe

Deliverables:

- Dev, staging, and production separation verified.
- CI/CD with clean install, lint, typecheck, unit, integration, migration, authorization, E2E, accessibility, secret, dependency, and build checks.
- Real PostgreSQL concurrency tests.
- End-to-end rehearsal using real SSO and sandbox providers.
- Partial refund, dispute, timeout, retry, and reconciliation rehearsals.
- Web, iOS, and Android device checks.
- Backup, isolated restore, and provider reconciliation exercise.
- Incident, credential rotation, support, and rollback runbooks.
- Campus readiness matrix and staffed pilot schedule.
- Approved commercial, privacy, retention, prohibited-item, and cancellation policies.

Release gate:

- Required evidence exists for every gate.
- No unresolved critical security, data integrity, payment, authorization, accessibility, or custody finding.
- Guardian `PASS`.
- Sentinel confirms independent verification is complete.
- Resolver final regression passes.
- Harbor confirms release conditions.
- Human project owner authorizes production release and protected-branch merge.

## 12. Screen-by-screen delivery loop

The project owner will supply the correct screens one by one. For each screen, Atlas creates a task containing:

- screen name and route;
- role and authorization boundary;
- supplied reference and approval date;
- entry points and exit destinations;
- visible information and data sources;
- every control and its intended action;
- validation and business rules;
- loading, empty, offline, denied, error, retry, expired, success, and back behavior;
- phone, tablet, desktop, keyboard, safe-area, and text-scaling behavior;
- motion and reduced-motion behavior;
- analytics events;
- dependencies and provider gaps;
- test and visual-verification requirements.

Implementation then follows `docs/engineering/page-build-loop.md`:

1. Decompose the screen.
2. Scaffold the page-local screen and assets.
3. Reuse or add approved components.
4. Connect only approved real contracts; label local prototypes clearly.
5. Test the interaction path, not only the first frame.
6. Run repository verification.
7. Verify Chrome and the connected iPhone when available.
8. Obtain Guardian `PASS`.
9. Synchronize docs and prepare the focused commit.

Archived images, the interactive atlas, and the 177-screen PDF may suggest missing states or dependencies, but they do not override the latest supplied screen.

## 13. Agent execution model

### 13.1 Orchestration

- **Atlas** owns decomposition, dependencies, source precedence, integration, and project-state updates.
- A specialist receives one task with explicit allowed and forbidden files.
- One task has one accountable owner. Cross-domain tasks name a lead and collaborators.
- Independent tasks may run in parallel only when file scopes and dependencies do not conflict.
- Specialists do not widen their own scope or redefine locked decisions.

### 13.2 Build ownership

| Agent | Primary responsibility in this plan |
| --- | --- |
| Pixel | Expo UI, responsive layouts, screen integration, client accessibility |
| Forge | Edge Functions, application services, session integration, background work |
| Schema | PostgreSQL schema, migrations, constraints, indexes, functions, RLS |
| Market | Listings, services, cart, orders, bookings, commerce policies |
| Relay | Delivery, couriers, custody, hubs, transfers, exceptions |
| Bridge | SSO, payment, carrier, maps, email, push, analytics adapters |
| Kinetic | Functional motion and reduced-motion variants |
| Probe | Unit, integration, E2E, concurrency, failure, and regression tests |
| Scribe | Product, architecture, ADR, operational, and handoff documentation |
| Guardian | Required independent build-team review gate |
| Medic | Reproduction, root cause, repair, and regression after failures |

### 13.3 Independent verification

- **Sentinel** coordinates the independent review plan.
- **Lens** reviews UI fidelity and accessibility.
- **Aegis** reviews application security and authorization.
- **Vector** reviews API and contract behavior.
- **Pulse** reviews performance and reliability.
- **Vault** reviews data integrity, privacy, migrations, and RLS.
- **Harbor** reviews infrastructure, environment, deployment, and release gates.
- **Watchtower** confirms observability and that required checks actually ran.
- **Resolver** performs final regression and release-readiness verification.

### 13.4 Required task contract

Every generated task must include:

- task ID;
- owner and collaborators;
- objective and why now;
- canonical references;
- dependencies;
- allowed and forbidden files;
- acceptance criteria;
- required tests;
- security/privacy considerations;
- documentation impact;
- branch/base;
- handoff path;
- blocker status.

Completion requires factual files-changed and tests-run evidence. No agent may fabricate a pass, live integration, payment, custody event, or production deployment.

## 14. Test strategy

### 14.1 Test layers

- Unit tests for policies, calculations, parsers, state transitions, and UI logic.
- PostgreSQL tests for constraints, RLS, uniqueness, locking, and migrations.
- Integration tests for Edge Functions and provider adapters.
- Contract tests using provider sandbox fixtures and signed webhook examples.
- E2E tests for the complete buyer, seller, courier, and operations journeys.
- Real-device checks for push, deep links, camera/QR, background/foreground behavior, safe areas, and accessibility.
- Concurrency tests for inventory, service slots, seller acceptance, courier assignment, webhook handling, refunds, and payouts.
- Resilience tests for timeouts, retries, duplicates, reordering, offline recovery, and provider outages.
- Security tests for authorization, object access, input validation, secret handling, evidence access, and privilege changes.

### 14.2 Mandatory adversarial cases

- Two buyers compete for the last unit.
- Two buyers compete for one service slot.
- Two sellers/couriers attempt the same exclusive acceptance.
- Duplicate or reordered payment webhooks.
- Capture arrives after reservation expiry.
- Payment amount or currency mismatch.
- One seller fails inside a multi-seller checkout.
- Carrier quote expires between selection and booking.
- Wrong, reused, expired, or brute-forced handoff code.
- Delivery succeeds but a product-quality dispute opens.
- Refund retries and payout retries.
- User loses a role or campus scope during an active session.
- Offline client submits a stale mutation after reconnect.
- Unauthorized evidence, message, address, location, finance, or audit access.

## 15. Security, privacy, and compliance requirements

- Collect the minimum student, address, chat, location, evidence, and payout data required.
- Define retention and deletion rules before public launch.
- Use private storage and short-lived scoped access for evidence and sensitive media.
- Separate product analytics, operational logs, security audit, and provider secrets.
- Audit role changes, payout-detail changes, refund decisions, evidence views, moderation actions, configuration changes, and authentication anomalies.
- Require step-up authentication or dual control for high-risk finance and privilege actions where the final policy requires it.
- Do not expose buyer/seller details to a courier beyond the active job's needs.
- Do not expose individual courier location outside the authorized order and operating window.
- Never store raw card numbers, CVV, institutional passwords, Authenticator secrets, or plaintext handoff codes.
- Complete POPIA, institutional governance, food, courier, tax/accounting, and marketplace funds-flow review before relevant production features launch.

## 16. Offline and failure behavior

- Recent listings and order details may be cached read-only with a visible freshness indicator.
- Payment, refund, payout, custody, delivery, booking, role, and policy mutations require a connection and authoritative server response.
- Draft forms should recover where safe, excluding secrets and expired financial/session data.
- Realtime messages are hints; reconnect always fetches authoritative state.
- Provider failure must produce a clear retry, alternate option, or operations path.
- “Pending” and “unknown” are legitimate states. The client must not convert uncertainty into success.

## 17. Observability and analytics

### 17.1 Product and marketplace

- Sign-in and eligibility funnel.
- Search, zero-result, listing view, cart, checkout, conversion, and abandonment.
- Service-slot hold and booking conversion.
- Seller activation, listing publication, acceptance, timeout, and fulfillment.
- Cohort retention and repeat purchase.
- Attribution source and campaign QR where consent and privacy allow.

### 17.2 Operations and reliability

- Payment state, webhook lag, reconciliation exceptions, refunds, and payouts.
- Carrier quote/booking success and latency.
- Courier assignment, pickup, delivery, exception, and handoff-code failures.
- Case volume, SLA, dispute outcomes, and support load.
- Notification delivery and retry outcomes.
- Function errors, database health, queue/outbox lag, app crashes, and release health.
- Authorization denials and suspicious privilege/account events in the security stream.

Every event needs a name, schema, owner, retention rule, and privacy classification. Analytics must not become an alternate source of business truth.

## 18. Environment and delivery model

| Environment | Purpose | Data and provider rule |
| --- | --- | --- |
| Development | Local feature work and automated tests | Synthetic accounts and mocks/sandboxes only |
| Staging | Integrated rehearsal and owner acceptance | Separate Supabase project and provider sandboxes |
| Production | Approved public pilot | Live credentials, least privilege, audited changes |

- Secrets stay in ignored local environment files or approved secret stores.
- `EXPO_PUBLIC_*` values are never secrets.
- Migrations run as a controlled job with a distinct migration role.
- Runtime roles use least-privilege grants.
- Preview/staging release evidence must not be described as production proof.
- EAS builds, updates, and hosting deployments require recorded build/deployment IDs and smoke results.

## 19. External capability gates

### 19.1 Eduvos identity

- Institutional sponsor and approval.
- Tenant/issuer details and approved redirect URIs.
- Required identity claims and active-student eligibility source.
- MFA and session behavior.
- Test accounts and deprovisioning behavior.
- Privacy and support responsibilities.

### 19.2 Payment/payout provider

- South African merchant eligibility.
- Hosted/tokenized checkout methods.
- Authorization/capture duration suitable for seller acceptance and fulfillment waitlist.
- Partial refunds.
- Marketplace/seller payout capability or an approved alternative funds flow.
- Signed webhooks, idempotency, settlement exports, and reconciliation.
- Fees, reserves, disputes, settlement timing, onboarding, and support.

### 19.3 Carriers

For PAXI, The Courier Guy, and Aramex, verify:

- business/account eligibility;
- quote, booking, label, cancellation, tracking, and webhook/API support;
- parcel points versus door-to-door capability;
- campus coverage;
- parcel size, weight, category, and prohibited-item rules;
- sandbox or test method;
- rate limits, commercial minimums, support, and failure behavior.

At least one third-party carrier must pass before public transactions begin.

## 20. Open decisions

These decisions must be owned and closed before their dependent phase:

1. Confirm the mixed-cart interpretation: multiple items per seller and multiple sellers in one payment.
2. Decide whether Buyer Requests are in v1.
3. Decide whether hubs and pooled cross-campus transfers are in v1.
4. Decide initial categories, especially food, rentals, and digital goods.
5. Decide whether ratings/reviews launch in v1.
6. Approve the exact transaction-fee percentage and fee base.
7. Approve service cancellation cutoff, late-cancellation, and no-show rules.
8. Approve the 24-hour no-coverage waitlist funds flow.
9. Select the payment/payout provider after capability proof.
10. Confirm automatic payout, manual payout, or staffed finance release for the pilot.
11. Approve prohibited items and carrier-specific restrictions.
12. Confirm seller return, buyer change-of-mind, courier/hub fault, and return-cost policy.
13. Approve data retention and deletion periods.
14. Confirm per-campus operating coverage and fallback rules.
15. Confirm location precision, retention, and background-tracking policy.
16. Confirm support hours, dispute SLAs, and staffing.
17. Confirm whether student courier activation remains a future feature.
18. Approve legal, tax/accounting, POPIA, institutional, food, and courier requirements.

## 21. Risk register

| Risk | Impact | Mitigation / gate |
| --- | --- | --- |
| Eduvos SSO approval unavailable | Student launch blocked | Start institutional capability work in Phase 0; keep staff testing separate |
| Payment provider cannot hold/release/partially refund as required | Core money model invalid | Capability proof and ADR before payment implementation |
| Carrier APIs or contracts unavailable | Delivery choices and all-campus promise fail | Adapter architecture, campus matrix, at least one proven provider, clear unavailable states |
| Paid 24-hour fulfillment waitlist creates consumer/funds risk | Refund cost, disputes, trust loss | Approve authorize/capture sequence before build |
| All-campus scope exceeds operational staffing | Inconsistent service and support | Campus readiness gate and staged activation even if code supports all campuses |
| Archived specs conflict with interview or new screens | Rework and inconsistent behavior | Source precedence, conflict log, owner reconciliation before affected work |
| 177-screen universe drives horizontal overbuilding | Long delay without a complete journey | Vertical-slice roadmap and explicit deferred list |
| Mixed goods/services checkout becomes too complex | Payment, cancellation, and order-state defects | Separate seller orders and booking aggregates; concurrency and partial-failure tests |
| Sensitive data spreads through chat, evidence, maps, or logs | POPIA/security exposure | Data classification, least privilege, scoped storage, retention, audit review |
| Lean budget conflicts with full analytics and multi-provider scope | Cost or reliability pressure | Low-cost instrumentation first, usage caps, replaceable adapters, measured scaling |
| Provider/realtime uncertainty is shown as success | Financial/custody integrity failure | Explicit pending/unknown states, reconciliation, idempotency, no client-declared completion |

## 22. Definition of done

A work package is complete only when:

1. Its acceptance criteria are met or an explicit, owner-approved deferral is recorded.
2. Product behavior matches the highest-authority source.
3. Required automated and manual checks ran with recorded results.
4. Security, authorization, data integrity, accessibility, responsive, and failure states are covered in proportion to risk.
5. External integrations are accurately labelled as mock, sandbox, staged, or live.
6. Guardian issues `PASS`.
7. Required independent findings are resolved and retested.
8. Product, architecture, decision, operation, and handoff documentation is synchronized.
9. The tree is commit-ready with no secrets or unrelated changes.

V1 is complete only when the staffed end-to-end rehearsal passes across buyer, seller/provider, courier/fulfillment, payment/refund/payout, dispute, and operations journeys on web and native clients, and the human project owner authorizes release.

## 23. First execution sequence

When implementation resumes, execute these steps in order:

1. Approve this plan as the working baseline.
2. Run Phase 0 and commit the canonical product specification and decision records.
3. Close the first four decisions that affect every later task: v1 module scope, identity model, payment capability process, and fulfillment/hub scope.
4. Update `project-state.json` to replace the broad blocker with concrete dependencies and the first vertical-slice tasks.
5. Ask the project owner for the first correct screen and its intended journey position.
6. Build the shared components required for that screen and no unrelated screen family.
7. Implement the first thin vertical slice with local/sandbox adapters where approved.
8. Pass Guardian and the required independent checks.
9. Continue screen by screen, expanding the real domain only when the next approved step requires it.

Recommended first vertical slice after Phase 0:

`Eduvos test sign-in -> marketplace browse -> one physical listing -> single-seller cart -> sandbox checkout -> seller acceptance -> one fulfillment method -> handoff code -> buyer confirmation -> operations view`

Then expand to multi-seller orders, services, third-party carriers, disputes/refunds, and payout eligibility.

## 24. Source inventory used for this plan

### Current repository authority

- `AGENTS.md`
- `AGENT-CONTRACTS.md`
- `project-state.json`
- `docs/INDEX.md`
- `docs/decisions/0001-universal-expo-foundation.md`
- `docs/architecture/application-foundation.md`
- `docs/JEV_AGENT_ARCHITECTURE.md`
- `docs/engineering/agent-tree.md`
- `docs/engineering/workflow.md`
- `docs/engineering/handoff-contract.md`
- `docs/engineering/page-build-loop.md`
- `docs/engineering/git-workflow.md`
- `docs/engineering/skills-index.md`

### Interview authority

- Local Codex session dated 2026-10-12 containing the senior technical co-founder/product architect interview and verified answers.
- The interview's final spec summary, assumptions, and risk list.
- Project-owner instruction that correct screens will be supplied one by one during implementation.

### Recovered source package

From `C:\Users\PABAL\Downloads\Vossie_Engineering_Environment_Local_Cursor\`:

- `Vossie_Implementation_Specification.pdf`
- `Vossie_Developer_Architecture_and_Build_Guide.pdf`
- `Vossie_Full_UIUX_Page_Architecture.pdf`
- `Vossie_Motion_and_Interactive_3D_Showcase.pdf`
- `Vossie_Development_Backlog.csv`
- `Vossie_Interactive_Page_Atlas.html`
- `Vossie_Motion_Studio.html`
- `vossie-plato-edition.html`
- Archive index, decision register, history, source index, source summaries, business, marketing, team, pitch, workflow, integration, security-gate, and manifest PDFs.
- Nine archived screen/concept images, treated as historical visual context rather than current screen specifications.

From `G:\Context File\`:

- `00_ALL_IN_ONE_CONTEXT.pdf`
- Product, identity, role, money, payment, dispute, inventory, food, notification, courier, hub, transfer, maps, seller/incubation, operations, support/security, brand, design-language, Figma, motion, responsive-experience, 177-screen, Buyer Requests, and Marketplace Reels context PDFs.

### Archive quantities retained as reference

- 177-screen design universe.
- 90-table historical schema specification.
- 202-operation historical API inventory.
- 514 historical screen/action bindings.
- 385-ticket archived delivery backlog.

These quantities describe the archived specification universe. They are not the v1 commitment and must be reconciled before import into the current Expo/Supabase project.
