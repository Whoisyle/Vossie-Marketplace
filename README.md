# Vossie Marketplace

Campus marketplace engineering repository.

## Current status

This repository currently contains the engineering and multi-agent runtime foundation. The Vossie application source and approved canonical product, architecture, UI, and data specifications are not present yet, so the project remains blocked for product implementation.

The intended product has two connected areas:

- Vossie Marketplace: Buyer, Seller, and Courier workflows.
- Vossie Operations: campus hubs, transfers, incubation, staff workflows, and administration.

## Repository map

- [`AGENTS.md`](AGENTS.md) — shared engineering contract.
- [`AGENT-CONTRACTS.md`](AGENT-CONTRACTS.md) — agent ownership and handoff rules.
- [`docs/INDEX.md`](docs/INDEX.md) — source-of-truth precedence and knowledge map.
- [`.cursor/`](.cursor/) — Cursor agents, rules, skills, and commands.
- [`.codex/`](.codex/) — Codex mirrors of the Cursor agent prompts.
- [`.agents/`](.agents/) — build, verification, and safety runtime skills.
- [`.vossie/`](.vossie/) — task, branching, concurrency, handoff, and verification state.
- [`.gemini/jev-mcp/`](.gemini/jev-mcp/) — local Jev MCP decision layer.

Talk to **ATLAS** by default. Product work must wait until the canonical specifications and technology decisions are recorded in the repository.

## Jev setup

From the repository root:

```powershell
cd .gemini/jev-mcp
npm install
npm run build
npm test
```

Configure the API key in a local, untracked `.env` file or the current PowerShell session:

```powershell
$env:JEV_API_KEY = "your-typesafe-api-key"
```

The Gemini MCP configuration uses the built files under `.gemini/jev-mcp/dist/`. The safety hook code is present but not registered or enabled, so it does not automatically intercept commands. Generated output and dependencies are intentionally ignored by Git.

See [`docs/JEV_AGENT_ARCHITECTURE.md`](docs/JEV_AGENT_ARCHITECTURE.md) for routing, approval, validation, fallback, and troubleshooting details.

## Current blockers

The project state remains `BLOCKED` because the repository still needs:

1. The canonical product/screen specification package.
2. Approved architecture and data decisions.
3. Confirmation of the frontend, package manager, hosting, and deployment stack.

Do not invent those decisions in application code.
