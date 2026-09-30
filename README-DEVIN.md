# Vossie Devin Multi-Agent Runtime

This folder is designed to be copied directly into the **root of the Vossie repository**.

Do **not** copy the enclosing `Vossie-Devin-Multi-Agent-Runtime` folder as a nested project unless you intentionally want that. The repository root should end up containing:

- `AGENTS.md`
- `AGENT-CONTRACTS.md`
- `project-state.json`
- `.agents/skills/...`
- `.vossie/...`
- `scripts/validate_agent_system.py`

It does not overwrite your existing application `README.md`.

## Install

1. Extract this ZIP.
2. Copy **all contents**, including the hidden `.agents` and `.vossie` folders, into the root of `Whoisyle/Vossie-Marketplace`.
3. Commit the files.
4. Connect that repository to Devin.
5. Start the first Devin session with:

   `run Atlas`

6. Atlas should inspect the repository/specs, catalog canonical references, create the initial dependency/task graph and assign specialist tasks.
7. Then open additional Devin sessions as needed:
   - `run Pixel`
   - `run Forge`
   - `run Schema`
   - `run Market`
   - etc.

A specialist with no assigned task must return `NO_ASSIGNED_WORK` rather than inventing work.

## Recommended first Atlas instruction

After installation, use:

`run Atlas. Initialize Vossie from the repository and canonical project specifications. Build the dependency graph and assign the first safe parallel tasks. Do not change approved product scope. Continue until blocked by a human-only decision.`

## Important

The runtime is deliberately repository-native. Product specifications should remain separate canonical documents. Atlas references only the portions required by each task instead of copying the whole 177-screen specification into every agent session.

Final protected-branch merge remains human.
