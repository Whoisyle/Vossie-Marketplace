# Vossie Marketplace

Campus marketplace engineering repository.

## Current status

This repository contains the engineering runtime and the approved universal Expo application foundation. The canonical product, screen, UI, and data specifications are still missing, so marketplace feature implementation remains blocked while the development shell is operational.

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
- [`src/app/`](src/app/) — Expo Router routes.
- [`src/screens/`](src/screens/) — product-neutral screen compositions.
- [`docs/decisions/0001-universal-expo-foundation.md`](docs/decisions/0001-universal-expo-foundation.md) — accepted stack decision.

Talk to **ATLAS** by default. Foundation engineering may proceed under ADR 0001; product work must wait until the canonical product specifications are recorded.

## Application setup

```powershell
npm ci
npm run web
```

Open the Metro URL in Chrome. For a physical iPhone using Expo Go, run `npm run start:go`. To use an installed Vossie development build, run `npm run start:dev-client` and connect that client to Metro. Apple's local iOS Simulator requires macOS; the `ios-simulator` EAS profile produces a compatible development build.

The EAS project is owned by [`paballokalis-team`](https://expo.dev/accounts/paballokalis-team/projects/vossie-marketplace). A simulator-targeted development build is available from [EAS build `a5cd58ce`](https://expo.dev/accounts/paballokalis-team/projects/vossie-marketplace/builds/a5cd58ce-1bda-4c96-8552-ee5fead49a15). Browser-streamed EAS Simulator access is not currently enabled for the team account; request access at <https://expo.dev/services/simulators> before attempting a remote iOS session.

Vossie does not use a local Android emulator. Remote iOS and Android development both use an EAS Simulator session connected to `npm run start:remote`; the same Metro tunnel and Fast Refresh loop serves either platform. The `android-remote` EAS profile produces the APK required by a remote Android session when that platform is requested. Do not start a remote session while the account availability check is false.

For the Appetize page, run `npm run update:appetize -- -BuildId <finished-ios-simulator-build-id>`. The helper validates the EAS artifact is the Vossie iOS Simulator build before updating the existing Appetize app. `APPETIZE_API_TOKEN` must remain in the ignored local `.env` file or process environment.

Each supplied page is decomposed and scaffolded with `npm run scaffold:page -- -PageName <name> -AssetName "asset one,asset two"`; see [`docs/engineering/page-build-loop.md`](docs/engineering/page-build-loop.md) for the complete Chrome/Appetize verification loop and page-local asset convention.

Before handoff:

```powershell
npm run verify
```

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
2. Product-domain and production data decisions.

The frontend, package manager, and delivery foundation are approved by ADR 0001. Do not invent the remaining product decisions in application code.
