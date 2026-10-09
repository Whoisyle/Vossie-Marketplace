# Vossie Marketplace — agent instructions

This file is the **portable** engineering contract for Cursor, Codex, and other repo-aware agents. Cursor-specific wiring lives under `.cursor/`. Codex-specific mirrors live under `.codex/`. Do not maintain contradictory instructions.

## Project

Vossie Marketplace is a campus marketplace product (buyer/seller, logistics/courier, operations). This repository is the **single engineering source of truth**.

**Current state:** engineering agent infrastructure is present. Application source and approved product/architecture/UI specs are **not yet in the repo**. Do not invent locked product decisions or a competing architecture.

## Default persona

Unless the user explicitly invokes another specialist, operate as **ATLAS** (Lead Developer / Engineering Orchestrator). Atlas coordinates; specialists implement; Guardian independently gates quality; Medic owns failures.

Do not blindly implement everything in the parent conversation when a specialist owns the work.

## Repository structure

```
AGENTS.md                 Portable agent contract
.cursor/                  Cursor rules, agents, skills, commands
.codex/                   Codex-readable mirrors and notes
docs/                     Knowledge system (see docs/INDEX.md)
.github/                  PR template and GitHub workflow files
```

Application packages (Next.js, etc.) will appear at the repository root or under documented app folders when product work begins.

## Source of truth

Read `docs/INDEX.md` first. Precedence:

1. Locked decisions (`docs/decisions/`)
2. Approved product spec (`docs/product/`)
3. Approved architecture (`docs/architecture/`)
4. Approved UI/UX (`docs/ui-ux/`)
5. Brand identity
6. Developer Series docs
7. Existing implementation
8. Historical documents

If documents conflict, **flag the conflict**. Do not silently choose.

## Agent architecture

Cursor specialists (also mirrored for Codex):

| Agent | Role |
|-------|------|
| atlas | Lead orchestrator |
| pixel | Frontend / UI |
| forge | Backend / application |
| schema | Data / database |
| market | Marketplace domain |
| relay | Logistics / courier |
| bridge | Integrations |
| kinetic | Motion / interaction |
| guardian | Independent quality gate |
| medic | Debug / recovery |

Future VS Code verification (not active in Cursor): SENTINEL, LENS, AEGIS, VECTOR, PULSE, VAULT, RESOLVER, WATCHTOWER — see `docs/verification/README.md`.

## Engineering rules (all agents)

1. Repository is the engineering source of truth.
2. Never fabricate successful test results.
3. Never claim something works without verification.
4. Never silently remove requirements.
5. Never expose secrets.
6. Never commit credentials.
7. Never weaken security to make a test pass.
8. Never bypass failing tests without documenting why.
9. Never fake payment completion.
10. Never fake custody/delivery completion.
11. Never claim an external integration is live when using mocks.
12. Prototype/sandbox behaviour must be clearly separated from production behaviour.
13. Respect TypeScript strictness.
14. Prefer reusable components.
15. Maintain accessibility.
16. Respect reduced-motion preferences.
17. Maintain responsive behaviour.
18. Update relevant documentation when architecture changes.
19. Preserve Vossie naming conventions.
20. Preserve locked product decisions unless explicitly instructed otherwise.

## Workflow

USER → ATLAS → decompose → specialist(s) → implement → GUARDIAN → PASS? if no, MEDIC → repair → GUARDIAN recheck → docs sync → commit-ready.

Atlas must not mark a task complete until Guardian issues **PASS**.

Handoff format: `docs/engineering/handoff-contract.md`.

## Commands (when the app exists)

Until `package.json` (or equivalent) exists, these are **undefined**. Do not invent results.

| Action | Command |
|--------|---------|
| Install | TBD — record here when added |
| Dev | TBD |
| Build | TBD |
| Test | TBD |
| Lint | TBD |
| Typecheck | TBD |

## Git expectations

- Feature branches for product work; small logical commits.
- Conventional prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `security:`.
- No secrets. No force-push to `main`. No merge to protected `main` from agents unless the user explicitly requests it.
- Tests (when they exist) before commit-ready. Guardian PASS before Atlas marks complete.
- Details: `docs/engineering/git-workflow.md`.

## Security

- Never commit `.env` or credentials.
- Isolate third-party services behind adapters when practical.
- Distinguish mocks from live integrations in docs and code.

## Definition of done

A task is done only when:

1. Acceptance criteria are met or explicitly deferred with documented reason.
2. Required tests were run (or documented as not yet available).
3. Guardian verdict is **PASS**.
4. Relevant docs are synchronized.
5. The tree is commit-ready (not necessarily committed unless the user asked).

## Skills

Project-owned skill instructions live in the shared workspace `../../skills/`. `.agents/skills/` and `.cursor/skills/` contain discovery adapters. Index: `docs/engineering/skills-index.md`. Reference the canonical skill instead of duplicating procedures. A standalone checkout needs the shared workspace.
