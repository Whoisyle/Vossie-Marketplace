# VOSSIE MULTI-AGENT RUNTIME

This repository uses the approved Vossie multi-agent engineering system.

## Session bootstrap

At the beginning of every Devin session:

1. Read this file.
2. Read `AGENT-CONTRACTS.md`.
3. Read `.vossie/agent-registry.json`.
4. If the user's first command is `run <AgentName>`, treat it as a **role-selection command**, not a request to describe the agent.
5. Load `.agents/skills/<agentname-lowercase>/SKILL.md`.
6. Remain in that role for the session unless the human explicitly selects another registered agent.

Examples:
- `run Atlas`
- `run Pixel`
- `run Forge`
- `run Schema`
- `run Sentinel`

## Authority model

Atlas is Vossie's authoritative orchestration and integration coordinator.

Normal build flow:

**Human → Atlas → Domain Build Agents → Guardian → Independent Verification → Atlas → GitHub PR → Human merge**

Specialist sessions may execute concurrently, but they only execute work explicitly assigned to them.

If a selected specialist has no eligible assigned task in `project-state.json`, it must return:

`NO_ASSIGNED_WORK`

It must not invent a task.

## Source-of-truth order

When instructions conflict, use this order:

1. Explicit current human decision.
2. Canonical Vossie specifications referenced by the active task.
3. Repository implementation/contracts that are already approved.
4. `project-state.json` task assignment and dependency state.
5. Agent skill instructions.
6. Reasonable engineering defaults.

Never use a lower-ranked source to silently override a higher-ranked source.

## Global state

`project-state.json` is the compact orchestration source of truth.

**Atlas is the only normal writer of global orchestration state.**

Specialists and verifiers consume assigned state and write:
- claims under `.vossie/claims/`
- handoffs under `.vossie/handoffs/`
- independent findings/evidence under `.vossie/verification/`

They do not rewrite task ownership/status globally.

## Concurrency

Multiple Devin sessions may work against this repository at the same time.

Rules:
- Never work directly on `main`.
- Atlas assigns isolated task branches.
- Branch pattern: `agent/<agent>/<task-id>-<slug>`.
- Atlas integration branches use `atlas/integration/<milestone-or-date>`.
- A specialist may commit/push only its assigned isolated task branch for cross-session handoff.
- Specialists never merge protected branches or open the final integration PR.
- Do not force-push another agent's branch.
- Do not edit another active task's owned files/contracts without Atlas resolving the collision.
- Use `.vossie/claims/` and task scopes to avoid hidden overlap.

## Vossie architecture context

Vossie contains:
- Marketplace: Buyer, Seller, Courier.
- Operations: Campus Hub, Transfers, Incubation, Admin/Operations.
- Cross-cutting: Access/Auth, Shared/Account, approved Extensions.

The approved screen map totals 177 screens:
- Access/Auth: 12
- Shared/Account: 24
- Buyer: 41
- Seller: 25
- Courier: 14
- Campus Hub: 8
- Transfers: 9
- Incubation: 12
- Operations: 17
- Extensions: 15

Treat this as navigation context, not a substitute for the canonical screen specifications.

The architecture target is an adaptive single-deployment PWA unless superseded by a newer approved repository decision. One URL/app platform shares authentication, backend state, APIs, data and realtime events. Phone is mobile-first for Buyer/Seller/Courier, tablet adapts, and desktop supports Seller Studio/Hub/Incubation/Admin.

## Human-only decisions

Escalate rather than silently deciding:
- product-scope changes
- major architecture changes
- business-significant security-policy changes
- destructive or irreversible data/infrastructure operations
- provider/contract choices not already approved
- final production release authorization
- final protected-branch merge

## Verification independence

Guardian is a build-team reviewer and is not independent verification.

Independent verification is coordinated by Sentinel and performed by Lens, Aegis, Vector, Pulse, Vault, Harbor and Watchtower. Resolver performs final independent regression/release-readiness verification.

Independent verifier findings are evidence. Atlas, Guardian and implementation agents may not rewrite a failed finding into a pass. The responsible build agent or Medic remediates; the relevant independent verifier retests.

## Context discipline

Do not load the full Vossie specification package by default. Use the active task's `canonical_refs` and affected code. Keep handoffs structured and concise.

## Autonomous continuation

Continue autonomously within the selected agent's approved task and ownership until:
- the task is complete, or
- a defined stop condition is reached.

Do not stop merely to narrate progress.
