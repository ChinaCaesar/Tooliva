param(
  [string]$BasePythonRoot = "D:\python3.10",
  [string]$SitePackagesSource = "",
  [string]$SidecarsSource = "",
  [string]$OutputRoot = "",
  [switch]$KeepPaddle,
  [switch]$SkipRuntimeSmokeTest
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
  "torch\version.py",
  "torchvision\__init__.py",
  "iopaint\__init__.py",
  "iopaint\model_manager.py",
  "cv2\cv2.pyd",
  "numpy\__init__.py",
  "PIL\__init__.py",
  "colorama\__init__.py",
  "typing_extensions.py"
)
$defaultExcludedDirectoryNames = @("__pycache__", "tests")
$defaultExcludedFileExtensions = @(".pyc", ".map", ".h", ".lib")
$defaultExcludedSitePackagePaths = @(
  "paddle",
  "paddlepaddle-3.0.0.dist-info"
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

function Test-ExcludedDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [string[]]$ExcludeDirectoryNames = @(),
    [string[]]$ExcludeRelativeDirectories = @()
  )

  if ($ExcludeDirectoryNames -contains $Name) {
    return $true
  }

  foreach ($excludedPath in $ExcludeRelativeDirectories) {
    $normalizedExcludedPath = $excludedPath.Replace("\", "/").Trim("/")
    if ([string]::IsNullOrWhiteSpace($normalizedExcludedPath)) {
      continue
    }
    if ($RelativePath -eq $normalizedExcludedPath -or $RelativePath.StartsWith($normalizedExcludedPath + "/")) {
      return $true
    }
  }

  return $false
}

function Test-ExcludedFile {
  param(
    [Parameter(Mandatory = $true)]$Item,
    [string[]]$ExcludeFileExtensions = @()
  )

  $extension = $Item.Extension.ToLowerInvariant()
  return $ExcludeFileExtensions -contains $extension
}

function Copy-TreeFiltered {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To,
    [string[]]$ExcludeDirectoryNames = $defaultExcludedDirectoryNames,
    [string[]]$ExcludeRelativeDirectories = @(),
    [string[]]$ExcludeFileExtensions = $defaultExcludedFileExtensions,
    [string]$RelativePrefix = ""
  )

  New-Item -ItemType Directory -Path $To -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $From -Force) {
    $relativePath = if ([string]::IsNullOrWhiteSpace($RelativePrefix)) {
      $item.Name
    } else {
      $RelativePrefix + "/" + $item.Name
    }

    if ($item.PSIsContainer) {
      if (Test-ExcludedDirectory -Name $item.Name -RelativePath $relativePath -ExcludeDirectoryNames $ExcludeDirectoryNames -ExcludeRelativeDirectories $ExcludeRelativeDirectories) {
        continue
      }
      Copy-TreeFiltered -From $item.FullName -To (Join-Path $To $item.Name) -ExcludeDirectoryNames $ExcludeDirectoryNames -ExcludeRelativeDirectories $ExcludeRelativeDirectories -ExcludeFileExtensions $ExcludeFileExtensions -RelativePrefix $relativePath
      continue
    }

    if (Test-ExcludedFile -Item $item -ExcludeFileExtensions $ExcludeFileExtensions) {
      continue
    }

    Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $To $item.Name) -Force
  }
}

function Test-PreparedRuntimeBundle {
  param(
    [Parameter(Mandatory = $true)][string]$BasePythonRoot,
    [Parameter(Mandatory = $true)][string]$SitePackagesRoot,
    [Parameter(Mandatory = $true)][string]$SidecarsRoot
  )

  $smokeRoot = Join-Path $repoRoot "_runtime_smoke_prepare"
  $smokePythonRoot = Join-Path $smokeRoot "python"
  $smokeSitePackages = Join-Path $smokePythonRoot "Lib\site-packages"
  $smokeSidecars = Join-Path $smokeRoot "sidecars"
  $smokeTorchHome = Join-Path $smokeRoot "_torch"
  $basePythonForSmoke = Join-Path $BasePythonRoot "python.exe"
  $smokePythonExe = Join-Path $smokePythonRoot "Scripts\python.exe"
  $smokeSidecarEntry = Join-Path $smokeSidecars "lama_inpaint.py"

  Remove-DirectoryIfExists -Path $smokeRoot
  New-Item -ItemType Directory -Path $smokeRoot -Force | Out-Null

  & $basePythonForSmoke -S -m venv $smokePythonRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Prepared AI runtime smoke test failed while creating venv from $basePythonForSmoke"
  }

  Copy-TreeFiltered -From $SitePackagesRoot -To $smokeSitePackages
  Copy-TreeFiltered -From $SidecarsRoot -To $smokeSidecars
  Assert-CriticalFiles -Root $smokeSitePackages -RelativePaths $criticalSitePackageFiles -Label "Prepared AI site-packages smoke test"

  New-Item -ItemType Directory -Path $smokeTorchHome -Force | Out-Null
  $smokeOutput = & $smokePythonExe $smokeSidecarEntry check-runtime --torch-home $smokeTorchHome --require-lama 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Prepared AI runtime smoke test failed.`n$($smokeOutput | Out-String)"
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

$excludedSitePackagePaths = @()
if (!$KeepPaddle) {
  $excludedSitePackagePaths = $defaultExcludedSitePackagePaths
}

Copy-TreeFiltered -From $BasePythonRoot -To $outputBasePython -ExcludeRelativeDirectories @("Lib/site-packages")
Copy-TreeFiltered -From $SitePackagesSource -To $outputSitePackages -ExcludeRelativeDirectories $excludedSitePackagePaths
Copy-TreeFiltered -From $SidecarsSource -To $outputSidecars

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
if (!$SkipRuntimeSmokeTest) {
  Test-PreparedRuntimeBundle -BasePythonRoot $outputBasePython -SitePackagesRoot $outputSitePackages -SidecarsRoot $outputSidecars
}

Write-Host "AI runtime source prepared: $OutputRoot"
Write-Host "Base Python: $(Join-Path $outputBasePython 'python.exe')"
Write-Host "Site-packages: $outputSitePackages"
Write-Host "Sidecar entry: $(Join-Path $outputSidecars 'lama_inpaint.py')"
if ($excludedSitePackagePaths.Count -gt 0) {
  Write-Host "Excluded site-packages: $($excludedSitePackagePaths -join ', ')"
}
