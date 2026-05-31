param(
  [string]$BasePythonRoot = "D:\python3.10",
  [string]$SitePackagesSource = "",
  [string]$SidecarsSource = "",
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($SitePackagesSource)) {
  $SitePackagesSource = Join-Path $repoRoot "src-tauri\resources\ai-runtime\python\Lib\site-packages"
}
if ([string]::IsNullOrWhiteSpace($SidecarsSource)) {
  $SidecarsSource = Join-Path $repoRoot "src-tauri\resources\ai-runtime\sidecars"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $repoRoot "_ai"
}

$BasePythonRoot = [System.IO.Path]::GetFullPath($BasePythonRoot)
$SitePackagesSource = [System.IO.Path]::GetFullPath($SitePackagesSource)
$SidecarsSource = [System.IO.Path]::GetFullPath($SidecarsSource)
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)

$basePythonExe = Join-Path $BasePythonRoot "python.exe"
$basePyvenvCfg = Join-Path $BasePythonRoot "pyvenv.cfg"
$outputBasePython = Join-Path $OutputRoot "python-base"
$outputSitePackages = Join-Path $OutputRoot "python-site-packages"
$outputSidecars = Join-Path $OutputRoot "sidecars"
$sidecarEntrySource = Join-Path $SidecarsSource "lama_inpaint.py"
$sidecarRequirementsSource = Join-Path $SidecarsSource "requirements.txt"
$criticalSitePackageFiles = @(
  "torch\__init__.py",
  "torch\version.py"
)

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (!(Test-Path -LiteralPath $Path)) {
    throw "$Label not found: $Path"
  }
}

function Remove-DirectoryIfExists {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

function Assert-CriticalFiles {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string[]]$RelativePaths,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $missing = @()
  foreach ($relativePath in $RelativePaths) {
    $fullPath = Join-Path $Root $relativePath
    if (!(Test-Path -LiteralPath $fullPath)) {
      $missing += $relativePath
    }
  }

  if ($missing.Count -gt 0) {
    throw "$Label is incomplete. Missing critical files: $($missing -join ', ')"
  }
}

function Copy-WithRobocopy {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To
  )

  New-Item -ItemType Directory -Path $To -Force | Out-Null
  robocopy $From $To /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed: $From -> $To (exit code $LASTEXITCODE)"
  }
}

function Copy-TreeFiltered {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To
  )

  New-Item -ItemType Directory -Path $To -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $From -Force) {
    if ($item.PSIsContainer) {
      if ($item.Name -eq "__pycache__") {
        continue
      }
      Copy-Item -LiteralPath $item.FullName -Destination $To -Recurse -Force
      continue
    }

    if ($item.Extension -eq ".pyc") {
      continue
    }

    Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $To $item.Name) -Force
  }
}

Assert-PathExists -Path $BasePythonRoot -Label "Base Python root"
Assert-PathExists -Path $basePythonExe -Label "Base Python executable"
Assert-PathExists -Path $SitePackagesSource -Label "AI site-packages source"
Assert-PathExists -Path $SidecarsSource -Label "AI sidecars source"
Assert-PathExists -Path $sidecarEntrySource -Label "AI sidecar entry"
Assert-PathExists -Path $sidecarRequirementsSource -Label "AI sidecar requirements"
Assert-CriticalFiles -Root $SitePackagesSource -RelativePaths $criticalSitePackageFiles -Label "AI site-packages source"

if (Test-Path -LiteralPath $basePyvenvCfg) {
  throw "Base Python root must be a full Python install, not a virtual environment: $BasePythonRoot"
}

Remove-DirectoryIfExists -Path $OutputRoot
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

Copy-WithRobocopy -From $BasePythonRoot -To $outputBasePython
New-Item -ItemType Directory -Path $outputSitePackages -Force | Out-Null
foreach ($item in Get-ChildItem -LiteralPath $SitePackagesSource -Force) {
  if ($item.PSIsContainer) {
    if ($item.Name -eq "__pycache__") {
      continue
    }
    Copy-Item -LiteralPath $item.FullName -Destination $outputSitePackages -Recurse -Force
    continue
  }

  if ($item.Extension -eq ".pyc") {
    continue
  }

  Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $outputSitePackages $item.Name) -Force
}
New-Item -ItemType Directory -Path $outputSidecars -Force | Out-Null
Copy-Item -LiteralPath $sidecarEntrySource -Destination (Join-Path $outputSidecars "lama_inpaint.py") -Force
Copy-Item -LiteralPath $sidecarRequirementsSource -Destination (Join-Path $outputSidecars "requirements.txt") -Force

Get-ChildItem -LiteralPath $outputSitePackages -Recurse -Force -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -LiteralPath $outputSitePackages -Recurse -Force -File -Include "*.pyc" -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue

if (!(Test-Path -LiteralPath (Join-Path $outputBasePython "python.exe"))) {
  throw "Prepared source is incomplete: missing $(Join-Path $outputBasePython 'python.exe')"
}
if (!(Test-Path -LiteralPath (Join-Path $outputSitePackages "torch"))) {
  throw "Prepared source is incomplete: missing torch package under $outputSitePackages"
}
Assert-CriticalFiles -Root $outputSitePackages -RelativePaths $criticalSitePackageFiles -Label "Prepared AI site-packages"
if (!(Test-Path -LiteralPath (Join-Path $outputSidecars "lama_inpaint.py"))) {
  throw "Prepared source is incomplete: missing $(Join-Path $outputSidecars 'lama_inpaint.py')"
}

Write-Host "AI runtime source prepared: $OutputRoot"
Write-Host "Base Python: $(Join-Path $outputBasePython 'python.exe')"
Write-Host "Site-packages: $outputSitePackages"
Write-Host "Sidecar entry: $(Join-Path $outputSidecars 'lama_inpaint.py')"
