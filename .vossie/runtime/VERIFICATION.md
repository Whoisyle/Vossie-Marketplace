# Independent Verification Protocol

1. Build agent finishes assigned work and hands off to Atlas.
2. Atlas validates the handoff.
3. Guardian performs build-team architecture/quality review.
4. If Guardian finds defects, work returns to the owner or Medic.
5. When build review is ready, Atlas hands the candidate to Sentinel.
6. Sentinel creates a verification matrix and routes independent checks.
7. Independent verifiers write findings/evidence under `.vossie/verification/`.
8. Failed findings return through Atlas to the responsible build agent/Medic.
9. The same relevant independent verifier retests the remediation.
10. Resolver runs final regression when required findings are resolved.
11. Atlas packages release evidence and prepares the PR.
12. Human decides whether to merge/release.

A verifier finding may only move to PASS/CLOSED when the verifier's own retest evidence supports it.
