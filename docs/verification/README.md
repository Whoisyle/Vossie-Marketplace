# Future VS Code verification layer

Cursor is the **first** engineering layer. A second, independent agent system is reserved for VS Code. **Do not activate these agents in Cursor.** They must be able to review the same repository later without depending on Cursor subagents.

## Reserved architecture

```
SENTINEL — Lead Independent Verification Orchestrator
  LENS      — Code quality / architecture review
  AEGIS     — Security review
  VECTOR    — Test / integration review
  PULSE     — Performance / reliability review
  VAULT     — Secrets / dependency / configuration review
  RESOLVER  — Independent repair / escalation
  WATCHTOWER — Final verification / release readiness
```

Role stubs: `docs/verification/agents/`.

## Independence rules

- Cursor agents must not delete, lock, or encode "Cursor-only truth" that would block Sentinel.
- Verification agents should prefer `AGENTS.md`, `docs/`, tests, and git history over Cursor chat logs.
- RESOLVER must not silently accept Guardian PASS; it re-derives conclusions.
- No Cursor `.cursor/agents/` files are created for Sentinel's crew, so they do not appear in the Cursor Task picker.

## When to build this layer

Only when VS Code agent configuration is chosen (Copilot custom agents, Continue, Aider, etc.). Until then, keep stubs in `docs/verification/` only.
