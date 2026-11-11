V ossie Marketplace Knowledge Base
V ossie Marketplace Knowledge Base
This folder is the curated Markdown knowledge base for V ossie Marketplace / EduHackers 2.0. It is intended to let a fresh
ChatGPT account, a W ork session, Cursor, VS Code, Figma, or a human teammate understand the project without relying
on old chat memory .
What V ossie is
V ossie is not only a student buy-and-sell app. The current product thesis is a verified campus commerce, logistics,
operations and student-entrepreneurship platform built around Eduvos students and campuses.
The platform has two application families sharing one identity and backend:
• App 1 — V ossie Marketplace: Buyer, Seller and Courier under one verified student identity .
• App 2 — V ossie Operations: Campus Hub, T ransfers, Incubation, Support, Moderation, Finance, Compliance,
Security , Admin and Platform Operations.
The current design universe contains 177 screens, while the engineering handoff also defines a much larger implementation
surface including database tables, APIs and delivery tickets. The prototype should prove complete vertical journeys rather
than attempt to ship all 177 screens at once.
Recommended reading order for a fresh account
1. 00_START_HERE/01_PROJECT_CONTEXT.md
2. 00_START_HERE/02_MASTER_CONTEXT_TRANSFER_PROMPT.md
3. 00_START_HERE/03_SOURCE_OF_TRUTH_ORDER.md
4. 00_START_HERE/04_LOCKED_DECISIONS.md
5. 01_PRODUCT/01_PRODUCT_VISION_DIFFERENTIATION.md
6. 01_PRODUCT/02_TWO_APP_ARCHITECTURE_ROLES.md
7. 02_IDENTITY_SECURITY/01_AUTHENTICATION_EDUVOS_MFA.md
8. 03_COMMERCE/01_MONEY_MODEL_LEDGER.md
9. 04_LOGISTICS/03_CROSS_CAMPUS_TRANSFERS.md
10. 06_UIUX_BRAND/03_FIGMA_PRODUCTION_SYSTEM.md
11. 07_ENGINEERING/01_TECH_STACK.md
12. 07_ENGINEERING/03_AGENTIC_WORKFLOW.md
13. 09_PITCH_MEDIA/01_CINEMATIC_PITCH_BLUEPRINT.md
Important reality checks
• The current V ossie work is a prototype/specification system , not a production marketplace.
• Eduvos/Microsoft institutional SSO must be formally approved before production use. The prototype simulates the
flow honestly .
• Live payment, payout, logistics and identity integrations require provider/institution credentials and approvals.
• Figma automation, After Effects access and third-party MCPs must only be treated as available when the current
environment exposes them.
• Zero-budget is a hard constraint for the prototype; paid services must be optional, replaceable or simulated.
F older map
• 00_START_HERE — migration/context transfer
• 01_PRODUCT — product model, roles, journeys, requests, Reels
1
• 02_IDENTITY_SECURITY — authentication, role verification, security
• 03_COMMERCE — money , payments, disputes, inventory , food, communications
• 04_LOGISTICS — courier, hub custody , transfers, maps
• 05_OPERATIONS — seller studio, incubation, admin, support/security operations
• 06_UIUX_BRAND — brand, Plato/Uber design language, Figma, motion, responsive behaviour
• 07_ENGINEERING — stack, repo architecture, agentic workflow, CI/CD, integrations
• 08_BUSINESS_MARKETING — market thesis, monetization, GTM, team roles
• 09_PITCH_MEDIA — cinematic pitch and W ork handoff
• 10_REFERENCE — glossary , decision timeline, source index, fresh-account checklist
2