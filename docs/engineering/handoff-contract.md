# Task handoff contract

Use this format for every delegated task. Subagents start with empty context — include everything they need.

## Delegation (Atlas → specialist)

```
TASK ID: VOS-YYYYMMDD-NNN
OWNER: pixel | forge | schema | market | relay | bridge | kinetic | guardian | medic
OBJECTIVE: one sentence
CONTEXT: why, user intent, relevant docs (paths), locked decisions
FILES/AREAS ALLOWED: globs or directory list; do not edit outside this set without Atlas
DEPENDENCIES: task ids or "none"
ACCEPTANCE CRITERIA:
- ...
TESTS REQUIRED:
- ... (or "none yet — no test runner in repo")
SECURITY CONSIDERATIONS:
- ...
DOCUMENTATION IMPACT:
- none | paths to update
STATUS: assigned | blocked | in_progress
```

## Completion report (specialist → Atlas)

```
TASK ID: VOS-...
STATUS: implemented | blocked | failed
FILES CHANGED:
- path — what changed
IMPLEMENTATION SUMMARY: short factual summary
TESTS RUN: commands
TEST RESULTS: pass/fail/skipped with reason (never fabricate)
KNOWN LIMITATIONS:
- ...
FOLLOW-UP REQUIRED:
- ...
```

## Guardian verdict

```
TASK ID: VOS-...
VERDICT: PASS | FAIL | NEEDS_REPAIR
CHECKS PERFORMED:
- ...
FINDINGS:
- ...
REQUIRED REPAIRS: (if not PASS)
```

## Medic report

```
TASK ID: VOS-... (or new id for the failure)
FAILURE: what failed
REPRODUCTION: how
ROOT CAUSE: cause, not symptom
REPAIR: what was changed
REGRESSION CHECKS: what was re-run
```
