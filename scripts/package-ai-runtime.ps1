param(
  [Parameter(Mandatory = $true)]
  [string]$RuntimeVersion,

  [string]$Channel = "stable",
  [string]$MinAppVersion = "0.1.0",
  [string]$Platform = "windows-x64",
  [string]$PackageFileName = "ai-runtime.zip",
  [string]$PackageBaseUrl = "",
  [string]$ManifestUrl = "",
  [string]$ModelBaseUrl = "",
  [string]$ModelVersion = "1.0.0",
  [string]$ModelFileName = "big-lama.pt",
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
  [string]$SourceRoot = "",
  [string]$OutputRoot = "",
  [switch]$SkipArchive
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
$stageRoot = Join-Path $OutputRoot "stage"
$archivePath = Join-Path $OutputRoot $PackageFileName
$manifestPath = Join-Path $OutputRoot "manifest.generated.json"

function Remove-DirectoryIfExists {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

function Copy-TreeFiltered {
  param(
    [Parameter(Mandatory = $true)][string]$From,
    [Parameter(Mandatory = $true)][string]$To
  )

  Get-ChildItem -LiteralPath $From -Force | ForEach-Object {
    $target = Join-Path $To $_.Name

    if ($_.PSIsContainer) {
      if ($_.Name -eq "__pycache__") {
        return
      }
      New-Item -ItemType Directory -Path $target -Force | Out-Null
      Copy-TreeFiltered -From $_.FullName -To $target
      return
    }

    if ($_.Extension -eq ".pyc") {
      return
    }

    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
}

function Get-FileSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
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
$sidecarsDir = Join-Path $SourceRoot "sidecars"
if (!(Test-Path -LiteralPath $pythonDir)) {
  throw "Missing runtime python directory: $pythonDir"
}
if (!(Test-Path -LiteralPath $sidecarsDir)) {
  throw "Missing runtime sidecars directory: $sidecarsDir"
}

$pythonExe = Join-Path $pythonDir "python.exe"
$venvPythonExe = Join-Path $pythonDir "Scripts\python.exe"
if (!(Test-Path -LiteralPath $pythonExe) -and !(Test-Path -LiteralPath $venvPythonExe)) {
  throw "Missing runtime python executable under: $pythonDir"
}

$sidecarEntry = Join-Path $sidecarsDir "lama_inpaint.py"
if (!(Test-Path -LiteralPath $sidecarEntry)) {
  throw "Missing runtime sidecar entrypoint: $sidecarEntry"
}

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
Remove-DirectoryIfExists -Path $stageRoot
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageRoot "python") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageRoot "sidecars") -Force | Out-Null

Copy-TreeFiltered -From $pythonDir -To (Join-Path $stageRoot "python")
Copy-TreeFiltered -From $sidecarsDir -To (Join-Path $stageRoot "sidecars")

$packageSha256 = "SKIPPED"
$packageSize = 0
$packageUrl = Get-RelativePackageUrl

if (!$SkipArchive) {
  $tarExe = Get-Command tar.exe -ErrorAction SilentlyContinue
  if (!$tarExe) {
    throw "tar.exe not found. Install Windows bsdtar / tar support, or package the stage directory manually."
  }

  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }

  Push-Location $stageRoot
  try {
    & $tarExe.Source -a -cf $archivePath "python" "sidecars"
    if ($LASTEXITCODE -ne 0) {
      throw "tar.exe failed with exit code $LASTEXITCODE"
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
}
Write-Host "Manifest created: $manifestPath"
Write-Host "Package URL: $packageUrl"
Write-Host "Model URL: $(Get-ModelUrl)"
