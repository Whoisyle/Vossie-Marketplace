# Vossie canonical specification package

Committed by Atlas (VOS-000) on 2026-09-30 from files supplied by the product owner. Agents load only the refs listed in their task's `canonical_refs`; `text/` contains machine-extracted text of every PDF/PPTX/DOCX for search and low-token reading. When a text extract is ambiguous (tables, diagrams, colours), open the original file.

## Source-of-truth order

Per `knowledge-base/00_START_HERE/03_SOURCE_OF_TRUTH_ORDER.pdf`, below any explicit current human decision:

1. Locked decisions in the curated knowledge base (`knowledge-base/00_START_HERE/04_LOCKED_DECISIONS.pdf`).
2. Brand identity (`canonical/Vossie_Marketplace_Brand_Identity.pptx`, `knowledge-base/06_UIUX_BRAND/01_BRAND_IDENTITY.pdf`).
3. Platform Strategy / System Blueprint v12 (`canonical/Vossie_Platform_Strategy_Differentiation_System_Blueprint_v12.pdf`).
4. 177-screen map and screen contracts (`canonical/Vossie_177_Screen_Map.pdf`; per-screen contracts in the appendix of `canonical/Vossie_Developer_Architecture_and_Build_Guide.pdf`, IDs A01-A12, U01-U24, B01-B41, S01-S25, C01-C14, H01-H08, T01-T09, I01-I12, O01-O17, X01-X15).
5. Developer Series 1 v3: stack and application architecture.
6. Developer Series 2: Figma and runtime motion.
7. Developer Series 3: agentic SDLC and GitHub workflow.
8. Developer Series 4: cinematic pitch production.
9. Research dossiers, older prototypes and screenshots: reference only.

The Developer Architecture and Build Guide describes itself as a design proposal. Its screen appendix is the per-screen contract source; where its stack chapters (02-04: Expo, NestJS, BullMQ/Redis) conflict with the locked decisions, the locked decisions win (see `DEC-004` in `project-state.json`).

## Layout

| Path | Contents |
| --- | --- |
| `canonical/` | Blueprint v12, 177-screen map, Developer Architecture and Build Guide, Developer Series 1-4, Brand Identity deck |
| `knowledge-base/` | Curated Vossie knowledge base (start at `00_START_HERE/`) |
| `research/` | EduHackers research dossiers, technical showcase, business analysis, CMO playbook, visual advertising pack, Hack Jam timeline |
| `brand/` | Photos/screenshots of the app icon, wordmark, production studio and prototype login (not production vector artwork) |
| `briefs/` | Dated product-owner briefs that add design, prototype, policy and security direction |
| `references/plato/` | Plato app screenshots: visual-literacy reference only; never copy its assets |
| `text/` | Extracted text of every document above (`kb__` prefix = knowledge base) |

## External references

- Production design studio: https://vossie-production-studio.paballokali11.chatgpt.site/
- Hosted marketplace prototype: https://vossie-marketplace.paballokali11.chatgpt.site

## Not yet supplied

- Approved vector logo and font licence (`DEC-006`); engineering prototypes use text stand-ins until then.
- Full UI/UX atlas wireframe PDF and Figma links; screen contracts in the Build Guide appendix are sufficient for foundation work.
