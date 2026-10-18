# Architecture documentation

Place approved Vossie architecture specifications here (system boundaries, data flow, adapters, deployment).

## Current decisions and drafts

- [`application-foundation.md`](application-foundation.md) — approved universal Expo/Supabase foundation.
- [`backend.md`](backend.md) � implemented Supabase schema, security model, order lifecycle, Edge Functions and what is deliberately not built. Tested locally; not yet applied to a project.
- [`marketplace-mvp-backend-contracts.md`](marketplace-mvp-backend-contracts.md) — working draft of typed Supabase service contracts for the owner-selected MVP. No schema changes, migrations, or production implementation are authorized by the draft.

Do not invent a different architecture. Product-domain and production data architecture remain pending until open decisions are approved. Document implementation here rather than duplicating it in agent prompts.
