# Branching Protocol

Protected branch:
- `main`

Atlas integration branches:
- `atlas/integration/<milestone-or-date>`

Specialist branches:
- `agent/<agent>/<task-id>-<slug>`

Examples:
- `agent/pixel/VOS-042-buyer-home`
- `agent/forge/VOS-043-orders-api`
- `agent/schema/VOS-044-order-schema`

Rules:
- No specialist works directly on `main`.
- Atlas assigns the branch and base SHA in the task brief.
- A specialist may push only its assigned branch for handoff.
- No force-push to another agent's active branch.
- No specialist opens the final integration PR.
- Atlas may cherry-pick, merge or otherwise integrate accepted isolated branches according to repository policy.
- Human performs the final protected-branch merge.
