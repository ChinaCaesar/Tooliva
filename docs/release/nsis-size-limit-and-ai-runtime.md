# Windows NSIS Size Limit And AI Runtime Notes

This document explains why the desktop installer must stay separate from the AI runtime, and how the current manual-import distribution works.

## Summary

- The desktop NSIS installer must stay small.
- The AI runtime is too large to bundle into NSIS reliably.
- The final product flow is:
  - users download the main app installer
  - users separately download `ai-runtime.zip`
  - users separately download `big-lama.pt`
  - users import both files manually inside the app

## Why NSIS Cannot Bundle the AI Runtime

- `tooliva.exe` and FFmpeg are relatively small.
- The local AI Python runtime is several gigabytes because it includes Python, PyTorch, and related dependencies.
- NSIS becomes unreliable once bundled resources become too large.

## Important Distinction

These are different things:

- AI runtime:
  - portable Python runtime plus AI dependencies
  - delivered as `ai-runtime.zip`
  - imported manually by the user
- LaMA model:
  - `big-lama.pt`
  - delivered as a separate file
  - imported manually by the user

The multi-gigabyte size problem comes from the runtime, not from the LaMA model alone.

## Current Distribution Strategy

### Main installer

- Content:
  - desktop app
  - frontend assets
  - `ffmpeg.exe`
  - `ffprobe.exe`
- Does not include:
  - `resources/ai-runtime`
  - `big-lama.pt`

### AI runtime package

- File: `ai-runtime.zip`
- Source: packaged from `src-tauri/resources/ai-runtime`
- Use: user manually imports it in Tooliva settings

### Model file

- File: `big-lama.pt`
- Use: user manually imports it in Tooliva settings

## Build Commands

Build the main desktop installer:

```powershell
pnpm tauri:build
```

Build the runtime zip for manual import:

```powershell
.\scripts\package-ai-runtime.ps1 -RuntimeVersion 1.0.0
```

Optional: copy the model file into the same output folder for release handoff:

```powershell
.\scripts\package-ai-runtime.ps1 `
  -RuntimeVersion 1.0.0 `
  -ModelFilePath "D:\releases\big-lama.pt"
```

## Runtime Storage In The App

Imported runtime files are stored under:

```text
<install-dir>/ToolivaAI/runtime/
```

Imported model files are stored under:

```text
<install-dir>/ToolivaAI/models/
```

These defaults can be changed by the user in Settings if they want to place the runtime or models on another writable disk.

## What We Explicitly Do Not Use

- no remote AI runtime manifest
- no CDN-driven runtime installation flow
- no in-app runtime download
- no automatic model download on first use

## Release Checklist

1. Confirm the NSIS installer does not contain the AI runtime.
2. Confirm `ai-runtime.zip` imports successfully on a clean machine.
3. Confirm `big-lama.pt` imports successfully on a clean machine.
4. Confirm non-AI tools still work without any AI files installed.
