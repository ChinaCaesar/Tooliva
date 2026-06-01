param(
  [Parameter(Mandatory = $true)]
  [string]$RuntimeVersion,

  [string]$Channel = "stable",
  [string]$MinAppVersion = "0.1.0",
  [string]$Platform = "windows-x64",
  [string]$PackageFileName = "ai-runtime.7z",
  [string]$PackageBaseUrl = "",
  [string]$ManifestUrl = "",
  [string]$ModelBaseUrl = "",
  [string]$ModelVersion = "1.0.0",
  [string]$ModelFileName = "big-lama.pt",
  [string]$SourceRoot = "",
  [string]$OutputRoot = "",
  [string]$ModelFilePath = "",
  [string]$ModelSha256 = "PLEASE_REPLACE_WITH_REAL_SHA256",
  [UInt64]$ModelSize = 196000000,
  [UInt64]$RequiredFreeDiskGb = 8,
  [UInt64]$MinMemoryGb = 8,
  [UInt64]$RecommendedMemoryGb = 16,
  [string]$CpuRequirement = "x64",
  [string]$OsRequirement = "Windows 10/11 64-bit",
  [bool]$AvxRequired = $false,
  [bool]$Avx2Recommended = $true,
  [switch]$KeepPaddle,
  [switch]$SkipArchive,
  [switch]$SkipRuntimeSmokeTest
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  $SourceRoot = Join-Path $repoRoot "src-tauri\resources\ai-runtime"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $repoRoot ("dist\ai-runtime\" + $RuntimeVersion)
}

$SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot)
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
$stageRoot = Join-Path $repoRoot "_ai_stage"
$archivePath = Join-Path $OutputRoot $PackageFileName
$manifestPath = Join-Path $OutputRoot "manifest.generated.json"
$sevenZipExeCandidates = @(
  (Join-Path $repoRoot "src-tauri\resources\bin\7za.exe"),
  (Join-Path $repoRoot "src-tauri\resources\bin\7z.exe"),
  "C:\Program Files\7-Zip\7z.exe",
  "C:\Program Files (x86)\7-Zip\7z.exe",
  "C:\Program Files (x86)\Adobe\Adobe Creative Cloud\Utils\zip\7za.exe",
  "C:\Program Files\NVIDIA Corporation\NVIDIA GeForce Experience\7z.exe"
)
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

