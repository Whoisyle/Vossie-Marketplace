# Vossie Marketplace MVP — working product specification

- Status: **Working draft — scope decisions captured; open decisions remain**
- Product: `vossie-marketplace`
- Last updated: 2026-10-14
- Authority: project-owner decisions in the discovery conversation; this draft does not replace the missing canonical product and 177-screen specification package.

Do not implement unresolved behavior as if it were approved. Production access remains blocked until the institution identity contract and security review are complete.

## Approved MVP scope

The first functional milestone covers physical goods and bookable services within the campus marketplace:

- A user signs in to a clearly identified **demo account** with Supabase email OTP.
- The demo form requires an email ending in `@vossie.net` and a separate student-number field beginning with `eduv`.
- The submitted demo student number is stored in the user's protected private profile. It is not proof of identity or enrollment and must not be used for authorization.
- The demo checks are format/eligibility gates for the demo only. They do not prove Eduvos identity, enrollment, or current student status. Supabase OTP verifies control of the email mailbox, not student eligibility.
- Real Eduvos Microsoft Entra OIDC and institution-backed student verification are deferred until Eduvos supplies its approved issuer, tenant, claims, and verification contract. Do not promote demo users to production student-verified status.
- Profile setup includes display name, email, optional photo, and preferred campus. The email is tied to the verified Supabase Auth identity; profile edits must report their real save state.
- Marketplace Home shows the preferred campus by default and lets the user switch campuses.
- Campus directory uses the 12 owner-supplied campus names below and the owner-approved Vossie stable keys; these keys are not Eduvos-issued campus codes.
- Browsing and search cover physical goods and bookable services. Sellers and service providers manage their own profiles, listings, services, and availability.
- Seller and service-provider profiles and their submitted listings/services require staff approval before becoming public.
- Either participant may report a service no-show; the booking enters an issue state for staff review and is not automatically completed.
- Either buyer or seller may report a campus-handoff problem; completion is frozen and the issue is routed to authorized staff review.
- A buyer may request a goods order. Stock is reserved atomically while the seller decides; unanswered requests expire after 24 hours.
- A buyer may request an available service slot. The provider must accept; the slot is held atomically while pending and expires after 24 hours.
- Buyer and seller coordinate off-app payment. Vossie does not process, hold, confirm, or report payment received in this milestone.
- Goods are handed over on campus. The order is complete only after both buyer and seller confirm; either can report an issue instead.
- Order-specific private in-app messages are used to coordinate payment and handoff. Do not expose private email/phone details in public listings.
- Native phone layout and the supplied Profile Setup and Marketplace Home references are the visual acceptance baseline. Use the approved warm-white/ivory, navy, teal/blue, and sage palette; use a correct Vossie Marketplace wordmark variant; keep controls legible and phone-safe; use subtle, restrained neomorphic surface treatment.
- Routed screen transitions use the native navigation transition and respect reduced motion. Frequent tab changes do not slide.

## Explicitly deferred

- Eduvos student verification, institution claims, and production authorization.
- Online checkout, payment-provider integrations, refunds, seller payouts, platform-held funds, and any claim that an offline payment was received.
- Courier delivery, campus-to-campus manifests, and proof of courier custody.
- Broader administration and operations functions beyond seller/provider approval, content moderation, and narrowly scoped service no-show and handoff-issue review required for this marketplace milestone.
- Any screen, feature, or journey not described by the two supplied reference images or this MVP scope. The full 177-screen specification has not been supplied.

## Campus directory

The project owner supplied these display names and approved the corresponding internal keys for the MVP. They are not official Eduvos codes.

| Proposed stable key | Display name |
|---|---|
| `midrand-head-office` | Midrand (Head Office) |
| `bedfordview` | Bedfordview |
| `pretoria` | Pretoria |
| `potchefstroom` | Potchefstroom |
| `vaal-vanderbijlpark` | Vaal (Vanderbijlpark) |
| `bloemfontein` | Bloemfontein |
| `durban-umhlanga` | Durban (Umhlanga) |
| `east-london` | East London |
| `nelson-mandela-bay-gqeberha` | Nelson Mandela Bay (Gqeberha) |
| `cape-town-mowbray` | Cape Town (Mowbray) |
| `tyger-valley-cape-town` | Tyger Valley (Cape Town) |
| `nelspruit-mbombela` | Nelspruit (Mbombela) |

Do not change keys after database seeding. Display labels may be revised without changing a stable key. Official Eduvos identifiers are not required for this MVP; add a future mapping only from an authoritative source if an integration requires one.

## Required journeys

### Demo registration and sign-in

1. Collect a separate student number and email; store the student number only in the user's protected private profile.
2. Reject demo input unless the normalized student number begins with `eduv` and the normalized email ends with `@vossie.net`.
3. On first registration, send the Supabase Auth email verification OTP.
4. On later sign-ins, send a one-time sign-in OTP/link; create an authenticated session only after it is successfully verified.
5. Show "demo account / student status not verified" accurately. Never label the user an Eduvos-verified student based on either string check.

### Profile and campus discovery

