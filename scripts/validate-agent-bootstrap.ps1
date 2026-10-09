#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$failures = @()

function Require-Path($p) {
  if (-not (Test-Path (Join-Path $root $p))) { $script:failures += "missing: $p" }
}

Require-Path "AGENTS.md"
Require-Path "docs/INDEX.md"
Require-Path "docs/engineering/handoff-contract.md"
Require-Path "docs/engineering/workflow.md"
Require-Path "docs/engineering/git-workflow.md"
Require-Path "docs/engineering/skills-index.md"
Require-Path "docs/verification/README.md"
Require-Path ".cursor/rules/atlas-orchestrator.mdc"
Require-Path ".cursor/rules/shared-engineering-rules.mdc"
Require-Path ".github/PULL_REQUEST_TEMPLATE.md"

$agents = @("atlas","pixel","forge","schema","market","relay","bridge","kinetic","guardian","medic")
foreach ($a in $agents) {
  Require-Path ".cursor/agents/$a.md"
  Require-Path ".codex/agents/$a.md"
}

$skills = @(
  "repository-navigation","architecture-analysis","feature-implementation","frontend-implementation",
  "backend-implementation","database-migration","api-creation","figma-implementation","responsive-ui",
  "accessibility-review","motion-implementation","authentication","authorization-rbac","payment-architecture",
  "marketplace-domain","buyer-requests","marketplace-reels","courier-logistics","qr-custody","otp-delivery",
  "campus-hubs","cross-campus-transfers","notifications","testing","debugging","security-review",
  "performance-review","documentation","git-workflow","pull-request-preparation","release-verification"
)
foreach ($s in $skills) { Require-Path ".cursor/skills/$s/SKILL.md" }

$future = @("sentinel","lens","aegis","vector","pulse","vault","resolver","watchtower")
foreach ($f in $future) { Require-Path "docs/verification/agents/$f.md" }

# Cursor must not load future VS Code agents
foreach ($f in $future) {
  if (Test-Path (Join-Path $root ".cursor/agents/$f.md")) {
    $failures += "future agent leaked into Cursor: $f"
  }
}

if ($failures.Count -gt 0) {
  Write-Host "FAIL"
  $failures | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "PASS: agent bootstrap files present ($($agents.Count) Cursor agents, $($skills.Count) skills)."
exit 0