function Remove-DirectoryIfExists {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
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

  return $ExcludeFileExtensions -contains $Item.Extension.ToLowerInvariant()
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

function Get-FileSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Resolve-SevenZipExe {
  foreach ($candidate in $sevenZipExeCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  $command = Get-Command 7z.exe, 7za.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($command) {
    return $command.Source
  }
  throw @"
7-Zip executable not found.
Install 7-Zip or provide one of these executables on this machine:
  - 7z.exe
  - 7za.exe
"@
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

function Test-IsVirtualEnvRuntime {
  param([Parameter(Mandatory = $true)][string]$PythonRoot)

  $pyvenvConfig = Join-Path $PythonRoot "pyvenv.cfg"
  return Test-Path -LiteralPath $pyvenvConfig
}

function Test-BundledRuntimeSmoke {
  param(
    [Parameter(Mandatory = $true)][string]$BasePythonRoot,
    [Parameter(Mandatory = $true)][string]$SitePackagesRoot,
    [Parameter(Mandatory = $true)][string]$SidecarsRoot
  )

  $smokeRoot = Join-Path $repoRoot "_runtime_smoke_package"
  $smokePythonRoot = Join-Path $smokeRoot "python"
  $smokeSitePackages = Join-Path $smokePythonRoot "Lib\site-packages"
  $smokeSidecars = Join-Path $smokeRoot "sidecars"
  $smokeTorchHome = Join-Path $smokeRoot "_torch"
  $basePythonExe = Join-Path $BasePythonRoot "python.exe"
  $smokePythonExe = Join-Path $smokePythonRoot "Scripts\python.exe"
  $smokeSidecarEntry = Join-Path $smokeSidecars "lama_inpaint.py"

  Remove-DirectoryIfExists -Path $smokeRoot
  New-Item -ItemType Directory -Path $smokeRoot -Force | Out-Null

  & $basePythonExe -S -m venv $smokePythonRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Bundled AI runtime smoke test failed while creating venv from $basePythonExe"
  }

  Copy-TreeFiltered -From $SitePackagesRoot -To $smokeSitePackages
  Copy-TreeFiltered -From $SidecarsRoot -To $smokeSidecars
  Assert-CriticalFiles -Root $smokeSitePackages -RelativePaths $criticalSitePackageFiles -Label "Bundled AI site-packages smoke test"

  New-Item -ItemType Directory -Path $smokeTorchHome -Force | Out-Null
  $smokeOutput = & $smokePythonExe $smokeSidecarEntry check-runtime --torch-home $smokeTorchHome --require-lama 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Bundled AI runtime smoke test failed.`n$($smokeOutput | Out-String)"
  }
}

function Get-RelativePackageUrl {
  if ([string]::IsNullOrWhiteSpace($PackageBaseUrl)) {
    return ""
  }
  return ($PackageBaseUrl.TrimEnd("/") + "/" + $Platform + "/" + $RuntimeVersion + "/" + $PackageFileName)
}

function Get-ModelUrl {
  if ([string]::IsNullOrWhiteSpace($ModelBaseUrl)) {
    return ""
  }
  return ($ModelBaseUrl.TrimEnd("/") + "/lama/" + $ModelFileName)
}

if (!(Test-Path -LiteralPath $SourceRoot)) {
  throw "AI runtime source directory not found: $SourceRoot"
}

$pythonDir = Join-Path $SourceRoot "python"
$basePythonDir = Join-Path $SourceRoot "python-base"
$sitePackagesDir = Join-Path $SourceRoot "python-site-packages"
$sidecarsDir = Join-Path $SourceRoot "sidecars"
if (!(Test-Path -LiteralPath $sidecarsDir)) {
  throw "Missing runtime sidecars directory: $sidecarsDir"
}

$layout = ""
if (Test-Path -LiteralPath $pythonDir) {
  $pythonExe = Join-Path $pythonDir "python.exe"
  $venvPythonExe = Join-Path $pythonDir "Scripts\python.exe"
  if (!(Test-Path -LiteralPath $pythonExe) -and !(Test-Path -LiteralPath $venvPythonExe)) {
    throw "Missing runtime python executable under: $pythonDir"
  }
  if (Test-IsVirtualEnvRuntime -PythonRoot $pythonDir) {
    throw @"
The AI runtime under '$pythonDir' is a Python virtual environment (pyvenv.cfg detected).
Virtual environments are not portable and will keep absolute paths to the build machine,
which breaks on a clean PC after installation.

Use the prepared source layout instead:
  python-base\
  python-site-packages\
  sidecars\
"@
  }
  if (!(Test-Path -LiteralPath $pythonExe)) {
    throw @"
The AI runtime under '$pythonDir' does not contain python\python.exe.
Release packages must bundle a portable/self-contained Python runtime instead of a venv-style layout.
"@
  }
  $layout = "portable"
} elseif ((Test-Path -LiteralPath $basePythonDir) -and (Test-Path -LiteralPath $sitePackagesDir)) {
  $basePythonExe = Join-Path $basePythonDir "python.exe"
  if (!(Test-Path -LiteralPath $basePythonExe)) {
    throw "Missing base Python executable under: $basePythonDir"
  }
  if (Test-IsVirtualEnvRuntime -PythonRoot $basePythonDir) {
    throw "Base Python source must not be a virtual environment: $basePythonDir"
  }
  if (!(Test-Path -LiteralPath (Join-Path $sitePackagesDir "torch"))) {
    throw "Missing torch package under: $sitePackagesDir"
  }
  Assert-CriticalFiles -Root $sitePackagesDir -RelativePaths $criticalSitePackageFiles -Label "Bundled AI site-packages"
  $layout = "bundle"
} else {
  throw @"
Unsupported AI runtime source layout: $SourceRoot

Expected one of:
  1. portable layout:
     python\
     sidecars\

  2. bundle layout:
     python-base\
     python-site-packages\
     sidecars\
"@
}

$sidecarEntry = Join-Path $sidecarsDir "lama_inpaint.py"
if (!(Test-Path -LiteralPath $sidecarEntry)) {
  throw "Missing runtime sidecar entrypoint: $sidecarEntry"
}

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
Remove-DirectoryIfExists -Path $stageRoot
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageRoot "sidecars") -Force | Out-Null
Copy-TreeFiltered -From $sidecarsDir -To (Join-Path $stageRoot "sidecars")
$excludedSitePackagePaths = @()
if (!$KeepPaddle) {
  $excludedSitePackagePaths = $defaultExcludedSitePackagePaths
}
if ($layout -eq "portable") {
  New-Item -ItemType Directory -Path (Join-Path $stageRoot "python") -Force | Out-Null
  Copy-TreeFiltered -From $pythonDir -To (Join-Path $stageRoot "python")
} else {
  New-Item -ItemType Directory -Path (Join-Path $stageRoot "python-base") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $stageRoot "python-site-packages") -Force | Out-Null
  Copy-TreeFiltered -From $basePythonDir -To (Join-Path $stageRoot "python-base") -ExcludeRelativeDirectories @("Lib/site-packages")
  Copy-TreeFiltered -From $sitePackagesDir -To (Join-Path $stageRoot "python-site-packages") -ExcludeRelativeDirectories $excludedSitePackagePaths
  Assert-CriticalFiles -Root (Join-Path $stageRoot "python-site-packages") -RelativePaths $criticalSitePackageFiles -Label "Staged AI site-packages"
  if (!$SkipRuntimeSmokeTest) {
    Test-BundledRuntimeSmoke -BasePythonRoot (Join-Path $stageRoot "python-base") -SitePackagesRoot (Join-Path $stageRoot "python-site-packages") -SidecarsRoot (Join-Path $stageRoot "sidecars")
  }
}

$packageSha256 = "SKIPPED"
$packageSize = 0
$packageUrl = Get-RelativePackageUrl

if (!$SkipArchive) {
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }

  Push-Location $stageRoot
  try {
    $archiveInputs = if ($layout -eq "portable") {
      @("python", "sidecars")
    } else {
      @("python-base", "python-site-packages", "sidecars")
    }
    $sevenZipExe = Resolve-SevenZipExe
    $sevenZipArgs = @(
      "a",
      "-t7z",
      "-mx=7",
      "-m0=lzma2",
      "-md=16m",
      "-mfb=64",
      $archivePath
    ) + $archiveInputs
    & $sevenZipExe @sevenZipArgs
    if ($LASTEXITCODE -ne 0) {
      throw "7-Zip failed with exit code $LASTEXITCODE while creating $archivePath"
    }
    if (!(Test-Path -LiteralPath $archivePath)) {
      throw "7-Zip did not create the expected archive: $archivePath"
    }
  } finally {
    Pop-Location
  }

  $packageSha256 = Get-FileSha256 -Path $archivePath
  $packageSize = (Get-Item -LiteralPath $archivePath).Length
}

if (!(Test-Path -LiteralPath $archivePath) -and !$SkipArchive) {
  throw "Archive was not created: $archivePath"
}

$resolvedModelSha256 = $ModelSha256
$resolvedModelSize = $ModelSize
if (![string]::IsNullOrWhiteSpace($ModelFilePath)) {
  $resolvedModelPath = [System.IO.Path]::GetFullPath($ModelFilePath)
  if (!(Test-Path -LiteralPath $resolvedModelPath)) {
    throw "Model file not found: $resolvedModelPath"
  }
  $resolvedModelSha256 = Get-FileSha256 -Path $resolvedModelPath
  $resolvedModelSize = (Get-Item -LiteralPath $resolvedModelPath).Length
}

$manifestObject = [ordered]@{
  channel = $Channel
  runtimeVersion = $RuntimeVersion
  minAppVersion = $MinAppVersion
  platform = $Platform
  packageSize = $packageSize
  packageSha256 = $packageSha256
  packageUrl = $packageUrl
  requiredFreeDiskGb = $RequiredFreeDiskGb
  requirements = [ordered]@{
    os = $OsRequirement
    minMemoryGb = $MinMemoryGb
    recommendedMemoryGb = $RecommendedMemoryGb
    cpu = $CpuRequirement
    avxRequired = $AvxRequired
    avx2Recommended = $Avx2Recommended
  }
  models = @(
    [ordered]@{
      name = "lama"
      version = $ModelVersion
      fileName = $ModelFileName
      size = $resolvedModelSize
      sha256 = $resolvedModelSha256
      url = (Get-ModelUrl)
    }
  )
  releaseNotes = @(
    "Optimize local AI watermark removal quality",
    "Improve recovery stability for complex backgrounds"
  )
}

$manifestJson = $manifestObject | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

if (![string]::IsNullOrWhiteSpace($ManifestUrl)) {
  Write-Host "Manifest CDN URL: $ManifestUrl"
}
Write-Host "Stage directory: $stageRoot"
if (!$SkipArchive) {
  Write-Host "Archive created: $archivePath"
  Write-Host "Archive SHA256: $packageSha256"
  Write-Host "Archive Size: $packageSize"
}
if ($excludedSitePackagePaths.Count -gt 0) {
  Write-Host "Excluded site-packages: $($excludedSitePackagePaths -join ', ')"
}
Write-Host "Manifest created: $manifestPath"
Write-Host "Package URL: $packageUrl"
Write-Host "Model URL: $(Get-ModelUrl)"