1. Show the authenticated email as read-only identity data.
2. Allow the user to edit the display name, optionally add a profile photo, and select a preferred campus.
3. Default Marketplace Home to that campus; allow explicit campus switching.
4. Search published goods and services by campus, category, and text.
5. Do not show drafts, pending moderation submissions, or private information to other users.

### Seller listings and moderation

1. A user requests seller/provider capability and submits the required profile information.
2. The profile remains private/pending until authorized staff approval.
3. Sellers submit goods listings; service providers submit service definitions and availability. These remain unpublished until approval.
4. Approved owners can edit and pause their own content. Content changes that require renewed review remain unavailable publicly until reviewed.
5. Staff can approve, reject, or request changes and must record the decision and an audit event.

### Goods order and campus handoff

1. A buyer requests a quantity of an available published item.
2. The backend checks current availability and creates the order request and stock reservation atomically.
3. The buyer may cancel while the request is pending; the seller may accept or reject. An unanswered request and its reservation expire after 24 hours.
4. After seller acceptance, cancellation requires both buyer and seller approval. An unanswered cancellation request expires after 24 hours; the order remains active and the stock remains reserved.
5. The participants coordinate off-app payment and campus handoff in the private order thread. The interface clearly says Vossie does not process or verify the payment.
6. The buyer and seller independently confirm the handoff. The order is complete only after both confirmations. Either party may report a handoff problem instead; completion is frozen and the issue goes to authorized staff review.

### Service booking

1. A buyer selects a published service and available future slot.
2. The backend creates a pending request and temporary slot hold atomically.
3. The provider accepts or declines; an unanswered request/hold expires after 24 hours.
4. Participants coordinate service details and off-app payment privately. Vossie does not process or verify payment.
5. Either party may cancel an accepted booking before its scheduled start. Rescheduling requires provider approval.
6. Either party may report a no-show; the booking enters an issue state for staff review and is not automatically completed. Post-start cancellation, completion, evidence, staff resolution outcomes, and appeals remain open and must be approved before implementation.

## Acceptance checks

- Both reference screens render and are compared on the user's physical phone through Expo Go, not inferred from a web viewport.
- Layout uses runtime dimensions and safe areas; text, form controls, scroll, and fixed navigation remain usable on short and tall supported phones.
- Correct light/dark wordmark variants retain the approved lockup and are legible against their backgrounds.
- User can exercise valid and invalid demo input, receive/verify OTP, and sign out; the UI never reports an unverified student as verified.
- Campus switching affects search results consistently.
- Unapproved content is not visible in public queries.
- Concurrent requests for the last unit/slot cannot oversell or overbook; expiry restores availability exactly once.
- Pending goods-order cancellation releases reserved stock; post-acceptance cancellation cannot complete without both parties' approval and restores stock exactly once.
- An unanswered post-acceptance cancellation request expires after 24 hours without cancelling the order or releasing stock.
- A handoff issue freezes completion and is visible only to participants and authorized staff until staff review.
- Cancelling an accepted service booking before its start releases its slot exactly once; a rescheduled booking cannot move until the provider approves.
- Either booking participant can report a no-show; only an authorized staff review can resolve that issue, and the booking cannot auto-complete.
- Only authorized participants can read a private order thread or confirm/report their order.
- Nothing in the client can mark an order or payment complete without the required participant/backend transitions.
- Empty, loading, retry/error, permission-denied, and success states are specified for each live journey.
- Lint, strict typecheck, unit/integration tests, Expo web export, Expo Doctor, and Guardian review pass after implementation.

## Decisions still required

1. Provide Eduvos's approved Entra issuer/tenant, exact verified-student claim or verification API, allowed redirects, and required scopes. Until then, production identity and authorization remain blocked.
2. Define access/export, correction, and privacy-notice wording for the stored demo student number. Retain it only while the account is active and delete it within 30 days of account deletion. Do not use it as proof of identity or authorization.
3. Define service post-start cancellation, completion, evidence, no-show resolution outcomes, appeals, and review timing. Either party may report a no-show for staff review. Either party may cancel an accepted booking before its scheduled start; rescheduling requires provider approval. No platform refund can occur while payments are off-platform.
4. Define post-handoff cancellation, issue outcomes, evidence, appeals, and review timing. A reported handoff issue freezes completion and goes to authorized staff review.
5. Define service provider/seller/support staff roles, campus scope, content/no-show/handoff-issue review queue ownership, and rejection/request-change handling.
6. Define prohibited goods/services, user reporting behavior, and moderation outcomes.
7. Define email delivery provider/configuration, verification template, sender domain, retry/rate limits, and later order/booking notification events. Never put provider secrets in client code.
8. Define chat retention, deletion/export, message reporting, abuse handling, and applicable POPIA privacy notice/consent.
9. Define review/rating eligibility and whether it is deferred.
10. Supply final approved image assets and the light/dark wordmark lockups. Existing bundled imagery does not match all reference subjects.
11. Supply the rest of the canonical screen map and per-screen references before claiming complete coverage of the product or 177 screens.
