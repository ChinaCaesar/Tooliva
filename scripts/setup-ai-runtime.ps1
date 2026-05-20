param(
  [string]$Python = "python",
  [switch]$CpuOnly,
  [switch]$Cuda,
  [switch]$Recreate,
  [switch]$UpgradePip,
  [string]$TorchWheelDir = ""
)

$ErrorActionPreference = "Stop"
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:PIP_DISABLE_PIP_VERSION_CHECK = "1"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$runtimeRoot = Join-Path $repoRoot "src-tauri\resources\ai-runtime"
$venvRoot = Join-Path $runtimeRoot "python"
$requirements = Join-Path $runtimeRoot "sidecars\requirements.txt"
$pythonExe = Join-Path $venvRoot "Scripts\python.exe"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

function Remove-PythonCaches {
  if (!(Test-Path $venvRoot)) {
    return
  }
  Get-ChildItem -LiteralPath $venvRoot -Recurse -Force -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
    } catch {
      Write-Warning "Unable to remove Python cache directory, it may be locked: $($_.FullName)"
    }
  }
}

function Test-Pip {
  if (!(Test-Path $pythonExe)) {
    return $false
  }
  & $pythonExe -m pip --version *> $null
  return $LASTEXITCODE -eq 0
}

function Reset-Venv {
  $resolvedRuntime = [System.IO.Path]::GetFullPath($runtimeRoot)
  $resolvedVenv = [System.IO.Path]::GetFullPath($venvRoot)
  if (!$resolvedVenv.StartsWith($resolvedRuntime, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove venv outside runtime root: $resolvedVenv"
  }
  if (Test-Path $venvRoot) {
    Write-Host "Removing broken project AI Python runtime: $venvRoot"
    Remove-Item -LiteralPath $venvRoot -Recurse -Force
  }
  Write-Host "Creating project AI Python runtime: $venvRoot"
  Invoke-Checked $Python -m venv $venvRoot
}

if (!(Test-Path $requirements)) {
  throw "requirements.txt not found: $requirements"
}

if ($Recreate -or !(Test-Path $pythonExe)) {
  Reset-Venv
}

if (!(Test-Path $pythonExe)) {
  throw "Project AI Python runtime was not created: $pythonExe"
}

if (!(Test-Pip)) {
  Write-Host "Repairing pip in project AI Python runtime"
  & $pythonExe -m ensurepip --upgrade
  if ($LASTEXITCODE -ne 0 -or !(Test-Pip)) {
    Write-Host "pip repair failed; recreating project AI Python runtime"
    Reset-Venv
  }
}

if (!(Test-Pip)) {
  throw "pip is not available in project AI Python runtime: $pythonExe"
}

Remove-PythonCaches
if ($UpgradePip) {
  Write-Host "Upgrading pip tooling"
  Invoke-Checked $pythonExe -m pip install --upgrade --no-cache-dir pip setuptools wheel
} else {
  Write-Host "Installing Python build tooling"
  Invoke-Checked $pythonExe -m pip install --upgrade --no-cache-dir setuptools wheel
}

if ($Cuda) {
  Write-Host "Installing PyTorch CUDA 12.1 wheels"
  if ($TorchWheelDir) {
    $resolvedWheelDir = Resolve-Path $TorchWheelDir
    $torchWheel = Get-ChildItem -LiteralPath $resolvedWheelDir -Filter "torch-2.4.1+cu121-cp310-cp310-win_amd64.whl" | Select-Object -First 1
    $visionWheel = Get-ChildItem -LiteralPath $resolvedWheelDir -Filter "torchvision-0.19.1+cu121-cp310-cp310-win_amd64.whl" | Select-Object -First 1
    if (!$torchWheel -or !$visionWheel) {
      throw "CUDA wheel files not found in ${resolvedWheelDir}. Expected torch-2.4.1+cu121-cp310-cp310-win_amd64.whl and torchvision-0.19.1+cu121-cp310-cp310-win_amd64.whl"
    }
    Invoke-Checked $pythonExe -m pip install $torchWheel.FullName $visionWheel.FullName
  } else {
    Invoke-Checked $pythonExe -m pip install --retries 10 --timeout 120 "torch==2.4.1+cu121" "torchvision==0.19.1+cu121" --index-url https://download.pytorch.org/whl/cu121
  }
  Write-Host "Installing remaining AI runtime dependencies"
  Invoke-Checked $pythonExe -m pip install --no-cache-dir --retries 10 --timeout 120 pillow opencv-python-headless numpy tqdm huggingface-hub iopaint
} elseif ($CpuOnly) {
  Write-Host "Installing PyTorch CPU wheels"
  Invoke-Checked $pythonExe -m pip install --retries 10 --timeout 120 "torch==2.4.1+cpu" "torchvision==0.19.1+cpu" --index-url https://download.pytorch.org/whl/cpu
  Write-Host "Installing remaining AI runtime dependencies"
  Invoke-Checked $pythonExe -m pip install --no-cache-dir --retries 10 --timeout 120 pillow opencv-python-headless numpy tqdm huggingface-hub iopaint
} else {
  Write-Host "Installing AI runtime dependencies from requirements.txt"
  Invoke-Checked $pythonExe -m pip install --no-cache-dir --retries 10 --timeout 120 -r $requirements
}

Write-Host "Checking AI runtime imports"
if ($Cuda) {
  Invoke-Checked $pythonExe (Join-Path $runtimeRoot "sidecars\lama_inpaint.py") check-runtime --torch-home (Join-Path $env:APPDATA "DesktopToolbox\ai-models\_torch") --require-lama
} else {
  Invoke-Checked $pythonExe (Join-Path $runtimeRoot "sidecars\lama_inpaint.py") check-runtime --torch-home (Join-Path $env:APPDATA "DesktopToolbox\ai-models\_torch")
}

Write-Host "AI runtime is ready: $pythonExe"
