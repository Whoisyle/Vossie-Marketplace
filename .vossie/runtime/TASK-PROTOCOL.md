# Task Protocol

## Status lifecycle

`PLANNED → READY → ASSIGNED → IN_PROGRESS → HANDOFF_READY → REVIEW → VERIFICATION → ACCEPTED → INTEGRATED → DONE`

Alternate states:
- `BLOCKED`
- `RETURNED`
- `REJECTED`
- `CANCELLED`

Only Atlas updates global lifecycle state in `project-state.json`.

## Deterministic task selection for a specialist

When `run <Agent>` is used without a specific task id:
1. Filter to tasks where `owner_agent` matches the selected agent.
2. Keep only executable statuses: `ASSIGNED` and `READY`. All other statuses (`PLANNED`, `BLOCKED`, `IN_PROGRESS`, `HANDOFF_READY`, `REVIEW`, `VERIFICATION`, `ACCEPTED`, `INTEGRATED`, `DONE`, `RETURNED`, `REJECTED`, `CANCELLED`) are not eligible for automatic selection.
3. Keep only tasks whose `dependencies` are all satisfied:
   - a task dependency is satisfied when that task is `INTEGRATED` or `DONE`, because only then is its code on the dependent task's base. An `ACCEPTED` dependency counts only if Atlas set the dependent task's `base_branch`/`base_sha` to a commit that already contains it and lists it in the task's `base_includes`;
   - a decision dependency (`DEC-*`) is satisfied when its `decisions_required` entry has `status: RESOLVED`.
4. Prefer `ASSIGNED` tasks over `READY` tasks.
5. Prefer lower numeric `priority`.
6. Prefer older `created_at`.
7. If no eligible task remains, return `NO_ASSIGNED_WORK`.

## Explicit recovery

- `IN_PROGRESS` and `RETURNED` tasks are resumed only when the task id is named explicitly (for example `run Pixel VOS-042`) or after Atlas moves the task back to `ASSIGNED`.
- A specialist never resumes a `BLOCKED` task; Atlas must first clear the blocker and move it to `ASSIGNED`.

## Atlas re-evaluation of blocked work

Because Atlas is the global state writer, on every `run Atlas` it re-evaluates Atlas-owned and specialist `BLOCKED` tasks before task selection:

1. Reconcile blockers first. For each `OPEN` blocker, Atlas marks it `RESOLVED` (with a short `resolution`) when every `decisions_required` entry whose `blocks` lists it is `RESOLVED` and Atlas has confirmed the blocker's condition is cleared in the repository (for example, the missing specification is now committed or linked). Otherwise it stays `OPEN`.
2. A `BLOCKED` task moves to `ASSIGNED` when all its `dependencies` are satisfied (per the rules above) and every `blocked_by` entry has `status: RESOLVED` in `blockers`.
3. Atlas then applies the selection rules to its own tasks.

## Task brief minimum fields

- task_id
- owner_agent
- objective
- dependencies
- canonical_refs
- allowed_scope
- forbidden_scope
- base_branch
- base_sha
- branch
- acceptance_criteria
- required_checks
- handoff_path

A specialist must not fill in a missing business rule by assumption.
