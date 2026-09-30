# Concurrency Protocol

Multiple Devin sessions may execute Vossie work simultaneously.

1. Atlas assigns one owner and one isolated branch to each task.
2. Specialists read `project-state.json`; they do not modify it.
3. Before implementation, the specialist writes a claim file:
   `.vossie/claims/<task-id>.<agent>.json`
4. Claim files contain task id, agent, branch, scoped files/contracts, and status.
5. If another active claim overlaps the same files/contracts, stop and route the collision to Atlas.
6. Specialists may commit/push only their assigned branch.
7. Handoff is written to `.vossie/handoffs/<task-id>/<agent>.json`.
8. Atlas validates the handoff and updates global state.
9. Atlas integrates accepted branches in dependency order.
10. Independent verifiers never modify implementation branches while verifying.

Stale claims are resolved by Atlas, not by another specialist guessing that the work is abandoned.
