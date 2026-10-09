# Git / GitHub workflow

## Safety

- Do not force-push `main`.
- Do not merge to protected `main` from an agent unless the user explicitly requests it.
- Do not amend published commits.
- Do not commit `.env`, keys, tokens, or credential files.
- Do not run destructive Git commands unless the user explicitly asks.

## Branches

- `main` — protected default; keep it stable.
- Feature work: `feat/<short-topic>`, `fix/<short-topic>`, `docs/<short-topic>`, `chore/<short-topic>`.
- Keep branches short-lived. Prefer small logical commits over one giant commit.

## Commit prefixes

```
feat:        user-facing capability
fix:         bug fix
refactor:    no intended behaviour change
test:        tests only
docs:        documentation
chore:       tooling, agent infra, deps without product change
security:    security fix or hardening
```

Subject: imperative, ~72 characters. Body: why, not a file dump.

## Commit-ready vs committed

Guardian **PASS** + docs sync = **commit-ready**.

Commit and push only when the user asks. Prepare the message and file list anyway.

## Pull requests

Use `.github/PULL_REQUEST_TEMPLATE.md`. Do not auto-merge.

## Rollback awareness

- Prefer revert commits on shared branches.
- Record the failing commit SHA in Medic reports.

## This repository's remote

Configured origin (local `.git/config`): `https://github.com/Whoisyle/Vossie-Marketplace.git` on branch `main`.

Git CLI may be missing from PATH on Windows; Git is typically at `C:\Program Files\Git\cmd\git.exe`. `gh` was not available during bootstrap.

If GitHub authentication fails, keep working on repository-side files and report that push/PR creation remains to be connected.
