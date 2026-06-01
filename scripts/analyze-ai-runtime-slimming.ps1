param(
  [string]$SourceRoot = "",
  [string]$MaterializedRoot = "",
  [string]$PackagePath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  $defaultPrepared = Join-Path $repoRoot "_ai"
  $defaultRuntime = Join-Path $repoRoot "src-tauri\resources\ai-runtime"
  if (Test-Path -LiteralPath $defaultPrepared) {
    $SourceRoot = $defaultPrepared
  } else {
    $SourceRoot = $defaultRuntime
  }
}
if ([string]::IsNullOrWhiteSpace($MaterializedRoot)) {
  $defaultMaterialized = Join-Path $repoRoot "_pkgtest"
  if (Test-Path -LiteralPath $defaultMaterialized) {
    $MaterializedRoot = $defaultMaterialized
  }
}

$SourceRoot = [System.IO.Path]::GetFullPath($SourceRoot)
if (![string]::IsNullOrWhiteSpace($MaterializedRoot)) {
  $MaterializedRoot = [System.IO.Path]::GetFullPath($MaterializedRoot)
}
if (![string]::IsNullOrWhiteSpace($PackagePath)) {
  $PackagePath = [System.IO.Path]::GetFullPath($PackagePath)
}

function Get-TreeBytes {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    return 0L
  }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File | Measure-Object Length -Sum).Sum
  if ($null -eq $sum) {
    return 0L
  }
  return [int64]$sum
}

function Format-Gb {
  param([Parameter(Mandatory = $true)][Int64]$Bytes)
  return [math]::Round(($Bytes / 1GB), 3)
}

function New-Stat {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][Int64]$Bytes
  )
  return [pscustomobject]@{
    Name = $Name
    SizeGB = Format-Gb -Bytes $Bytes
  }
}

function Get-FileStatsByFilter {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][scriptblock]$Filter
  )

  if (!(Test-Path -LiteralPath $Root)) {
    return [pscustomobject]@{ Count = 0; Bytes = 0L }
  }

  $files = Get-ChildItem -LiteralPath $Root -Recurse -Force -File | Where-Object $Filter
  $count = ($files | Measure-Object).Count
  $bytes = ($files | Measure-Object Length -Sum).Sum
  if ($null -eq $bytes) {
    $bytes = 0L
  }
  return [pscustomobject]@{
    Count = $count
    Bytes = [int64]$bytes
  }
}

function Get-ZipEntries {
  param([Parameter(Mandatory = $true)][string]$ZipPath)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    return $zip.Entries | ForEach-Object {
      [pscustomobject]@{
        FullName = ($_.FullName -replace "\\", "/")
        Length = [int64]$_.Length
        CompressedLength = [int64]$_.CompressedLength
      }
    }
  } finally {
    $zip.Dispose()
  }
}

function Get-ZipStatsByFilter {
  param(
    [Parameter(Mandatory = $true)]$Entries,
    [Parameter(Mandatory = $true)][scriptblock]$Filter
  )
  $subset = $Entries | Where-Object $Filter
  $count = ($subset | Measure-Object).Count
  $bytes = ($subset | Measure-Object Length -Sum).Sum
  $compressed = ($subset | Measure-Object CompressedLength -Sum).Sum
  if ($null -eq $bytes) {
    $bytes = 0L
  }
  if ($null -eq $compressed) {
    $compressed = 0L
  }
  return [pscustomobject]@{
    Count = $count
    Bytes = [int64]$bytes
    CompressedBytes = [int64]$compressed
  }
}

