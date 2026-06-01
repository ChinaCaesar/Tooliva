# Windows Release Guide

## Goal

- The standard Windows NSIS installer includes only the desktop app, frontend assets, `ffmpeg.exe`, and `ffprobe.exe`.
- `resources/ai-runtime`, Python, PyTorch, `iopaint`, and the LaMA model must not be bundled into the NSIS installer.
- AI runtime and model files are distributed as user-downloaded local files and imported inside the app.

## Why We Split the Package

- NSIS becomes unreliable with very large payloads.
- The AI runtime is much larger than the desktop app itself.
- Not every user needs AI-enhanced watermark removal.

## Bundled Resources

`src-tauri/tauri.conf.json` should keep only:

```json
[
  "resources/bin/ffmpeg.exe",
  "resources/bin/ffprobe.exe",
  "resources/bin/7za.exe"
]
```

Do not re-add any of these to the installer:

- `resources/ai-runtime`
- `resources/ai-runtime/python`
- `torch`
- `torchvision`
- `iopaint`
- `big-lama.pt`

## Runtime Packaging

Build the local runtime package for manual import:

```powershell
.\scripts\package-ai-runtime.ps1 -RuntimeVersion 1.0.0
```

Reference guide:

- [manual-package.md](/F:/Vibe%20Coding/Tools/docs/ai-runtime/manual-package.md)

## Runtime Storage

By default the app stores imported AI files under the current app install directory:

```text
<install-dir>/ToolivaAI/runtime/
  manifest.json
  current/
  versions/
  backup/
```

```text
<install-dir>/ToolivaAI/models/
  lama/
    big-lama.pt
  _torch/
```

Users can also switch both locations to custom folders from the Settings page.

## Environment Variables

Only the local feature toggles remain relevant for AI:

```env
VITE_AI_RUNTIME_ENABLED=true
VITE_AI_RUNTIME_MIN_FREE_DISK_GB=8
```

No remote runtime manifest URL, base URL, or package channel is used by the current product flow.

## Release Flow

1. Run `pnpm tauri:build` to generate the standard NSIS installer.
2. Verify that the installer contains only the desktop app and FFmpeg resources.
3. Run `.\scripts\package-ai-runtime.ps1 -RuntimeVersion <version>` to produce the manual runtime archive.
4. Prepare `big-lama.pt` as a separate local download file.
5. Publish the main installer, runtime archive, and model file as separate downloads.
6. Verify on a clean Windows machine:
   - The app works without importing AI files.
   - The app can import the local runtime archive.
   - The app can import the local `big-lama.pt` file.

## Acceptance Checklist

- The main installer does not contain the AI runtime.
- AI import failure does not damage an existing runtime installation.
- The standard installer still supports non-AI image and video tools normally.
