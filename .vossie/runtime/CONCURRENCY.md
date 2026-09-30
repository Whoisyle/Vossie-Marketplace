# Concurrency Protocol

Multiple Devin sessions may execute Vossie work simultaneously.

## Shared claims ref

Claims live on one shared coordination branch, `vossie/claims`, not on task branches. Task branches are isolated, so a claim committed only to a task branch is invisible to other sessions.

- `vossie/claims` contains only `.vossie/claims/<task-id>.<agent>.json` files (shape: `.vossie/templates/claim.json`).
- Atlas creates `vossie/claims` before assigning the first specialist task. If it does not exist, the specialist blocks and reports to Atlas.
- Nobody force-pushes, rebases or deletes history on `vossie/claims`.
- Claim files are never committed to task branches or the integration branch.

## Acquiring a claim

Before editing any file or contract:
1. `git fetch origin vossie/claims`
2. Read every claim with `status: ACTIVE` on `origin/vossie/claims`.
3. If any ACTIVE claim from another task overlaps your `owned_files_or_contracts`, stop and route the collision to Atlas.
4. Otherwise add your claim file with `status: ACTIVE` in a separate worktree based on `origin/vossie/claims`, commit it, and `git push origin HEAD:vossie/claims` (no force).
5. If the push is rejected as non-fast-forward, another session claimed concurrently: fetch again and repeat from step 2.
6. The claim is held only once the push succeeds. Do not start editing before that.

## Releasing a claim

When the handoff is written (or the task is blocked/cancelled), update your claim to `status: RELEASED` on `vossie/claims` using the same fetch → commit → non-force push loop.

## Other rules

1. Atlas assigns one owner and one isolated branch to each task.
2. Specialists read `project-state.json`; they do not modify it.
3. Specialists may commit/push only their assigned task branch, plus their own claim files on `vossie/claims`.
4. Handoff is written to `.vossie/handoffs/<task-id>/<agent>.json`.
5. Atlas validates the handoff and updates global state.
6. Atlas integrates accepted branches in dependency order.
7. Independent verifiers never modify implementation branches while verifying.

Stale claims are resolved by Atlas, not by another specialist guessing that the work is abandoned.
