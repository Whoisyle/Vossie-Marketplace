# Design, prototype, policy and security brief

Captured from the product owner on 2026-09-30. This brief adds direction to the canonical package without replacing the existing source-of-truth order in `docs/specs/README.md`.

## Ownership

There is no registered `Figma` agent. Route the requested work through the existing roster:

- **Pixel:** UI design, UX design, graphic design, brand application, responsive mockups, user flows, prototypes and component specifications.
- **Kinetic:** motion design, transitions, gesture feedback and interaction animations.
- **Scribe:** policy/documentation inventory and draft compliance, privacy, legal and safety copy for human/legal review.
- **Aegis:** independent application-security verification after implementations exist, including object-authorisation/IDOR and SSRF coverage.
- **Lens:** independent usability, responsive-design and accessibility verification.
- **Atlas:** dependency ordering, scope decisions and integration.

Each agent runs in its own Devin session and may execute only a task assigned in `project-state.json`.

## UI, UX and brand direction

Apply the approved brand identity consistently from logo to every screen:

- warm ivory `#FAF8F2` is the primary canvas;
- Vossie navy `#29475B` is used for the logo, copy and primary actions;
- powder blue `#AFCBDE` is used for selected states and soft panels;
- slate blue `#567487` is used for supporting information;
- pale sage `#DDE5D9` is an optional quiet accent;
- every status colour is paired with a plain-language label or icon;
- visual hierarchy makes the next action obvious;
- navigation adapts across phone, tablet and desktop;
- preserve the supplied custom wordmark and joined `ss` icon rather than recreating them from a font;
- use Nimbus Sans when approved/licensed assets are available; DejaVu Sans is the existing fallback documented in the supplied brand deck.

The experience should feel easy, fast and enjoyable. Use research, personas, wireframes, flows, usability testing, information architecture and accessibility to reduce friction and drop-off.

## Requested reusable patterns

Pixel should add these patterns to the design backlog and map each to a real screen or flow before implementation:

- advanced booking cards;
- secondary service grids;
- promotional banners;
- service shortcut-row cards;
- quick recents;
- search bar and search feedback;
- wordmark header;
- personalised profiles;
- Apple-style mobile navigation adapted to Vossie branding;
- soft-depth/neomorphic treatment only where contrast, focus visibility and readability remain accessible;
- animated login, OTP, QR-code and payment-checkout states;
- onboarding, empty-state and in-app illustrations;
- app icon, splash screen, marketing banners and social-story assets.

Do not add patterns only for decoration. Each component needs a purpose, content model, interaction states, responsive variants and accessibility behavior.

## Prototype and handoff expectations

Before development of a substantial journey:

1. Define the user flow, including where every action leads.
2. Convert wireframes into content-complete component layouts rather than leaving placeholder text.
3. Produce responsive high-fidelity mockups using approved typography, colour and imagery.
4. Prototype the interactions, loading, empty, offline, denied, error and recovery states.
5. Verify the flow with usability and accessibility checks.
6. Hand off component variants, spacing/tokens, assets, destinations and behavior to engineering.

Figma plugins and external tools may be used as inspiration or workflow aids, not as product requirements or automatically approved dependencies. References named by the product owner include App Motion, Google Flow image generation, Galileo AI, UX Pilot AI, Moonchild AI, Spline and Flowbite Media.

## Motion direction

Motion should guide rather than delay:

- smooth screen transitions;
- clear button-press feedback;
- search-state transitions;
- login, OTP, QR-code and payment-checkout animations;
- loading and progress feedback;
- swipe and drag interactions where they match a real task;
- reduced-motion equivalents;
- interruption/cancellation that settles into the newest valid state.

Kinetic must follow the motion contracts and tokens in the canonical Developer Series and Build Guide rather than inventing a second motion system.

## Policy, legal and safety surfaces

Create an inventory and draft product copy for:

- privacy notice;
- terms and marketplace policies;
- safety guidance;
- compliance documents and downloadable PDFs;
- data and account rights;
- seller, buyer and courier responsibilities;
- prohibited content/items and reporting;
- dispute, refund, return and issue-window explanations;
- campus-hub custody, QR and recipient-OTP guidance.

Drafts must identify unresolved provider, institutional, money-flow, retention and jurisdiction decisions. Human/legal approval is required before publication; drafts must not claim compliance that has not been verified.

## Online-student scope

The product owner asked Atlas to consider online students. This changes eligibility, campus/location assumptions, fulfilment, hub access and service availability, so Atlas records it as an explicit product decision rather than silently expanding scope.

## Security verification

Security is designed into each build task and independently verified after runnable features exist. At minimum, verification plans cover:

- object-level and function-level authorisation (including IDOR/BOLA);
- SSRF and unsafe URL fetching;
- authentication, session, MFA and account-recovery abuse;
- injection and unsafe file/media handling;
- CSRF, XSS and redirect handling;
- rate limiting and enumeration;
- tenant/campus isolation and Supabase RLS;
- secrets, logs and privacy leakage;
- dependency and supply-chain scanning;
- payment, wallet, webhook and idempotency protections;
- QR/OTP replay, custody and evidence access;
- denied, stale, duplicate and cross-user outcomes.

Findings remain independent evidence. The responsible build agent or Medic remediates them, and Aegis retests.

## Visual references captured with this brief

The five screenshots in `docs/specs/brand/brand-deck-captures/` reinforce the supplied brand deck:

- primary wordmark and marketplace positioning;
- joined `ss` app icon;
- approved palette and usage;
- typography and voice;
- logo clear-space and scale;
- interface type scale, spacing, corner, target and component-state guidance.

The original deck in `docs/specs/canonical/Vossie_Marketplace_Brand_Identity.pptx` remains authoritative over these phone screenshots.
