param(
  [Parameter(Mandatory = $true)]
  [string]$PageName,

  [string]$AssetName = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Convert-ToSlug([string]$Value, [string]$Label = "value") {
  $slug = $Value.Trim().ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { throw "$Label must contain at least one letter or number." }
  return $slug
}

$pageSlug = Convert-ToSlug $PageName "PageName"
$assetNames = @($AssetName -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
$assetSlugs = @($assetNames | ForEach-Object { Convert-ToSlug $_ "AssetName" } | Select-Object -Unique)
$screenRoot = Join-Path $projectRoot "src\screens\$pageSlug"
$assetsRoot = Join-Path $screenRoot "assets"
New-Item -ItemType Directory -Force -Path $assetsRoot | Out-Null

$readmePath = Join-Path $screenRoot "README.md"
if (-not (Test-Path -LiteralPath $readmePath)) {
  @("# $pageSlug", "", "Page-specific implementation and assets live here.", "") |
    Set-Content -LiteralPath $readmePath -Encoding utf8
}

foreach ($assetSlug in $assetSlugs) {
  $assetFolder = Join-Path $assetsRoot $assetSlug
  New-Item -ItemType Directory -Force -Path $assetFolder | Out-Null
  $placeholder = Join-Path $assetFolder ".gitkeep"
  if (-not (Test-Path -LiteralPath $placeholder)) { New-Item -ItemType File -Path $placeholder | Out-Null }
}

[pscustomobject]@{
  page = $pageSlug
  screenRoot = $screenRoot
  assetsRoot = $assetsRoot
  assets = $assetSlugs
}
