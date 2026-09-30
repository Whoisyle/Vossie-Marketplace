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
2. Exclude DONE/CANCELLED/INTEGRATED tasks.
3. Prefer explicit ASSIGNED tasks over READY tasks.
4. Prefer lower numeric `priority`.
5. Prefer older `created_at`.
6. If no eligible task remains, return `NO_ASSIGNED_WORK`.

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