function Get-ZipDuplicateStats {
  param([Parameter(Mandatory = $true)]$Entries)

  $siteEntries = @{}
  foreach ($entry in $Entries) {
    if ($entry.FullName.StartsWith("python-site-packages/")) {
      $rel = $entry.FullName.Substring("python-site-packages/".Length)
      $siteEntries[$rel.ToLowerInvariant()] = $entry
    }
  }

  $count = 0
  $bytes = 0L
  $compressed = 0L
  foreach ($entry in $Entries) {
    if (!$entry.FullName.StartsWith("python-base/Lib/site-packages/")) {
      continue
    }
    $rel = $entry.FullName.Substring("python-base/Lib/site-packages/".Length)
    $key = $rel.ToLowerInvariant()
    if (!$siteEntries.ContainsKey($key)) {
      continue
    }
    $other = $siteEntries[$key]
    if ($other.Length -ne $entry.Length) {
      continue
    }
    $count += 1
    $bytes += $entry.Length
    $compressed += ($entry.CompressedLength + $other.CompressedLength)
  }

  return [pscustomobject]@{
    Count = $count
    Bytes = [int64]$bytes
    CompressedBytes = [int64]$compressed
  }
}

function Invoke-ProcessChecked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [hashtable]$ExtraEnv = @{}
  )

  function Quote-ProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)
    if ($Value -notmatch '[\s"]') {
      return $Value
    }
    $quoted = $Value -replace '(\\*)"', '$1$1\"'
    $quoted = $quoted -replace '(\\+)$', '$1$1'
    return '"' + $quoted + '"'
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.WorkingDirectory = $repoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.Arguments = (($Arguments | ForEach-Object { Quote-ProcessArgument -Value $_ }) -join " ")
  $envVars = $psi.EnvironmentVariables
  if ($null -ne $envVars) {
    foreach ($key in $ExtraEnv.Keys) {
      $envVars[$key] = [string]$ExtraEnv[$key]
    }
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  try {
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $exitCode = $process.ExitCode
    $combined = @($stdout.Trim(), $stderr.Trim()) | Where-Object { $_ }
    return [pscustomobject]@{
      ExitCode = $exitCode
      Output = ($combined -join [Environment]::NewLine).Trim()
      Success = ($exitCode -eq 0)
    }
  } finally {
    $process.Dispose()
  }
}

function Test-BasePythonVenvWithoutSitePackages {
  param([Parameter(Mandatory = $true)][string]$BasePythonExe)

  $tempRoot = Join-Path $repoRoot "_runtime_test"
  $venvTarget = Join-Path $tempRoot "base-python-no-site-smoke"
  $testScript = Join-Path $tempRoot "base_python_no_site_smoke.py"
  if (Test-Path -LiteralPath $venvTarget) {
    Remove-Item -LiteralPath $venvTarget -Recurse -Force
  }
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

  $escapedTarget = $venvTarget -replace "\\", "\\\\"
  $code = @'
import pathlib
import shutil
import venv

target = pathlib.Path(r"__TARGET__")
if target.exists():
    shutil.rmtree(target)
venv.create(str(target), with_pip=True)
print(target.joinpath("Scripts", "python.exe").exists())
'@
  $code = $code.Replace("__TARGET__", $escapedTarget)
  Set-Content -LiteralPath $testScript -Value $code -Encoding ASCII

  $create = Invoke-ProcessChecked -FilePath $BasePythonExe -Arguments @("-S", $testScript)
  if (!$create.Success) {
    return [pscustomobject]@{
      Name = "base-python-without-site-packages"
      Passed = $false
      Detail = $create.Output
    }
  }

  $venvPython = Join-Path $venvTarget "Scripts\python.exe"
  $pipCheck = Invoke-ProcessChecked -FilePath $venvPython -Arguments @("-m", "pip", "--version")
  return [pscustomobject]@{
    Name = "base-python-without-site-packages"
    Passed = $pipCheck.Success
    Detail = if ($pipCheck.Success) { $pipCheck.Output } else { $pipCheck.Output }
  }
}

