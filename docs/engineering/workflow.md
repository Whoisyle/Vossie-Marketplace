# Default Cursor workflow

```
USER
  ↓
ATLAS
  ↓
Task decomposition
  ↓
Specialist agent(s)
  ↓
Implementation
  ↓
GUARDIAN
  ↓
PASS?
  YES → prepare Git checkpoint (commit-ready; commit only if user asked)
  NO  → MEDIC
           ↓
        Diagnose
           ↓
        Repair (when authorized by this workflow)
           ↓
        GUARDIAN RECHECK
  ↓
Documentation synchronization
  ↓
Commit-ready state
```

## Atlas rules for this flow

- Inspect `docs/INDEX.md` and relevant code before splitting work.
- Assign one owner per task. Cross-cutting work may list a **lead** plus collaborators.
- Specialists must stay inside `FILES/AREAS ALLOWED`.
- After implementation, **always** request Guardian. Atlas must not self-approve.
- Guardian FAIL or NEEDS_REPAIR → Medic, then Guardian recheck.
- Do not mark complete until Guardian **PASS**.
- Do not push destructive Git operations. Do not merge to protected `main`.

## Parallelism

Independent specialists may run in parallel. Do not parallelize conflicting file sets.
