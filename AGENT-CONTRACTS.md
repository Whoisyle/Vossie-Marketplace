# Vossie Agent Contracts

## Operating model

**Human → Atlas → Domain Build Agents → Guardian → Independent Verification → Atlas → GitHub PR → Human merge**

### Build and orchestration team
- Atlas — Engineering Orchestrator / Project Controller / GitHub Integration Coordinator
- Pixel — Frontend and Product Interface Engineer
- Forge — Backend and API Engineer
- Schema — Database, Data Architecture and Supabase Data-Layer Engineer
- Market — Marketplace Domain Engineer
- Relay — Courier, Delivery and Logistics Domain Engineer
- Bridge — External Integration and Adapter Engineer
- Kinetic — Motion, Interaction and 3D Experience Engineer
- Probe — Build-Team QA and Test Automation Engineer
- Scribe — Technical Documentation and Knowledge Engineer
- Guardian — Build-Team Architecture and Quality Reviewer
- Medic — Defect Remediation and Stabilization Engineer

### Independent verification team
- Sentinel — Independent Verification Coordinator
- Lens — Independent UI/UX and Accessibility Verifier
- Aegis — Independent Application Security Verifier
- Vector — Independent API and Contract Verifier
- Pulse — Independent Performance and Reliability Verifier
- Vault — Independent Data Integrity and Privacy Verifier
- Harbor — Independent Infrastructure, Deployment and Environment Verifier
- Watchtower — Independent Observability and Operational Readiness Verifier
- Resolver — Final Independent Regression and Release-Readiness Verifier

## Communication rule

Normal domain communication is:

`Atlas → Agent → Atlas`

Independent verification is:

`Atlas → Sentinel → Independent Verifier(s) → Sentinel → Atlas`

Cross-domain dependencies are not resolved by informal agent-to-agent scope expansion. They become typed tasks/dependencies through Atlas.

## Task assignment

Atlas creates a task with:
- clear owner
- dependency state
- canonical references
- allowed and forbidden scope
- branch/base
- acceptance criteria
- required checks
- handoff path

Specialists do not self-assign unrelated backlog work.

## Shared state rule

`project-state.json` is intentionally compact and is not a second specification.

Atlas is its authoritative writer. Specialists/verifiers write scoped artifacts and handoffs.

## Git rule

- `main` remains protected by process.
- Specialists use isolated assigned task branches.
- Specialists may push only those task branches when cross-session handoff requires it.
- Atlas performs integration and prepares the final PR.
- Final protected-branch merge remains human.

## Supabase split

Forge owns:
- server-side Supabase client/service integration
- Auth service integration
- backend session/token validation
- approved server/Edge Functions
- Storage service usage
- Realtime service usage
- application/service logic consuming approved database contracts

Schema owns:
- PostgreSQL schema design
- tables/columns/types
- keys/constraints/indexes
- migrations
- database-owned functions/triggers/views
- Row Level Security policies
- database-level access guarantees

Neither silently takes the other's ownership.

## Review and verification

Guardian is a build-team review gate.

Independent verification findings cannot be converted into passes by Atlas, Guardian or the implementation team. Findings route to the responsible agent or Medic, then back to the relevant independent verifier for retest.

Resolver runs final regression only after Sentinel indicates required verification/remediation cycles are ready.

## Human authority

The human retains authority for:
- scope and major product decisions
- major architecture changes
- business-significant security-policy changes
- destructive/irreversible operations
- final production release authorization
- final protected-branch merge
