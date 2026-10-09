# Cursor configuration inventory

Created during engineering bootstrap. Cursor-supported project mechanisms only.

## Project rules — `.cursor/rules/*.mdc`

| File | Apply |
|------|--------|
| `atlas-orchestrator.mdc` | always |
| `shared-engineering-rules.mdc` | always |
| `source-of-truth.mdc` | always |
| `git-and-secrets.mdc` | always |

## Subagents — `.cursor/agents/*.md`

YAML frontmatter: `name`, `description`, `model`, `readonly`, `is_background`.

Agents: `atlas`, `pixel`, `forge`, `schema`, `market`, `relay`, `bridge`, `kinetic`, `guardian`, `medic`.

Guardian is **not** `readonly` so it can run tests; it still must not "approve" by rewriting product code to hide failures.

## Skills — `.cursor/skills/<name>/SKILL.md`

See `docs/engineering/skills-index.md`.

## Commands — `.cursor/commands/*.md`

Plain markdown, no frontmatter. Invoke with `/name`.

| Command | Purpose |
|---------|---------|
| `/atlas-plan` | Decompose a request into handoffs |
| `/guardian-review` | Independent quality gate |
| `/medic-recover` | Diagnose and repair a failure |
| `/prepare-pr` | PR-ready summary without merging |

## Not used

- Legacy `.cursorrules` (deprecated)
- Invented file formats
- Cursor user-global agents (`~/.cursor/agents/`) — project agents are in-repo

## Codex

Identical agent prompts: `.codex/agents/`. Notes: `.codex/README.md`. Root `AGENTS.md` is the shared contract.
