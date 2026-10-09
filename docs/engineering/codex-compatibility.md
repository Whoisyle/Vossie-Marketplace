# Codex compatibility

Cursor and Codex must share one contract:

1. Root `AGENTS.md` — always read.
2. `docs/INDEX.md` — knowledge map and precedence.
3. `docs/engineering/*` — workflow, handoff, git.
4. Specialist prompts — **canonical** in `.cursor/agents/`; **mirrors** in `.codex/agents/` with the same filenames and body. If they ever differ, treat `.cursor/agents/` as canonical and resync.

Do not add Codex-only product rules that contradict AGENTS.md.

Optional Codex user config is out of this repository. Connect Codex to this repo when you use it; no Codex login was configured during bootstrap.