function Test-MaterializedRuntime {
  param(
    [Parameter(Mandatory = $true)][string]$MaterializedRootPath,
    [switch]$BlockPaddle
  )

  $pythonExe = Join-Path $MaterializedRootPath "python\Scripts\python.exe"
  $sidecarScript = Join-Path $MaterializedRootPath "sidecars\lama_inpaint.py"
  if (!(Test-Path -LiteralPath $pythonExe) -or !(Test-Path -LiteralPath $sidecarScript)) {
    return [pscustomobject]@{
      Name = if ($BlockPaddle) { "materialized-runtime-with-paddle-blocked" } else { "materialized-runtime-baseline" }
      Passed = $false
      Detail = "Missing materialized runtime test inputs."
    }
  }

  $torchHome = Join-Path $repoRoot "_runtime_test\torch-home"
  New-Item -ItemType Directory -Path $torchHome -Force | Out-Null

  if ($BlockPaddle) {
    $escapedTorchHome = $torchHome -replace "\\", "\\\\"
    $testScript = Join-Path $repoRoot "_runtime_test\paddle_block_import_smoke.py"
    $code = @'
import importlib.abc
import os
import sys

class BlockPaddle(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == "paddle" or fullname.startswith("paddle."):
            raise ImportError("blocked for trim test")
        return None

sys.meta_path.insert(0, BlockPaddle())
os.environ["TORCH_HOME"] = r"__TORCH_HOME__"

import cv2
import numpy
import PIL
import torch
import iopaint
from iopaint.model_manager import ModelManager
from iopaint.schema import HDStrategy, LDMSampler, InpaintRequest

print("paddle-not-required")
'@
    $code = $code.Replace("__TORCH_HOME__", $escapedTorchHome)
    Set-Content -LiteralPath $testScript -Value $code -Encoding ASCII
    $result = Invoke-ProcessChecked -FilePath $pythonExe -Arguments @($testScript)
    return [pscustomobject]@{
      Name = "materialized-runtime-with-paddle-blocked"
      Passed = $result.Success
      Detail = $result.Output
    }
  }

  $result = Invoke-ProcessChecked -FilePath $pythonExe -Arguments @(
    $sidecarScript,
    "check-runtime",
    "--torch-home",
    $torchHome,
    "--require-lama"
  )

  return [pscustomobject]@{
    Name = "materialized-runtime-baseline"
    Passed = $result.Success
    Detail = $result.Output
  }
}

if (!(Test-Path -LiteralPath $SourceRoot)) {
  throw "AI runtime source root not found: $SourceRoot"
}

$basePythonRoot = Join-Path $SourceRoot "python-base"
$basePythonExe = Join-Path $basePythonRoot "python.exe"
$baseSitePackages = Join-Path $basePythonRoot "Lib\site-packages"
$bundledSitePackages = Join-Path $SourceRoot "python-site-packages"
$sidecarsRoot = Join-Path $SourceRoot "sidecars"

$sourceStats = @(
  New-Stat -Name "source-root" -Bytes (Get-TreeBytes -Path $SourceRoot)
  New-Stat -Name "python-base" -Bytes (Get-TreeBytes -Path $basePythonRoot)
  New-Stat -Name "python-base-lib-site-packages" -Bytes (Get-TreeBytes -Path $baseSitePackages)
  New-Stat -Name "python-site-packages" -Bytes (Get-TreeBytes -Path $bundledSitePackages)
  New-Stat -Name "sidecars" -Bytes (Get-TreeBytes -Path $sidecarsRoot)
)

$materializedStats = @()
if (![string]::IsNullOrWhiteSpace($MaterializedRoot) -and (Test-Path -LiteralPath $MaterializedRoot)) {
  $materializedStats += New-Stat -Name "materialized-root" -Bytes (Get-TreeBytes -Path $MaterializedRoot)
  $materializedStats += New-Stat -Name "materialized-python" -Bytes (Get-TreeBytes -Path (Join-Path $MaterializedRoot "python"))
}

$candidateStats = @(
  [pscustomobject]@{
    Candidate = "__pycache__"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.FullName -match '(^|[\\/])__pycache__([\\/])' }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.FullName -match '(^|[\\/])__pycache__([\\/])' }).Bytes
    Safety = "safe"
  }
  [pscustomobject]@{
    Candidate = "*.pyc"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".pyc" }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".pyc" }).Bytes
    Safety = "safe"
  }
  [pscustomobject]@{
    Candidate = "tests"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.FullName -match '(^|[\\/])(tests?|testing)([\\/])' }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.FullName -match '(^|[\\/])(tests?|testing)([\\/])' }).Bytes
    Safety = "safe"
  }
  [pscustomobject]@{
    Candidate = "*.map"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".map" }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".map" }).Bytes
    Safety = "safe"
  }
  [pscustomobject]@{
    Candidate = "*.h"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".h" }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".h" }).Bytes
    Safety = "safe"
  }
  [pscustomobject]@{
    Candidate = "*.lib"
    Count = (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".lib" }).Count
    SourceGB = Format-Gb -Bytes (Get-FileStatsByFilter -Root $SourceRoot -Filter { $_.Extension -eq ".lib" }).Bytes
    Safety = "safe"
  }
)

