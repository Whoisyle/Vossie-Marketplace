param(
  [Parameter(Mandatory = $true)]
  [string]$BuildId,

  [string]$PublicKey = "b_zvawgy7krvmyy52lldy5iwv6ry",

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Get-LocalEnvValue([string]$Name) {
  $envPath = Join-Path $projectRoot ".env"
  if (-not (Test-Path -LiteralPath $envPath)) { return $null }
  $line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if ($line -and $line -match "^\s*$Name\s*=\s*(.*)\s*$") { return $Matches[1].Trim().Trim('"').Trim("'") }
  return $null
}

$stderrPath = [System.IO.Path]::GetTempFileName()
try {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $raw = npx --yes eas-cli@latest build:view $BuildId --json 2>$stderrPath
  $easExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($easExitCode -ne 0) {
    $details = (Get-Content -LiteralPath $stderrPath -Raw).Trim()
    throw "EAS build lookup failed with exit code $easExitCode. $details"
  }
  $build = (($raw -join [Environment]::NewLine) | ConvertFrom-Json)
} finally {
  if ($null -ne $previousErrorActionPreference) { $ErrorActionPreference = $previousErrorActionPreference }
  Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
}

if ($build.status -ne "FINISHED") { throw "EAS build $BuildId is not finished." }
if ($build.platform -ne "IOS" -or $build.isForIosSimulator -ne $true) { throw "EAS build $BuildId is not an iOS Simulator build." }
if ($build.appIdentifier -ne "za.co.vossie.marketplace") { throw "EAS build $BuildId is not the Vossie app bundle." }
if ([string]::IsNullOrWhiteSpace($build.artifacts.buildUrl)) { throw "EAS build $BuildId has no downloadable artifact." }

if ($DryRun) {
  [pscustomobject]@{
    dryRun = $true
    buildId = $BuildId
    status = $build.status
    platform = $build.platform
    simulator = $build.isForIosSimulator
    appIdentifier = $build.appIdentifier
    artifactHost = ([uri]$build.artifacts.buildUrl).Host
  }
  exit 0
}

$apiKey = $env:APPETIZE_API_TOKEN
if ([string]::IsNullOrWhiteSpace($apiKey)) { $apiKey = Get-LocalEnvValue "APPETIZE_API_TOKEN" }
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "APPETIZE_API_TOKEN is required in the environment or the ignored project .env file."
}

$payload = @{
  url      = $build.artifacts.buildUrl
  platform = "ios"
  fileType = "tar.gz"
  note     = "Vossie Marketplace build $BuildId"
} | ConvertTo-Json

$result = Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.appetize.io/v1/apps/$PublicKey" `
  -Headers @{ "X-API-KEY" = $apiKey } `
  -ContentType "application/json" `
  -Body $payload

[pscustomobject]@{
  publicKey  = $result.publicKey
  platform   = $result.platform
  versionCode = $result.versionCode
  updated    = $result.updated
}
