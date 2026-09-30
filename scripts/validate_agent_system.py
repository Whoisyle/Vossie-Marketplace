#!/usr/bin/env python3
from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / ".vossie" / "agent-registry.json"
STATE = ROOT / "project-state.json"

errors = []

try:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
except Exception as e:
    print(f"ERROR: cannot read registry: {e}")
    sys.exit(1)

try:
    state = json.loads(STATE.read_text(encoding="utf-8"))
except Exception as e:
    print(f"ERROR: cannot read project-state.json: {e}")
    sys.exit(1)

ids = [a["id"] for a in registry["agents"]]
if len(ids) != 21:
    errors.append(f"expected 21 agents, found {len(ids)}")

if len(ids) != len(set(ids)):
    errors.append("duplicate agent ids in registry")

for agent in registry["agents"]:
    aid = agent["id"]
    p = ROOT / agent["skill_path"]
    if not p.exists():
        errors.append(f"missing skill: {p}")
        continue
    text = p.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        errors.append(f"{aid}: missing YAML frontmatter")
        continue
    fm = m.group(1)
    if f"name: {aid}" not in fm:
        errors.append(f"{aid}: frontmatter name mismatch")
    if "description:" not in fm:
        errors.append(f"{aid}: missing description")
    if f"`run {aid.capitalize()}`" not in text:
        errors.append(f"{aid}: missing native invocation")

state_ids = set(state.get("agents", {}).keys())
if state_ids != set(ids):
    errors.append("project-state agents do not match registry")

required = [
    ROOT / "AGENTS.md",
    ROOT / "AGENT-CONTRACTS.md",
    ROOT / ".vossie" / "runtime" / "CONCURRENCY.md",
    ROOT / ".vossie" / "runtime" / "TASK-PROTOCOL.md",
    ROOT / ".vossie" / "runtime" / "BRANCHING.md",
    ROOT / ".vossie" / "runtime" / "VERIFICATION.md",
]
for p in required:
    if not p.exists():
        errors.append(f"missing required runtime file: {p}")

if errors:
    print("Vossie agent system validation FAILED:")
    for e in errors:
        print(f" - {e}")
    sys.exit(1)

print("Vossie agent system validation PASSED")
print(f"Registered agents: {len(ids)}")
print("Atlas is the global state writer and integration coordinator.")
print("Human remains final protected-branch merge authority.")