$duplicateFileCount = 0
$duplicateBytes = 0L
if ((Test-Path -LiteralPath $baseSitePackages) -and (Test-Path -LiteralPath $bundledSitePackages)) {
  $bundledMap = @{}
  foreach ($file in Get-ChildItem -LiteralPath $bundledSitePackages -Recurse -Force -File) {
    $rel = $file.FullName.Substring($bundledSitePackages.Length).TrimStart("\", "/").ToLowerInvariant()
    $bundledMap[$rel] = [int64]$file.Length
  }
  foreach ($file in Get-ChildItem -LiteralPath $baseSitePackages -Recurse -Force -File) {
    $rel = $file.FullName.Substring($baseSitePackages.Length).TrimStart("\", "/").ToLowerInvariant()
    if ($bundledMap.ContainsKey($rel) -and $bundledMap[$rel] -eq $file.Length) {
      $duplicateFileCount += 1
      $duplicateBytes += $file.Length
    }
  }
}

$betterPackageCandidates = @(
  [pscustomobject]@{ Name = "paddle package"; SizeGB = Format-Gb -Bytes (Get-TreeBytes -Path (Join-Path $bundledSitePackages "paddle")) }
  [pscustomobject]@{ Name = "torch package"; SizeGB = Format-Gb -Bytes (Get-TreeBytes -Path (Join-Path $bundledSitePackages "torch")) }
  [pscustomobject]@{ Name = "materialized python"; SizeGB = if ($materializedStats.Count -gt 0) { ($materializedStats | Where-Object { $_.Name -eq "materialized-python" } | Select-Object -ExpandProperty SizeGB -First 1) } else { 0 } }
)

$zipEntries = $null
$zipStats = @()
$zipDuplicate = $null
if (![string]::IsNullOrWhiteSpace($PackagePath) -and (Test-Path -LiteralPath $PackagePath)) {
  $zipEntries = Get-ZipEntries -ZipPath $PackagePath
  $zipStats += [pscustomobject]@{
    Candidate = "__pycache__"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName -match '(^|/)__pycache__/'}).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "*.pyc"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName.ToLowerInvariant().EndsWith(".pyc") }).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "tests"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName -match '(^|/)(tests?|testing)/' }).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "*.map"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName.ToLowerInvariant().EndsWith(".map") }).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "*.h"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName.ToLowerInvariant().EndsWith(".h") }).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "*.lib"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName.ToLowerInvariant().EndsWith(".lib") }).CompressedBytes
  }
  $zipStats += [pscustomobject]@{
    Candidate = "paddle package"
    CompressedGB = Format-Gb -Bytes (Get-ZipStatsByFilter -Entries $zipEntries -Filter { $_.FullName.ToLowerInvariant().StartsWith("python-site-packages/paddle/") }).CompressedBytes
  }
  $zipDuplicate = Get-ZipDuplicateStats -Entries $zipEntries
}

$tests = @()
if (Test-Path -LiteralPath $basePythonExe) {
  $tests += Test-BasePythonVenvWithoutSitePackages -BasePythonExe $basePythonExe
}
if (![string]::IsNullOrWhiteSpace($MaterializedRoot) -and (Test-Path -LiteralPath $MaterializedRoot)) {
  $tests += Test-MaterializedRuntime -MaterializedRootPath $MaterializedRoot
  $tests += Test-MaterializedRuntime -MaterializedRootPath $MaterializedRoot -BlockPaddle
}

