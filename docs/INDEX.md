# Vossie knowledge index

This is the map of **authoritative information** for every agent (Cursor, Codex, and future VS Code verification).

If a required document is missing, **flag the gap**. Do not invent a locked product decision.

## Source precedence

When documents conflict, **stop and report the conflict**. Do not silently pick a winner.

1. Locked Vossie decisions — `docs/decisions/`
2. Latest approved product specification — `docs/product/`
3. Latest architecture specification — `docs/architecture/`
4. Latest UI/UX specification — `docs/ui-ux/`
5. Brand identity — `docs/ui-ux/` (brand / identity files when present)
6. Developer Series documentation — `docs/product/` and `docs/architecture/` (when labelled as series)
7. Existing implementation — application source in this repository
8. Historical documents — older revisions, snapshots, superseded drafts

## Current repository status

ADR 0001 and the application-foundation document approve a universal Expo engineering foundation. A product-neutral application shell now exists. Product behaviour remains **unspecified** until the canonical product and screen specifications are committed or linked.

## Where to look

| Domain | Path | Status |
|--------|------|--------|
| Product | `docs/product/` | Reserved; empty of approved specs |
| Architecture | `docs/architecture/` | **Foundation approved**; domain architecture pending |
| UI/UX | `docs/ui-ux/` | Reserved; empty of approved specs |
| Security | `docs/security/` | Reserved; engineering rules apply |
| Commerce | `docs/commerce/` | Reserved |
| Logistics | `docs/logistics/` | Reserved |
| Operations | `docs/operations/` | Reserved |
| Decisions | `docs/decisions/` | ADR 0001 accepted |
| Engineering system | `docs/engineering/` | **Present** — agent, git, workflow, handoff |
| Future VS Code verification | `docs/verification/` | Reserved; not active in Cursor |

## Agent and skill indexes

- Agents: `docs/engineering/agent-tree.md`
- Skills: `docs/engineering/skills-index.md`
- Handoff contract: `docs/engineering/handoff-contract.md`
- Workflow: `docs/engineering/workflow.md`
- Git: `docs/engineering/git-workflow.md`
- Cursor config inventory: `docs/engineering/cursor-configuration.md`

## Application commands

- Install: `npm ci`
- Develop: `npm start`
- Web: `npm run web`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test -- --runInBand`
- Web export: `npm run export:web`
- Full verification: `npm run verify`
