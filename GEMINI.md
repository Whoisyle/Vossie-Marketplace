# Vossie Engineering System — Gemini CLI & Jev Decision Intelligence

This file defines the engineering orchestration rules and Jev decision intelligence policy for the Vossie project.

---

## 1. Core Operating Model

- **Gemini CLI / Antigravity**: Primary reasoning, coding, tool execution, and agent orchestration engine.
- **Jev (TypeSafe AI)**: High-speed, typed System One decision intelligence layer for:
  - Agent routing (`jev_route`)
  - Confidence scoring
  - Sensitive action approval gating (`jev_approve` — strict fail-closed)
  - Implementation output validation (`jev_validate`)
  - Multi-criteria quality scoring (`jev_score`)
  - Model capabilities inspection (`jev_models`)

Gemini continues performing all generative coding and orchestration. Jev acts as an objective decision layer.

---

## 2. Specialist Agent Roster

| Specialist | Primary Responsibilities |
| :--- | :--- |
| **`supervisor`** | Task decomposition, Jev decision routing, specialist delegation, escalation handling. |
| **`architecture`** | System architecture, dependency boundaries, package separation, scalability, ADRs. |
| **`frontend_ui`** | Design system, responsive UI (mobile, tablet, desktop), animations, microinteractions, a11y. |
| **`backend`** | APIs, server actions, route handlers, database schemas/migrations, queues, domain services. |
| **`authentication`** | Eduvos/Microsoft identity, OAuth 2.0 / OIDC, student verification, sessions, RBAC. |
| **`marketplace`** | Buyer/Seller/Courier workflows, listings, carts, checkout, reels, offers, ratings. |
| **`operations`** | Vossie Operations app, Campus Hub logistics, package transfers, incubation, staff dashboards. |
| **`security`** | Threat modeling, authorization boundaries, secrets hygiene, input sanitization (Zod), POPIA. |
| **`qa`** | Automated unit, integration, and E2E test suites, regression tests, performance audits. |

---

## 3. Jev Routing Policy

When a meaningful task spans or could reasonably belong to multiple domains:

1. Invoke `jev_route` with the task description, context, and candidate specialists.
2. Inspect the returned decision, confidence score, and candidate probabilities.
3. Delegate the task to the selected specialist subagent.
4. **Trivial tasks**: Do NOT call Jev for trivial, single-file edits or obvious operations (e.g., fixing a typo).

### Low Confidence Policy (< 0.65)
If routing confidence is below **0.65**:
- Do not blindly delegate to the highest score.
- Review candidate probabilities and project context.
- Choose conservatively (preferring `security` or `authentication` when auth/data boundaries are involved).
- Document routing uncertainty in task handoffs.

---

## 4. Approval Gating Policy (`jev_approve`)

This is the operating policy when `jev_approve` is invoked. Automatic hook enforcement is currently disabled: `.agents/hooks.json` has `enabled: false`, and `.gemini/settings.json` registers the MCP server without a `PreToolUse` hook. Do not claim that sensitive commands are automatically intercepted.

Before initiating high-impact or sensitive operations, evaluate through `jev_approve`:

- Deletion of project files or directories (`rm`, `Remove-Item`, recursive deletion).
- Large destructive rewrites or refactors.
- Modifying or replacing authentication mechanisms.
- Destructive database migrations (dropping tables, database resets).
- Production deployment or publishing (`npm publish`, `vercel --prod`).
- Pushing to external remote branches (`git push --force`).
- Modifying security controls, permissions, or credential files.
- Irreversible external actions.

### Strict Fail-Closed Rule
If an approval request is made and Jev is unavailable, unauthenticated, rate-limited, timed out, or unconfident:
- **Approval is strictly DENIED (`approved: false`)**.
- Execution must halt immediately or escalate to the user.

### Triple Safety Confirmation
For high-impact actions evaluated through the Jev approval gate:
`Jev Approval Gate` + `Gemini CLI Native Safety Confirmation` + `Explicit User Approval`
must ALL be satisfied. Jev approval alone never bypasses user confirmation for irreversible actions.

---

## 5. Output Validation & Retry Loop (`jev_validate`)

For substantial specialist implementations:

1. **Supervisor** routes task to **Specialist**.
2. **Specialist** executes implementation.
3. Call `jev_validate` with task, code output, and explicit requirements (default threshold: **0.85**).
4. If validation passes (`valid: true`): continue workflow.
5. If validation fails (`valid: false`):
   - Specialist reviews failed requirements / reasons and implements targeted revision.
   - Run `jev_validate` again.
   - **Maximum automatic revisions: 2 retries**.
   - If validation fails after 2 retries: **Halt automatic retries and escalate to Supervisor / User**.

---

## 6. Vossie Project Context

### Two Target Applications
1. **Vossie Marketplace**:
   - Roles: Buyer, Seller, Courier.
   - Features: Product/service listings, advanced bookings, cart & checkout, payment abstraction, QR scan custody, delivery tracking, reviews, Marketplace Reels.
2. **Vossie Operations**:
   - Campus Hub logistics, package intake/release, cross-campus manifests, student merchant incubation, staff workflows, administrative moderation.

### Authentication & Identity
- Eduvos student authentication via Microsoft/Eduvos identity (OAuth 2.0 / OIDC).
- Verification redirects directly back into Vossie (never into an LMS experience).
- Insecure domain-only string checking is forbidden.

### Visual Design Tokens
- Soft, minimal, premium, restrained aesthetic:
  - **Warm ivory**: `#FAF8F2`
  - **Vossie navy**: `#29475B`
  - **Powder blue**: `#AFCBDE`
  - **Slate blue**: `#567487`
  - **Pale sage**: `#DDE5D9`
- Mobile-first, fluid responsive typography, subtle micro-interactions, full a11y compliance.