$safeEstimateCandidates = $candidateStats | Where-Object {
  $_.Safety -eq "safe" -and $_.Candidate -ne "__pycache__"
}
$safeSourceSavings = 0L
foreach ($item in $safeEstimateCandidates) {
  $safeSourceSavings += [int64]([double]$item.SourceGB * 1GB)
}
$estimatedSlimBytes = (Get-TreeBytes -Path $SourceRoot) - $safeSourceSavings - $duplicateBytes
if ($estimatedSlimBytes -lt 0) {
  $estimatedSlimBytes = 0L
}

$estimatedZipSavings = 0L
if ($zipStats.Count -gt 0) {
  foreach ($item in ($zipStats | Where-Object {
    $_.Candidate -ne "paddle package" -and $_.Candidate -ne "__pycache__"
  })) {
    $estimatedZipSavings += [int64]([double]$item.CompressedGB * 1GB)
  }
}
if ($zipDuplicate) {
  $estimatedZipSavings += $zipDuplicate.CompressedBytes
}
$estimatedZipOriginal = if ($zipEntries) { ($zipEntries | Measure-Object CompressedLength -Sum).Sum } else { 0L }
$estimatedZipBytes = $estimatedZipOriginal - $estimatedZipSavings
if ($estimatedZipBytes -lt 0) {
  $estimatedZipBytes = 0L
}

Write-Host ""
Write-Host "AI runtime source: $SourceRoot"
if ($PackagePath) {
  Write-Host "AI runtime package: $PackagePath"
}
Write-Host ""
Write-Host "Source size breakdown"
$sourceStats | Format-Table -AutoSize | Out-Host

if ($materializedStats.Count -gt 0) {
  Write-Host ""
  Write-Host "Installed-layout reference"
  $materializedStats | Format-Table -AutoSize | Out-Host
}

Write-Host ""
Write-Host "Low-risk removal candidates"
$candidateStats | Format-Table -AutoSize | Out-Host

Write-Host ""
Write-Host "Duplicate content between python-base and python-site-packages"
[pscustomobject]@{
  DuplicateFiles = $duplicateFileCount
  DuplicateGB = Format-Gb -Bytes $duplicateBytes
} | Format-Table -AutoSize | Out-Host

if ($zipStats.Count -gt 0) {
  Write-Host ""
  Write-Host "Package compressed savings estimates"
  $zipStats | Format-Table -AutoSize | Out-Host
  if ($zipDuplicate) {
    [pscustomobject]@{
      Candidate = "duplicate-site-packages"
      CompressedGB = Format-Gb -Bytes $zipDuplicate.CompressedBytes
    } | Format-Table -AutoSize | Out-Host
  }
}

Write-Host ""
Write-Host "Runtime validation tests"
$tests | Format-Table -AutoSize | Out-Host

Write-Host ""
Write-Host "High-yield structural candidates"
$betterPackageCandidates | Format-Table -AutoSize | Out-Host

$versionInstallBytes = if ($materializedStats.Count -gt 0) { Get-TreeBytes -Path $MaterializedRoot } else { 0L }
$estimatedInstalledTotalBytes = if ($versionInstallBytes -gt 0) { $versionInstallBytes * 2 } else { 0L }

Write-Host ""
Write-Host "Estimates"
[pscustomobject]@{
  EstimatedSlimSourceGB = Format-Gb -Bytes $estimatedSlimBytes
  EstimatedSlimZipGB = if ($estimatedZipBytes -gt 0) { Format-Gb -Bytes $estimatedZipBytes } else { $null }
  EstimatedInstalledVersionGB = if ($versionInstallBytes -gt 0) { Format-Gb -Bytes $versionInstallBytes } else { $null }
  EstimatedInstalledVersionPlusCurrentGB = if ($estimatedInstalledTotalBytes -gt 0) { Format-Gb -Bytes $estimatedInstalledTotalBytes } else { $null }
} | Format-List | Out-Host
